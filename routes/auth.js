import { Router } from "express";
import passport from "passport";
import { generateToken } from "../controllers/auth.js";

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

router.post("/api/auth/login", login);
router.post("/api/auth/signUp", signUp);
router.post("/api/auth/google", authWithGoogle);
router.post("/api/auth/authWithGoogle", authWithGoogleForApp);
router.get(
  "/auth/google",
  async (req, res, next) => {
    if (req.user) {
      const token = await generateToken(req.user);
      return res.status(200).json({
        error: false,
        token,
        user: req.user,
        message: "User Authenticated sucessfully",
      });
    }
    next();
  },
  passport.authenticate("google", { scope: ["email", "profile"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google",
    session: true,
  }),
  (req, res) => {
    res.redirect("/auth/google");
  }
);
router.post("/api/auth/recover", recover);
router.get("/api/auth/reset/:token", reset);
router.post("/api/auth/reset/:token", resetPassword);

export default router;
