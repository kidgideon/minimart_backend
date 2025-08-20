import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import your route modules
import paystackRoutes from "./routes/paystack.js";
import storeRoutes from "./routes/store.js";
import productRoutes from "./routes/products.js";

dotenv.config();
const app = express();

// Allow all domains
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/paystack", paystackRoutes);

// Storefront meta routes
app.use("/", storeRoutes);              // handles "/"
app.use("/Product", productRoutes);    // handles "/Products/:id"

// For Vercel serverless
export default app;
