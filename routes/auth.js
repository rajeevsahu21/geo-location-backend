import { Router } from "express";

import {
  login,
  signUp,
  confirmAccount,
  recover,
  reset,
  resetPassword,
  authWithGoogle,
} from "../controllers/auth.js";
import { limiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/login", limiter, login);
router.post("/signUp", signUp);
router.post("/google", authWithGoogle);
router.get("/confirm/:token", confirmAccount);
router.post("/recover", limiter, recover);
router.route("/reset/:token").get(limiter, reset).post(resetPassword);

export default router;
