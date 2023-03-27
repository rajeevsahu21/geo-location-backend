import { Router } from "express";
import { getUser, updateUser } from "../controllers/user.js";

const router = Router();

router.get("/me", getUser);
router.put("/", updateUser);

export default router;
