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
    settlement_bank: bankCode,
    account_number: accNo,
    percentage_charge: 2
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

// ✅ Initialize payment with split code
router.post("/pay", async (req, res) => {
  const { email, amount, split_code, reference, callback_url } = req.body;

  if (!email || !amount || !reference) {
    return res.status(400).json({ status: false, message: "Missing parameters" });
  }

  try {
    const payload = {
      email,
      amount,
      reference,
      callback_url,
      split_code, // <-- use this instead of subaccount
    };

    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
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


//  * POST /create-split
//  * Body: {
//  *   subaccount_code: string, // e.g. "ACCT_xxx"
//  *   vendorShare: number,      // integer percent vendor should get (0–100)
//  *   splitName?: string        // optional descriptive name
//  * }
//  *
//  * Returns: { split_code } on success.
//  */

router.post("/create-split", async (req, res) => {
  const { subaccount_code, vendorShare, splitName } = req.body;
  
  // Basic validation
  if (!subaccount_code || typeof vendorShare !== "number") {
    return res.status(400).json({ status: false, message: "Missing subaccount_code or vendorShare" });
  }

  if (vendorShare < 0 || vendorShare > 100) {
    return res.status(400).json({ status: false, message: "vendorShare must be between 0 and 100" });
  }

  try {
    const payload = {
      name: splitName || `Split for ${subaccount_code}`,
      type: "percentage",
      currency: "NGN",
      subaccounts: [
        {
          subaccount: subaccount_code,
          share: vendorShare
        }
      ],
      bearer_type: "subaccount", // Who bears the Paystack fees
      bearer_subaccount: subaccount_code // Which subaccount specifically bears it
    };

    const resp = await axios.post("https://api.paystack.co/split", payload, {
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
      },
    });

    const splitData = resp.data?.data;
    if (!splitData || !splitData.split_code) {
      return res.status(500).json({
        status: false,
        message: "No split_code returned",
        detail: resp.data
      });
    }

    return res.json({ status: true, split_code: splitData.split_code });
  } catch (err) {
    console.error("Error creating split:", err.response?.data || err.message);
    return res.status(500).json({
      status: false,
      message: "Error creating transaction split",
      detail: err.response?.data,
    });
  }
});

export default router;
