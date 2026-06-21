import express from "express";
import { prSummary } from "../controllers/aiController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/pr-summary", auth, prSummary);

export default router;
