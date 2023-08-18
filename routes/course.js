import { Router } from "express";

import {
  createCourse,
  deleteCourseById,
  enrollCourse,
  getCourseById,
  getCourses,
  inviteStudentsToEnrollCourse,
  sendAttendanceViaEmail,
  updateCourse,
} from "../controllers/course.js";
import { checkTeacherRole } from "../middleware/role.js";

const router = Router();

router.post("/", checkTeacherRole, createCourse);
router.get("/", getCourses);
router.post("/enroll", enrollCourse);
router.get("/:id", checkTeacherRole, getCourseById);
router.post("/attendance", checkTeacherRole, sendAttendanceViaEmail);
router.delete("/:id", checkTeacherRole, deleteCourseById);
router.post("/invite", checkTeacherRole, inviteStudentsToEnrollCourse);
router.put("/:id", updateCourse);

export default router;
