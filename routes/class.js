import { Router } from "express";

import {
  startClass,
  dismissClass,
  markAttendance,
  getClassesByCourseId,
  getClassById,
  deleteClassById,
  updateClass,
  getClass,
} from "../controllers/class.js";
import { checkTeacherRole } from "../middleware/role.js";

const router = Router();

router.post("/startClass", checkTeacherRole, startClass);
router.put("/class/:id", checkTeacherRole, updateClass);
router.post("/dismissClass", checkTeacherRole, dismissClass);
router.post("/markAttendance", markAttendance);
router.get("/getClassesByCourseId", checkTeacherRole, getClassesByCourseId);
router.get("/class/students", checkTeacherRole, getClass);
router.get("/getClassById", checkTeacherRole, getClassById);
router.delete("/deleteClassById", checkTeacherRole, deleteClassById);

export default router;
