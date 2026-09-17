import "./config/loadEnv.js"; // MUST stay the first import — see that file for why
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authroutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// routes/health.js (or directly in server.js / app.js)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});