import { Router } from "express";

import {
  startClass,
  dismissClass,
  markAttendance,
  getClassesByCourseId,
  getClassById,
  deleteClassById,
  updateClass,
} from "../controllers/class.js";

const router = Router();

router.post("/startClass", startClass);
router.put("/class/:id", updateClass);
router.post("/dismissClass", dismissClass);
router.post("/markAttendance", markAttendance);
router.get("/getClassesByCourseId", getClassesByCourseId);
router.get("/getClassById", getClassById);
router.delete("/deleteClassById", deleteClassById);

export default router;
