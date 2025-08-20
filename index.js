import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paystackRoutes from "./routes/paystack.js";

dotenv.config();
const app = express();

// Restrict CORS in production
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://minimart.ng"] 
    : "*",
}));
app.use(express.json());

// Routes
app.use("/api/paystack", paystackRoutes);

// For Vercel serverless export the handler
export default app;
