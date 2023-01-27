import { Router } from "express";

import {
  startClass,
  dismissClass,
  markAttendance,
  getClassesByCourseId,
  getClassById,
  deleteClassById,
} from "../controllers/class.js";

const router = Router();

router.post("/startClass", startClass);
router.post("/dismissClass", dismissClass);
router.post("/markAttendance", markAttendance);
router.get("/getClassesByCourseId", getClassesByCourseId);
router.get("/getClassById", getClassById);
router.delete("/deleteClassById", deleteClassById);

export default router;
