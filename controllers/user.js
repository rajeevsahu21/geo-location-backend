import mongoose from "mongoose";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const getUser = async (req, res) => {
  try {
    res.status(200).json({
      status: "success",
      data: req.user,
      version,
      message: "User Found Successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, profileImage, token } = req.body;
    await User.updateOne({ _id: req.user._id }, { name, profileImage, token });
    res.status(200).json({
      status: "success",
      message: "User Profile Updated successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { pageNumber, limit, searchTerm = "" } = req.query;
    const skip = (pageNumber - 1) * limit;
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { registrationNo: { $regex: searchTerm, $options: "i" } },
      ],
      role: { $ne: "admin" },
    };
    const total = await User.countDocuments(query);
    const users = await User.find(query, { password: 0, token: 0 })
      .skip(skip)
      .limit(limit);
    res.status(200).json({
      total,
      pageCount: Math.ceil(total / limit),
      data: users,
      status: "success",
      message: "Users found Successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const updateUsers = async (req, res) => {
  try {
    const { userId, name, email, role } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res
        .status(400)
        .json({ status: "failure", message: "User Id is not valid" });
    const user = await User.findByIdAndUpdate(userId, { name, email, role });
    if (!user)
      return res
        .status(404)
        .json({ status: "failure", message: "User not found" });
    res.status(200).json({
      status: "success",
      message: "User Profile Updated Successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

const getUserCourses = async (req, res) => {
  try {
    const { userId, role } = req.query;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res
        .status(400)
        .json({ status: "failure", message: "User Id is not valid" });
    let query = {
      students: userId,
    };
    if (role === "teacher") {
      query = {
        teacher: userId,
      };
    }
    const courses = await Course.find(query);
    res.status(200).json({
      status: "success",
      data: courses,
      message: "Courses Found Successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

export { getUser, updateUser, getUsers, updateUsers, getUserCourses };
