import express from "express";
import db from "../firebase.js";

const router = express.Router();

function isAgent(req) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
return /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(ua);
}

router.get("/:id", async (req, res) => {
  try {
    const host = req.hostname;
    const productId = req.params.id;
    let storeId;

    if (host.endsWith(".minimart.ng")) {
      storeId = host.split(".")[0];
    } else {
      const snap = await db
        .collection("customDomains")
        .where("domain", "==", host)
        .limit(1)
        .get();
      if (!snap.empty) {
        storeId = snap.docs[0].data().storeId;
      }
    }

    if (!storeId) return res.status(404).send("Store not found");

    const bizDoc = await db.collection("businesses").doc(storeId).get();
    if (!bizDoc.exists) return res.status(404).send("Business not found");
    const biz = bizDoc.data();

 const product =
  (biz.products && biz.products.find((p) => p.prodId === productId)) ||
  (biz.services && biz.services.find((s) => s.serviceId === productId));

    if (!product) return res.status(404).send("Product not found");

    if (isAgent(req)) {
      // Bot: send SEO meta HTML
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>${product.name} | ${biz.businessName}</title>
            <meta name="description" content="${product.description || "Check out this product"}" />
            <meta property="og:title" content="${product.name}" />
            <meta property="og:description" content="${product.description || ""}" />
            <meta property="og:image" content="${product.images?.[0] || "https://minimart.ng/default-product.png"}" />
            <meta property="og:url" content="https://${host}/Products/${productId}" />
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `);
    }

    // Human: let SPA handle it
    return res.sendFile("index.html", { root: "./public" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
