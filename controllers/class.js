import mongoose from "mongoose";

import Class from "../models/Class.js";
import Course from "../models/Course.js";
import { sendPushNotification } from "../utils/sendNotification.js";

const startClass = async (req, res) => {
  try {
    const { courseId, location, radius } = req.body;
    if (
      !radius ||
      !location.latitude ||
      !location.longitude ||
      !mongoose.Types.ObjectId.isValid(courseId)
    )
      return res
        .status(400)
        .json({ error: true, message: "Required field is missing" });
    const runningClass = await Class.findOne({ courseId, active: true });
    if (runningClass)
      return res
        .status(400)
        .json({ error: true, message: "Already Have a running class" });
    const newClass = await new Class({
      courseId,
      location,
      radius,
    }).save();
    closeClass(courseId);
    sendPushNotification("New class Started", "Mark your Attendance", courseId);
    await Course.updateOne({ _id: courseId }, { activeClass: true, radius });
    res.status(201).json({
      error: false,
      data: newClass,
      message: "Class Started successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { students } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ error: true, message: "class Id is not valid" });
    let mark = [];
    const unMark = [];
    if (students[0]["_id"]) {
      students.forEach((student) => {
        if (student.present) {
          mark.push(student._id);
        } else {
          unMark.push(student._id);
        }
      });
    } else {
      mark = students;
    }
    await Class.updateOne(
      { _id: id },
      {
        $addToSet: { students: mark },
      }
    );
    await Class.updateOne(
      { _id: id },
      {
        $pull: { students: { $in: unMark } },
      }
    );
    res
      .status(200)
      .json({ error: false, message: "Attendance updated Successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const dismissClass = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const oldClass = await Class.findOneAndUpdate(
      { courseId, active: true },
      { active: false }
    );
    await Course.updateOne({ _id: courseId }, { activeClass: false });
    if (!oldClass)
      return res
        .status(404)
        .json({ error: true, message: "No running Class found" });
    res.status(200).json({
      error: false,
      message: "Class dismissed successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { courseId, location } = req.body;
    if (
      !location.longitude ||
      !location.latitude ||
      !mongoose.Types.ObjectId.isValid(courseId)
    )
      return res
        .status(400)
        .json({ error: true, message: "Required field is missing" });
    const studentId = req.user._id;
    const runningClass = await Class.findOne({ courseId, active: true });
    if (!runningClass)
      return res
        .status(404)
        .json({ error: true, message: "No running class found" });
    const classId = runningClass._id;
    const studentClass = await Class.findOne({
      _id: classId,
      students: studentId,
    });
    if (studentClass)
      return res
        .status(400)
        .json({ error: true, message: "Student already marked Attendance" });

    const distance = calculateDistance(
      runningClass.location.latitude,
      location.latitude,
      runningClass.location.longitude,
      location.longitude
    );
    console.log(
      "distance: ",
      distance,
      "class radius: ",
      runningClass.radius,
      "teacher location: ",
      runningClass.location,
      "student location: ",
      location
    );
    if (distance > runningClass.radius) {
      return res
        .status(400)
        .json({ error: true, message: "You are too far from class" });
    }
    await Class.findByIdAndUpdate(classId, {
      $addToSet: { students: studentId },
    });
    res.status(200).json({
      error: false,
      message: "Class Attendance marked successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const getClassesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Course Id is not valid" });
    const query =
      req.user.role === "student"
        ? { students: req.user._id, courseId }
        : { courseId };
    const classes = await Class.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      error: false,
      data: classes,
      message: `Available classes found: ${classes.length}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const getClass = async (req, res) => {
  try {
    const { classId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(classId))
      return res
        .status(400)
        .json({ error: true, message: "Class Id is not valid" });
    const foundClass = await Class.findById(classId).lean();
    if (!foundClass)
      return res.status(404).json({
        error: true,
        message: "Class not found",
      });
    const course = await Course.findById(foundClass.courseId)
      .populate("students", "registrationNo name")
      .lean();
    const courseStudent = course.students;
    const classStudent = foundClass.students.map((item) => item.toString());
    let attendance = [];
    for (let i = 0; i < courseStudent.length; i++) {
      const student = { ...courseStudent[i] };
      if (classStudent.includes(courseStudent[i]._id.toString())) {
        student.present = true;
      } else {
        student.present = false;
      }
      attendance.push(student);
    }
    res.status(200).json({
      error: false,
      data: attendance,
      message: "Student Attendance found",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const getClassById = async (req, res) => {
  try {
    const { classId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(classId))
      return res
        .status(400)
        .json({ error: true, message: "Class Id is not valid" });
    const foundClass = await Class.findById(classId, { __v: 0 }).populate(
      "students",
      "name registrationNo"
    );
    if (!foundClass)
      return res.status(404).json({
        error: true,
        message: "Class not found",
      });
    res.status(200).json({
      error: false,
      data: foundClass,
      message: `${foundClass.students.length} student found`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const deleteClassById = async (req, res) => {
  try {
    const { classId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(classId))
      return res
        .status(400)
        .json({ error: true, message: "Class Id is not valid" });
    const deletedClass = await Class.findByIdAndDelete(classId);
    if (!deletedClass)
      return res.status(404).json({ error: true, message: "Class not found" });
    res
      .status(200)
      .json({ error: false, message: "Class deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

export {
  startClass,
  updateClass,
  dismissClass,
  markAttendance,
  getClassesByCourseId,
  getClass,
  getClassById,
  deleteClassById,
};

const calculateDistance = (lat1, lat2, lon1, lon2) => {
  // degrees to radians.
  lon1 = (lon1 * Math.PI) / 180;
  lon2 = (lon2 * Math.PI) / 180;
  lat1 = (lat1 * Math.PI) / 180;
  lat2 = (lat2 * Math.PI) / 180;

  // Haversine formula
  let dlon = lon2 - lon1;
  let dlat = lat2 - lat1;
  let a =
    Math.pow(Math.sin(dlat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);

  let c = 2 * Math.asin(Math.sqrt(a));

  // Radius of earth in kilometers. Use 3956
  // for miles
  let r = 6371;

  // calculate the result in meter
  return c * r * 1000;
};

const closeClass = (courseId) => {
  try {
    setTimeout(async () => {
      await Class.updateOne({ courseId, active: true }, { active: false });
      await Course.updateOne({ _id: courseId }, { activeClass: false });
    }, 600000);
  } catch (err) {
    console.error(err);
  }
};
