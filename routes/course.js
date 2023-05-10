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
  updateCourse,
} from "../controllers/course.js";
import { checkTeacherRole } from "../middleware/role.js";

const router = Router();

router.post("/course", checkTeacherRole, createCourse);
router.get("/course", getCourses);
router.post("/course/enroll", enrollCourse);
router.put("/course/:id", checkTeacherRole, toggleCourseEnrollment);
router.get("/course/:id", checkTeacherRole, getCourseById);
router.get("/course/attendance", checkTeacherRole, sendAttendanceViaEmail);
router.delete("/course/:id", checkTeacherRole, deleteCourseById);
router.post("/course/invite", checkTeacherRole, inviteStudentsToEnrollCourse);
router.put("/course/:id", checkTeacherRole, updateCourse);

export default router;
