import { Router } from "express";

import {
  startClass,
  markAttendance,
  getClassesByCourseId,
  getClassById,
  deleteClassById,
  updateClass,
  getClass,
} from "../controllers/class.js";
import { checkTeacherRole } from "../middleware/role.js";

const router = Router();

router.post("/", checkTeacherRole, startClass);
router.put("/:id", checkTeacherRole, updateClass);
router.put("/", markAttendance);
router.get("/", checkTeacherRole, getClassesByCourseId);
router.get("/students", checkTeacherRole, getClass);
router.get("/:id", checkTeacherRole, getClassById);
router.delete("/:id", checkTeacherRole, deleteClassById);

export default router;
