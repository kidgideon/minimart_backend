// backend/routes/store.js
import express from "express";
import db from "../firebase.js";
const router = express.Router();

router.get("/", async (req, res) => {
  const storeId = req.query.storeId;
  if (!storeId) return res.status(400).json({ error: "Missing storeId" });

  try {
    const docSnap = await db.collection("businesses").doc(storeId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Store not found" });
    }

    const biz = docSnap.data() || {};
    const customTheme = biz.customTheme || {};
    const otherInfo = biz.otherInfo || {};

    return res.json({
      storeId,
      biz: {
        businessName: biz.businessName || "",
        description: otherInfo.description || "",
        logo: customTheme.logo || "",
        primaryColor: customTheme.primaryColor || "#1C2230",
        secondaryColor: customTheme.secondaryColor || "#43B5F4",
      },
    });
  } catch (err) {
    console.error("[store.js] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
