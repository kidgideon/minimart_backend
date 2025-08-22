import express from "express";
import db from "../firebase.js";

const router = express.Router();

/**
 * Detect if the request is from a bot/crawler
 */
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

    // Determine the storeId based on subdomain or custom domain
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
        console.log("[store.js] No matching custom domain found.");
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
    console.log(`[store.js] Business data retrieved`);

    if (isAgent(req)) {
      console.log("[store.js] Detected agent — sending SEO HTML");

      const title = biz.businessName || "Minimart Store";
      const description = biz.description || "Shop amazing products and services on Minimart.";
      const image = biz.customTheme?.logo || "https://minimart.ng/default-store.png";

      return res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="https://${host}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`);
    }

    console.log("[store.js] Detected human — sending SPA");
    return res.sendFile("index.html", { root: "./public" });
  } catch (err) {
    console.error("[store.js] Error:", err);
    return res.status(500).send("Server error");
  }
});

export default router;
