// backend/routes/product.js
import express from "express";
import db from "../firebase.js"; // Your Firebase admin instance

const router = express.Router();

// GET /product/:storeId/:id
router.get("/:storeId/:id", async (req, res) => {
  const { storeId, id } = req.params;

  try {
    // Fetch business data
    const bizDoc = await db.collection("businesses").doc(storeId).get();
    if (!bizDoc.exists) return res.status(404).json({ error: "Store not found" });

    const biz = bizDoc.data();

    // Find product or service
    let product = (Array.isArray(biz.products) && biz.products.find(p => p.prodId === id));
    if (!product) {
      product = (Array.isArray(biz.services) && biz.services.find(s => s.serviceId === id));
    }

    if (!product) return res.status(404).json({ error: "Product/Service not found" });

    // Extract store theme colors
    const primaryColor = biz.customTheme?.primaryColor || "#1C2230";
    const secondaryColor = biz.customTheme?.secondaryColor || "#43B5F4";

    // Return a clean JSON payload for Next.js frontend
    return res.json({
      storeId,
      product,
      business: {
        businessName: biz.businessName,
        description: biz.description,
        logo: biz.customTheme?.logo,
        primaryColor,
        secondaryColor,
      },
    });
  } catch (err) {
    console.error("[product.js] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
