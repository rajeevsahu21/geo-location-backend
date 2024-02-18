import mongoose from "mongoose";
import formidable from "formidable";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";

import Class from "../models/Class.js";
import Course from "../models/Course.js";
import { exportToExcel, readExcel } from "../utils/genrateExcel.js";
import sendEmail from "../utils/sendEmail.js";
import Message from "../models/Message.js";

// @route POST api/course
// @desc Create Course
// @access Teacher
const createCourse = async (req, res) => {
  try {
    if (!req.body.courseName)
      return res
        .status(400)
        .json({ status: "failure", message: "Please Enter Course Name" });
    const courseName = req.body.courseName;
    const courseCode = generateCourseCode(6);
    const newCourse = await new Course({
      courseName,
      courseCode,
      teacher: req.user._id,
    }).save();
    res.status(201).json({
      status: "success",
      data: newCourse,
      message: "Course Created successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route GET api/course
// @desc Get Courses
// @access Private
const getCourses = async (req, res) => {
  try {
    const query =
      req.user.role === "student"
        ? { students: req.user._id }
        : { teacher: req.user._id };
    const courses = await Course.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      data: courses,
      message: "Available Course found",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/course/enroll
// @desc Enroll into a Course
// @access Private
const enrollCourse = async (req, res) => {
  try {
    if (!req.body.courseCode)
      return res
        .status(400)
        .json({ status: "failure", message: "Please Enter Course Code" });
    const courseCode = req.body.courseCode.replace(/\s/g, "").toLowerCase();
    const studentId = req.user._id;
    const course = await Course.findOne({ courseCode });
    if (!course)
      return res
        .status(404)
        .json({ status: "failure", message: "Course not found" });
    if (!course.isActive)
      return res
        .status(400)
        .json({ status: "failure", message: "Course closed for enrollment" });
    if (course.students.includes(studentId))
      return res
        .status(409)
        .json({ status: "failure", message: "Student already enrolled" });
    res.status(200).json({
      status: "success",
      message: "Course Enrollment Done",
    });
    await Course.updateOne(
      { courseCode },
      { $addToSet: { students: studentId } }
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route PUT api/course/:id
// @desc Update Course
// @access Private
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseName, students, toggle } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ status: "failure", message: "Course Id is not valid" });
    let update = {
      $pull: { students: req.user._id },
    };
    if (req.user.role === "teacher") {
      update = {
        $pull: { students: { $in: students } },
        isActive: toggle,
        courseName,
      };
    }
    const updatedCourse = await Course.findByIdAndUpdate(id, update);
    if (!updatedCourse)
      return res
        .status(404)
        .json({ status: "failure", message: "Course not Found" });
    res.status(200).json({
      status: "success",
      message:
        students.length || req.user.role == "student"
          ? "Student removed successfully"
          : "Course updated successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route GET api/course/:id
// @desc Get Course
// @access Teacher
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ status: "failure", message: "Course Id is not valid" });
    const course = await Course.findById(id).populate(
      "students",
      "registrationNo name"
    );
    if (!course)
      return res
        .status(404)
        .json({ status: "failure", message: "Course not found" });
    res.status(200).json({
      status: "success",
      data: course,
      message: "Course Found successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route DELETE api/course/:id
// @desc Delete Course
// @access Teacher
const deleteCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ status: "failure", message: "Course Id is not valid" });
    const deletedCourse = await Course.findByIdAndDelete(id);
    if (!deletedCourse)
      return res
        .status(404)
        .json({ status: "failure", message: "Course not found" });
    res
      .status(200)
      .json({ status: "success", message: "Course deleted successfully" });
    await Class.deleteMany({ courseId: id });
    await Message.deleteMany({ courseId: id });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/course/attendance
// @desc Send Course to teacher email
// @access Teacher
const sendAttendanceViaEmail = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ status: "failure", message: "Course Id is not valid" });
    const course = await Course.findById(courseId)
      .populate("students", "name registrationNo")
      .populate("teacher", "email");
    if (!course)
      return res
        .status(404)
        .json({ status: "failure", message: "Course not found" });
    const classes = await Class.find({ courseId });
    if (!classes.length)
      return res
        .status(404)
        .json({ status: "failure", message: "No Classes found" });
    const courseName = course.courseName;
    const classesDates = classes.map((cls) =>
      cls.createdAt.toLocaleDateString("pt-PT")
    );
    const workSheetColumnName = [
      "Registration No",
      "Student Name",
      ...classesDates,
    ];
    const users = course.students;
    let userList = [];
    for (let i = 0; i < users.length; i++) {
      let d = [users[i].registrationNo, users[i].name];
      for (let j = 0; j < classes.length; j++) {
        d = classes[j].students.find(
          (stu) => stu.toString() === users[i]._id.toString()
        )
          ? [...d, "P"]
          : [...d, ""];
      }
      userList.push(d);
    }
    const workSheetName = "students";
    const filePath = `./${course.courseName}.xlsx`;
    await exportToExcel(userList, workSheetColumnName, workSheetName, filePath);
    const __dirname = path.resolve();
    const templatePath = path.join(
      __dirname,
      "./template/course-attendance.html"
    );
    const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
    const template = Handlebars.compile(source);
    const html = template({ COURSE: courseName });
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`, // sender address
      to: course.teacher.email, // list of receivers
      subject: `Course Attendance for ${courseName}`, // Subject line
      html,
      attachments: [
        {
          // filename and content type is derived from path
          path: filePath,
        },
      ],
    };
    sendEmail(mailOptions);
    res.status(200).json({
      status: "success",
      message: "Attendance sent successfully to registered Email",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/course/invite
// @desc Enroll students into Course
// @access Teacher
const inviteStudentsToEnrollCourse = async (req, res) => {
  try {
    const form = formidable({ multiples: true });
    form.parse(req, async (err, fields, files) => {
      if (!files.emails)
        return res
          .status(400)
          .json({ status: "failure", message: "File not found" });
      const courseId = fields.courseId[0];
      if (!mongoose.Types.ObjectId.isValid(courseId))
        return res
          .status(400)
          .json({ status: "failure", message: "Course Id is not valid" });
      const f = Object.entries(files)[0][1];
      const course = await Course.findById(courseId).populate(
        "teacher",
        "name"
      );
      if (!course)
        return res
          .status(404)
          .json({ status: "failure", message: "Course not found" });
      res
        .status(200)
        .json({ status: "success", message: "Email sent to everyone" });
      const { oldUsers, newUsers } = await readExcel(f[0].filepath);
      const allUsers = [...oldUsers, ...newUsers];
      const studentIds = allUsers.map((student) => student._id);
      await Course.updateOne(
        { _id: courseId },
        { $addToSet: { students: studentIds } }
      );
      const emails = allUsers.map((user) => user.email);
      const __dirname = path.resolve();
      const templatePath = path.join(
        __dirname,
        "./template/course-invite.html"
      );
      const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
      const template = Handlebars.compile(source);
      const html = template({
        COURSE: course.courseName,
        TEACHER: course.teacher.name,
      });
      const mailOptions = {
        from: `"no-reply" ${process.env.SMTP_USER_NAME}`, // sender address
        to: emails, // list of receivers
        subject: `Course Invitation for ${course.courseName}`, // Subject line
        html,
      };
      sendEmail(mailOptions);
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

export {
  createCourse,
  getCourses,
  enrollCourse,
  updateCourse,
  getCourseById,
  deleteCourseById,
  sendAttendanceViaEmail,
  inviteStudentsToEnrollCourse,
};

const generateCourseCode = (count) => {
  let chars = "acdefhiklmnoqrstuvwxyz0123456789".split("");
  let result = "";
  for (let i = 0; i < count; i++) {
    let x = Math.floor(Math.random() * chars.length);
    result += chars[x];
  }
  return result;
};
