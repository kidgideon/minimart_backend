import express from "express";
import db from "../firebase.js";

const router = express.Router();

function isAgent(req) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const agentDetected = /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(ua);
  console.log(`[store.js] User-Agent: ${ua} | isAgent: ${agentDetected}`);
  return agentDetected;
}

router.get("/", async (req, res) => {
  console.log("[store.js] Route / hit");
  try {
    const host = req.hostname;
    console.log(`[store.js] Host: ${host}`);
    let storeId;

    if (host.endsWith(".minimart.ng")) {
      storeId = host.split(".")[0];
      console.log(`[store.js] StoreId from subdomain: ${storeId}`);
    } else {
      console.log("[store.js] Looking up custom domain...");
      const snap = await db
        .collection("customDomains")
        .where("domain", "==", host)
        .limit(1)
        .get();
      if (!snap.empty) {
        storeId = snap.docs[0].data().storeId;
        console.log(`[store.js] StoreId from customDomains: ${storeId}`);
      } else {
        console.log("[store.js] No custom domain found.");
      }
    }

    if (!storeId) {
      console.log("[store.js] Store not found");
      return res.status(404).send("Store not found");
    }

    console.log(`[store.js] Fetching business doc for storeId: ${storeId}`);
    const bizDoc = await db.collection("businesses").doc(storeId).get();
    if (!bizDoc.exists) {
      console.log("[store.js] Business not found");
      return res.status(404).send("Business not found");
    }

    const biz = bizDoc.data();
    console.log(`[store.js] Business data:`, biz);

    if (isAgent(req)) {
      console.log("[store.js] Detected agent, sending SEO HTML");
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>${biz.businessName}</title>
            <meta name="description" content="${biz.description || "Welcome to this store"}" />
            <meta property="og:title" content="${biz.businessName}" />
            <meta property="og:description" content="${biz.description || ""}" />
            <meta property="og:image" content="${biz.customTheme?.logo || "https://minimart.ng/default-store.png"}" />
            <meta property="og:url" content="https://${host}" />
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `);
    }

    console.log("[store.js] Detected human, sending index.html");
    return res.sendFile("index.html", { root: "./public" });

  } catch (err) {
    console.error("[store.js] Error:", err);
    res.status(500).send("Server error");
  }
});

export default router;
