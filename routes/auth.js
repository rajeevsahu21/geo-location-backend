import { Router } from "express";

import {
  login,
  signUp,
  recover,
  reset,
  resetPassword,
  authWithGoogle,
  authWithGoogleForApp,
} from "../controllers/auth.js";

const router = Router();

router.post("/login", login);
router.post("/signUp", signUp);
router.post("/google", authWithGoogle);
router.post("/authWithGoogle", authWithGoogleForApp);
router.post("/recover", recover);
router.get("/reset/:token", reset);
router.post("/reset/:token", resetPassword);

export default router;
