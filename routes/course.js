import { Router } from "express";

import {
  toggleCourseEnrollment,
  createCourse,
  deleteCourseById,
  enrollCourse,
  getCourseById,
  getCourses,
  inviteStudentsToEnrollCourse,
  sendAttendanceViaEmail,
} from "../controllers/course.js";
import { checkTeacherRole } from "../middleware/role.js";

const router = Router();

router.post("/createCourse", checkTeacherRole, createCourse);
router.get("/getCourses", getCourses);
router.post("/enrollCourse", enrollCourse);
router.post(
  "/toggleCourseEnrollment",
  checkTeacherRole,
  toggleCourseEnrollment
);
router.get("/getCourseById", checkTeacherRole, getCourseById);
router.get("/sendAttendanceViaMail", checkTeacherRole, sendAttendanceViaEmail);
router.delete("/deleteCourseById", checkTeacherRole, deleteCourseById);
router.post(
  "/inviteStudentsToEnrollCourse",
  checkTeacherRole,
  inviteStudentsToEnrollCourse
);

export default router;
