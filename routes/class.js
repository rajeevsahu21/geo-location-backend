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

router.post("/class", checkTeacherRole, startClass);
router.put("/class/:id", checkTeacherRole, updateClass);
router.put("/class", markAttendance);
router.get("/class", checkTeacherRole, getClassesByCourseId);
router.get("/class/students", checkTeacherRole, getClass);
router.get("/class/:id", checkTeacherRole, getClassById);
router.delete("/class/:id", checkTeacherRole, deleteClassById);

export default router;
