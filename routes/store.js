import express from "express";
import db from "../firebase.js"; // Your initialized Firebase Admin or Firestore instance

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const host = req.hostname;
    let storeId;

    // --- Extract storeId from subdomain (store.minimart.ng) ---
    if (host.endsWith(".minimart.ng")) {
      storeId = host.split(".")[0];
    } else {
      // --- Lookup custom domain ---
      const snap = await db
        .collection("customDomains")
        .where("domain", "==", host)
        .limit(1)
        .get();

      if (!snap.empty) {
        storeId = snap.docs[0].data().storeId;
      }
    }

    if (!storeId) {
      return res.status(404).json({ error: "Store not found" });
    }

    // --- Fetch business document ---
    const bizDoc = await db.collection("businesses").doc(storeId).get();

    if (!bizDoc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }

    // --- Serialize Firestore data (convert Timestamps to ISO) ---
    const biz = JSON.parse(JSON.stringify(bizDoc.data(), (key, value) => {
      if (value && value.seconds !== undefined && value.nanoseconds !== undefined) {
        return new Date(value.seconds * 1000 + value.nanoseconds / 1e6).toISOString();
      }
      return value;
    }));

    // --- Send JSON response ---
    return res.json({
      storeId,
      biz,
    });
  } catch (err) {
    console.error("[store.js] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
