import { Router } from "express";
import {
  getUser,
  getUserCourses,
  getUsers,
  updateUser,
  updateUsers,
} from "../controllers/user.js";
import { checkAdminRole } from "../middleware/role.js";

const router = Router();

router.get("/me", getUser);
router.put("/", updateUser);
router.get("/", checkAdminRole, getUsers);
router.put("/detail", checkAdminRole, updateUsers);
router.get("/courses", checkAdminRole, getUserCourses);

export default router;
