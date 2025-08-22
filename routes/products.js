import express from "express";
import db from "../firebase.js";

const router = express.Router();

/**
 * Detect if the request is from a bot/crawler
 */
function isBot(req) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const botRegex = /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i;
  const detected = botRegex.test(ua);
  console.log(`[product.js] User-Agent: ${ua} | isBot: ${detected}`);
  return detected;
}

router.get("/:id", async (req, res) => {
  console.log("[product.js] Route /product/:id hit");

  try {
    const host = req.hostname;
    const productId = req.params.id;
    console.log(`[product.js] Host: ${host} | ProductId: ${productId}`);

    // Determine the storeId based on subdomain or custom domain
    let storeId;
    if (host.endsWith(".minimart.ng")) {
      storeId = host.split(".")[0];
      console.log(`[product.js] StoreId from subdomain: ${storeId}`);
    } else {
      console.log("[product.js] Checking customDomains...");
      const snap = await db
        .collection("customDomains")
        .where("domain", "==", host)
        .limit(1)
        .get();

      if (!snap.empty) {
        storeId = snap.docs[0].data().storeId;
        console.log(`[product.js] StoreId from customDomains: ${storeId}`);
      } else {
        console.log("[product.js] No matching custom domain found.");
      }
    }

    if (!storeId) {
      console.log("[product.js] Store not found");
      return res.status(404).send("Store not found");
    }

    console.log(`[product.js] Fetching business doc for storeId: ${storeId}`);
    const bizDoc = await db.collection("businesses").doc(storeId).get();

    if (!bizDoc.exists) {
      console.log("[product.js] Business not found");
      return res.status(404).send("Business not found");
    }

    const biz = bizDoc.data();
    console.log(`[product.js] Business data retrieved`);

    // Search product or service in respective arrays
    const product =
      (Array.isArray(biz.products) &&
        biz.products.find((p) => p.prodId === productId)) ||
      (Array.isArray(biz.services) &&
        biz.services.find((s) => s.serviceId === productId));

    if (!product) {
      console.log("[product.js] Product/Service not found");
      return res.status(404).send("Product/Service not found");
    }

    console.log(`[product.js] Product/Service found: ${product.name}`);

    // If bot/crawler → return pre-rendered HTML with SEO meta tags
    if (isBot(req)) {
      console.log("[product.js] Bot detected — returning SEO-friendly HTML");

      const title = `${product.name} | ${biz.businessName || "Minimart Store"}`;
      const description =
        product.description || "Discover this item on Minimart";
      const image =
        (Array.isArray(product.images) && product.images[0]) ||
        "https://minimart.ng/default-product.png";

      return res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${product.name}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="https://${host}/product/${productId}" />
    <meta property="og:type" content="product" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${product.name}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`);
    }

    // For normal visitors → serve your React SPA index.html
    console.log("[product.js] Human visitor detected — serving SPA");
    return res.sendFile("index.html", { root: "./public" });
  } catch (err) {
    console.error("[product.js] Error:", err);
    return res.status(500).send("Server error");
  }
});

export default router;
