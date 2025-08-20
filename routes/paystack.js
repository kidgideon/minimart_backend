import express from "express";
import axios from "axios";

const router = express.Router();

const getSecretKey = () => {
  return process.env.NODE_ENV === "production"
    ? process.env.LIVE_SECRET_KEY
    : process.env.TEST_SECRET_KEY;
};

// ✅ Get banks
router.get("/banks", async (_, res) => {
  try {
    const resp = await axios.get("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
    });
    res.json(resp.data);
  } catch (err) {
    console.error("Bank fetch error:", err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error fetching banks" });
  }
});

// ✅ Validate account
router.get("/validate", async (req, res) => {
  const { account_number, bank_code } = req.query;
  if (!account_number || !bank_code) {
    return res.status(400).json({ status: false, message: "Missing parameters" });
  }
  try {
    const resp = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      { headers: { Authorization: `Bearer ${getSecretKey()}` } }
    );
    res.json(resp.data);
  } catch (err) {
    console.error("Validation error:", err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error validating account" });
  }
});

// ✅ Create subaccount
router.post("/subaccount", async (req, res) => {
  const { businessName, accNo, bankCode, accName } = req.body;
  if (!businessName || !accNo || !bankCode || !accName) {
    return res.status(400).json({ status: false, message: "Missing parameters" });
  }
  try {
    const resp = await axios.post(
      "https://api.paystack.co/subaccount",
      {
        business_name: businessName,
        account_number: accNo,
        bank_code: bankCode,
        percentage_charge: 1,
        settlement_bank: bankCode,
        account_name: accName,
      },
      {
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(resp.data);
  } catch (err) {
    console.error("Subaccount error:", err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error creating subaccount" });
  }
});

// ✅ Initialize payment
router.post("/pay", async (req, res) => {
  const { email, amount, subaccount_code, reference, callback_url } = req.body;
  if (!email || !amount || !reference) {
    return res.status(400).json({ status: false, message: "Missing parameters" });
  }
  try {
    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount, reference, callback_url, subaccount: subaccount_code },
      {
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(resp.data);
  } catch (err) {
    console.error("Payment init error:", err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error initializing payment" });
  }
});

// ✅ Verify payment
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${getSecretKey()}` } }
    );
    res.json(resp.data);
  } catch (err) {
    console.error("Verify error:", err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error verifying payment" });
  }
});

export default router;
