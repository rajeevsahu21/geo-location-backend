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

const router = Router();

router.post("/createCourse", createCourse);
router.get("/getCourses", getCourses);
router.post("/enrollCourse", enrollCourse);
router.post("/toggleCourseEnrollment", toggleCourseEnrollment);
router.get("/getCourseById", getCourseById);
router.get("/sendAttendanceViaMail", sendAttendanceViaEmail);
router.delete("/deleteCourseById", deleteCourseById);
router.post("/inviteStudentsToEnrollCourse", inviteStudentsToEnrollCourse);

export default router;
