import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const PAYSTACK_LIVE_SECRET_KEY = process.env.LIVE_SECRET_KEY;
const PAYSTACK_LIVE_PUBLIC_KEY = process.env.LIVE_PUBLIC_KEY;
const PAYSTACK_TEST_SECRET_KEY = process.env.TEST_SECRET_KEY;
const PAYSTACK_TEST_PUBLIC_KEY = process.env.TEST_PUBLIC_KEY;


router.get("/banks", async (req, res) => {
  try {
    const resp = await axios.get("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${PAYSTACK_LIVE_SECRET_KEY}` },
    });
    res.json(resp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error fetching banks" });
  }
});

router.get("/validate", async (req, res) => {
  const { account_number, bank_code } = req.query;
  try {
    const resp = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_LIVE_SECRET_KEY}` } }
    );
    res.json(resp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error validating account" });
  }
});

router.post("/subaccount", async (req, res) => {
  const { businessName, accNo, bankCode, accName } = req.body;
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
          Authorization: `Bearer ${PAYSTACK_LIVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(resp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error creating subaccount" });
  }
});


router.post("/pay", async (req, res) => {
  const { email, amount, subaccount_code, reference, callback_url } = req.body;
  try {
    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount, // amount in kobo
        reference,
        callback_url,
        subaccount: subaccount_code,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_TEST_SECRET_KEY}`, 
          "Content-Type": "application/json",
        },
      }
    );
    res.json(resp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ status: false, message: "Error initializing payment" });
  }
});

router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const resp = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_TEST_SECRET_KEY}` }
    });
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ status: false, message: "Error verifying payment" });
  }
});


export default router;
