import mongoose from "mongoose";
import formidable from "formidable";

import Class from "../models/Class.js";
import Course from "../models/Course.js";
import { exportToExcel, readExcel } from "../utils/genrateExcel.js";
import sendEmail from "../utils/sendEmail.js";
import Message from "../models/message.js";

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

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { students } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const updatedCourse = await Course.findByIdAndUpdate(id, {
      $pull: { students: { $in: students } },
    });
    if (!updatedCourse)
      return res.status(404).json({ error: true, message: "Course not Found" });
    res
      .status(200)
      .json({ error: false, message: "Student removed Successfully" });
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
    await Message.deleteMany({ courseId });
    res
      .status(200)
      .json({ error: false, message: "Course deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const sendAttendanceViaEmail = async (req, res) => {
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
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`, // sender address
      to: course.teacher.email, // list of receivers
      subject: `Course Attendance for ${courseName}`, // Subject line
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Course Attendance</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href='https://fonts.googleapis.com/css?family=Orbitron' rel='stylesheet' type='text/css'>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather&family=Montserrat&family=Roboto&display=swap"
              rel="stylesheet">
      </head>
      <body>
          <center>
              <div style="width: 350px;">
                  <header
                      style="display: flex; flex-direction: row; align-items: center; border-bottom: solid #A5D7E8; border-width: thin;">
                      <img src="https://play-lh.googleusercontent.com/asrfS4x89LkxFILsB4rYxFmX7n0K61MM0QEHpQ7GMlzfekHIeNLHxlP5dEbt1SstnFU=w240-h480"
                          width="60px" height="50px" alt="GKV" />
                      <p style="font-family: Merriweather; color: #002B5B; margin-left: 20px;">GKV<span> App</span></p>
                  </header>
                  <br />
                  <div style="text-align: center;">
                      <div>
                          <img src="https://png.pngtree.com/png-vector/20190726/ourmid/pngtree-package-pending-icon-for-your-project-png-image_1599195.jpg"
                              width="120px">
                      </div>
                      <p style="font-weight: 600; text-align: left;">Complete Attendance for ${courseName}</p>
                      <p style="text-align: left;">Please download the excel sheet down below to get the attendance list.</p>
                  </div>
                  <br />
                  <div>
                      <div style="display: flex; border-radius: 4px;">
                          <div style="padding-left: 1%;">
                              <P style="word-wrap: break-word; font-weight: 600;">Available on Playstore</P>
                          </div>
                          <a href='https://play.google.com/store/apps/details?id=com.gkv.gkvapp'
                              style='cursor:pointer;display:block'><img
                                  src='https://cdn.me-qr.com/qr/55920118.png?v=1681240451' style="overflow: hidden;"
                                  width="160px" alt='Download app from Playstore'></a>
                      </div>
                  </div>
                  <footer>
                      <p style="font-size:small;">You have received this mail because your e-mail ID is registered with
                          GKV-app. This is a system-generated e-mail, please don't reply to this message.</p>
                  </footer>
              </div>
          </center>
      </body>
      </html>`,
      attachments: [
        {
          // filename and content type is derived from path
          path: filePath,
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
      const course = await Course.findById(courseId).populate(
        "teacher",
        "name"
      );
      if (!course)
        return res
          .status(404)
          .json({ error: true, message: "Course not found" });
      res.status(200).json({ error: false, message: "Email sent to everyone" });
      const { oldUsers, newUsers } = await readExcel(f.filepath);
      const allUsers = [...oldUsers, ...newUsers];
      const studentIds = allUsers.map((student) => student._id);
      await Course.updateOne(
        { _id: courseId },
        { $addToSet: { students: studentIds } }
      );
      const emails = allUsers.map((user) => user.email);
      const mailOptions = {
        from: `"no-reply" ${process.env.SMTP_USER_NAME}`, // sender address
        to: emails, // list of receivers
        subject: `Course Invitation for ${course.courseName}`, // Subject line
        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Invitation</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link href='https://fonts.googleapis.com/css?family=Orbitron' rel='stylesheet' type='text/css'>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Merriweather&family=Montserrat&family=Roboto&display=swap"
                rel="stylesheet">
        </head>
        <body>
            <center>
                <div style="width: 350px;">
                    <header
                        style="display: flex; flex-direction: row; align-items: center; border-bottom: solid #A5D7E8; border-width: thin;">
                        <img src="https://play-lh.googleusercontent.com/asrfS4x89LkxFILsB4rYxFmX7n0K61MM0QEHpQ7GMlzfekHIeNLHxlP5dEbt1SstnFU=w240-h480"
                            width="60px" height="50px" alt="GKV" />
                        <p style="font-family: Merriweather; color: #002B5B; margin-left: 20px;">GKV<span> App</span></p>
                    </header>
                    <br />
                    <div style="text-align: center;">
                        <div>
                            <img src="https://png.pngtree.com/png-vector/20190726/ourmid/pngtree-package-pending-icon-for-your-project-png-image_1599195.jpg"
                                width="120px">
                        </div>
                        <p style="text-align: left;">Hi There,<br/><b>${course.teacher.name}</b> sir, added you in the <b>${course.courseName}</b> course.
                        </p>
                    </div>
                    <br />
                    <div>
                        <div style="display: flex; border-radius: 4px;">
                            <div style="padding-left: 1%;">
                                <P style="word-wrap: break-word; font-weight: 600;">Available on Playstore</P>
                            </div>
                            <a href='https://play.google.com/store/apps/details?id=com.gkv.gkvapp'
                                style='cursor:pointer;display:block'><img
                                    src='https://cdn.me-qr.com/qr/55920118.png?v=1681240451' style="overflow: hidden;"
                                    width="160px" alt='Download app from Playstore'></a>
                        </div>
                    </div>
                    <footer>
                        <p style="font-size:small;">You have received this mail because your e-mail ID is registered with
                            GKV-app. This is a system-generated e-mail, please don't reply to this message.</p>
                    </footer>
                </div>
            </center>
        </body>
        </html>`,
      };
      sendEmail(mailOptions);
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
