import mongoose from "mongoose";
import formidable from "formidable";

import Class from "../models/Class.js";
import Course from "../models/Course.js";
import { exportToExcel, readExcel } from "../utils/genrateExcel.js";
import sendEmail from "../utils/sendEmail.js";

const createCourse = async (req, res) => {
  try {
    if (!req.body.courseName)
      return res
        .status(400)
        .json({ error: true, message: "Please Enter Course Name" });
    const courseName = req.body.courseName;
    const courseCode = generateCourseCode(6);
    const newCourse = await new Course({
      courseName,
      courseCode,
      teacher: req.user._id,
    }).save();
    res.status(201).json({
      error: false,
      data: newCourse,
      message: "Course Created successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const getCourses = async (req, res) => {
  try {
    const query =
      req.user.role === "student"
        ? { students: req.user._id }
        : { teacher: req.user._id };
    const courses = await Course.find(query);
    res
      .status(200)
      .json({ error: false, data: courses, message: "Available Course found" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const enrollCourse = async (req, res) => {
  try {
    if (!req.body.courseCode)
      return res
        .status(400)
        .json({ error: true, message: "Please Enter Course Code" });
    const courseCode = req.body.courseCode.replace(/\s/g, "").toLowerCase();
    const studentId = req.user._id;
    const course = await Course.findOne({ courseCode });
    if (!course)
      return res.status(404).json({ error: true, message: "Course not found" });
    if (!course.isActive)
      return res
        .status(400)
        .json({ error: true, message: "Course closed for enrollment" });
    const studentCourse = await Course.findOne({
      courseCode,
      students: studentId,
    });
    if (studentCourse)
      return res
        .status(400)
        .json({ error: true, message: "Student already enrolled" });
    const enrolledCourse = await Course.findOneAndUpdate(
      { courseCode },
      { $addToSet: { students: studentId } },
      { new: true }
    );
    res.status(200).json({
      error: false,
      data: enrolledCourse,
      message: "Course Enrollment Done",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const toggleCourseEnrollment = async (req, res) => {
  try {
    const { courseId, toggle } = req.body;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ error: true, message: "Course not found" });
    await Course.updateOne({ _id: courseId }, { isActive: toggle });
    res.status(200).json({
      error: false,
      message: `Course Enrollment ${
        toggle ? "Started" : "Closed"
      } successfully`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const course = await Course.findById(courseId).populate(
      "students",
      "registrationNo name"
    );
    if (!course)
      return res.status(404).json({ error: true, message: "Course not found" });
    res.status(200).json({
      error: false,
      data: course,
      message: "Course Found successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const deleteCourseById = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse)
      return res.status(404).json({ error: true, message: "Course not found" });
    await Class.deleteMany({ courseId });
    res
      .status(200)
      .json({ error: false, message: "Course deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const sendAttendanceViaEmail = async (req, res) => {
  const workSheetName = "students";
  const filePath = "./attendance.xlsx";
  try {
    const { courseId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const course = await Course.findById(courseId)
      .populate("students", "name registrationNo")
      .populate("teacher", "email");
    if (!course)
      return res.status(404).json({ error: true, message: "Course not found" });
    const classes = await Class.find({ courseId });
    if (!classes.length)
      return res.status(404).json({ error: true, message: "No Classes found" });
    const courseName = course.courseName;
    const classesDates = classes.map((cls) =>
      cls.createdDate.toLocaleDateString("pt-PT")
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
    await exportToExcel(userList, workSheetColumnName, workSheetName, filePath);
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`, // sender address
      to: course.teacher.email, // list of receivers
      subject: "Course Attendance", // Subject line
      text: `Complete Attendance for ${courseName}`, // plain text body
      html: `<b>Complete Attendance for ${courseName}</b>`, // html body
      attachments: [
        {
          // filename and content type is derived from path
          path: "./attendance.xlsx",
        },
      ],
    };
    await sendEmail(mailOptions);
    res
      .status(200)
      .json({ error: false, message: "Attendance sent successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const inviteStudentsToEnrollCourse = async (req, res) => {
  try {
    const form = formidable({ multiples: true });
    form.parse(req, async (err, fields, files) => {
      if (!files.emails)
        return res.status(400).json({ error: true, message: "File not found" });
      const courseId = fields.courseId;
      if (!mongoose.Types.ObjectId.isValid(courseId))
        return res
          .status(400)
          .json({ error: true, message: "Course Id is not valid" });
      const f = Object.entries(files)[0][1];
      const emails = readExcel(f.filepath);
      const course = await Course.findById(courseId).populate(
        "teacher",
        "name"
      );
      if (!course)
        return res
          .status(404)
          .json({ error: true, message: "Course not found" });
      const mailOptions = {
        from: `"no-reply" ${process.env.SMTP_USER_NAME}`, // sender address
        to: emails, // list of receivers
        subject: `Course Invitation for ${course.courseName}`, // Subject line
        html: `<p><b>${course.teacher.name}</b> sir invites you join the <b>${course.courseName}</b> course with this code <b>${course.courseCode}</b>. website link is https://gkv.netlify.app</p>`,
      };
      sendEmail(mailOptions);
      res.status(200).json({ error: false, message: "Email sent to everyone" });
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

export {
  createCourse,
  getCourses,
  enrollCourse,
  toggleCourseEnrollment,
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
