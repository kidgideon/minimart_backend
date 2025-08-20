import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paystackRoutes from "./routes/paystack.js";

dotenv.config();
const app = express();

// Allow all domains
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/paystack", paystackRoutes);

// For Vercel serverless export the handler
export default app;
