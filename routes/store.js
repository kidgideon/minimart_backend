import express from "express";
import db from "../firebase.js";

const router = express.Router();

function isAgent(req) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  return /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot/i.test(ua);
}

router.get("/", async (req, res) => {
  try {
    const host = req.hostname;
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

    if (isAgent(req)) {
      // Serve SEO HTML for bots
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>${biz.businessName}</title>
            <meta name="description" content="${biz.description || "Welcome to this store"}" />
            <meta property="og:title" content="${biz.businessName}" />
            <meta property="og:description" content="${biz.description || ""}" />
            <meta property="og:image" content="${biz.logo || "https://minimart.ng/default-store.png"}" />
            <meta property="og:url" content="https://${host}" />
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `);
    }

    // Human: let frontend handle (redirect to SPA hosting)
    return res.sendFile("index.html", { root: "./public" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
