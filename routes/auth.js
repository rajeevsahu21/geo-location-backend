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

router.use(limiter);
router.post("/login", login);
router.post("/signUp", signUp);
router.post("/google", authWithGoogle);
router.get("/confirm/:token", confirmAccount);
router.post("/recover", recover);
router.route("/reset/:token").get(reset).post(resetPassword);

export default router;
