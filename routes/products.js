import express from "express";
import db from "../firebase.js";

const router = express.Router();

function isAgent(req) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const agentDetected = /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(ua);
  console.log(`[products.js] User-Agent: ${ua} | isAgent: ${agentDetected}`);
  return agentDetected;
}

router.get("/:id", async (req, res) => {
  console.log("[products.js] Route /:id hit");
  try {
    const host = req.hostname;
    const productId = req.params.id;
    console.log(`[products.js] Host: ${host} | ProductId: ${productId}`);
    let storeId;

    if (host.endsWith(".minimart.ng")) {
      storeId = host.split(".")[0];
      console.log(`[products.js] StoreId from subdomain: ${storeId}`);
    } else {
      console.log("[products.js] Looking up custom domain...");
      const snap = await db
        .collection("customDomains")
        .where("domain", "==", host)
        .limit(1)
        .get();
      if (!snap.empty) {
        storeId = snap.docs[0].data().storeId;
        console.log(`[products.js] StoreId from customDomains: ${storeId}`);
      } else {
        console.log("[products.js] No custom domain found.");
      }
    }

    if (!storeId) {
      console.log("[products.js] Store not found");
      return res.status(404).send("Store not found");
    }

    console.log(`[products.js] Fetching business doc for storeId: ${storeId}`);
    const bizDoc = await db.collection("businesses").doc(storeId).get();
    if (!bizDoc.exists) {
      console.log("[products.js] Business not found");
      return res.status(404).send("Business not found");
    }
    const biz = bizDoc.data();
    console.log(`[products.js] Business data:`, biz);

    const product =
      (biz.products && biz.products.find((p) => p.prodId === productId)) ||
      (biz.services && biz.services.find((s) => s.serviceId === productId));

    if (!product) {
      console.log("[products.js] Product not found");
      return res.status(404).send("Product not found");
    }
    console.log(`[products.js] Product data:`, product);

    if (isAgent(req)) {
      console.log("[products.js] Detected agent, sending SEO HTML");
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

    console.log("[products.js] Detected human, sending index.html");
    return res.sendFile("index.html", { root: "./public" });

  } catch (err) {
    console.error("[products.js] Error:", err);
    res.status(500).send("Server error");
  }
});

export default router;
