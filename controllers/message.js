import mongoose from "mongoose";

import Message from "../models/Message.js";
import { sendPushNotification } from "../utils/sendNotification.js";

// @route POST api/message
// @desc Create Message
// @access Teacher
const addMessage = async (req, res) => {
  try {
    const { title, message, courseId } = req.body;
    if (!title || !message || !mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ status: "failure", message: "Required field is missing" });
    await Message.create({ title, message, courseId });
    res.status(201).json({
      status: "success",
      message: "Message Send successfully",
    });
    sendPushNotification(title, message, courseId);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal server error",
    });
  }
};

// @route GET api/message/:id
// @desc Get Message
// @access Teacher
const getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ status: "failure", message: "Message Id is not valid" });
    const message = await Message.findById(id);
    if (!message)
      return res
        .status(404)
        .json({ status: "failure", message: "Message Not Found" });
    res.status(200).json({
      data: message,
      status: "success",
      message: "Message Found successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal server error",
    });
  }
};

// @route GET api/message
// @desc Get Messages
// @access Private
const getMessages = async (req, res) => {
  try {
    const { pageNumber = 1, limit = 15, searchTerm = "", courseId } = req.query;
    const skip = (pageNumber - 1) * limit;
    const query = {
      title: { $regex: searchTerm, $options: "i" },
    };
    if (courseId) query.courseId = courseId;
    const total = await Message.countDocuments(query);
    const messages = await Message.find(query).skip(skip).limit(limit);
    res.status(200).json({
      total,
      pageCount: Math.ceil(total / limit),
      data: messages,
      status: "success",
      message: "All Messages found",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal server error",
    });
  }
};

// @route PUT api/message/:id
// @desc Update Message
// @access Teacher
const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ status: "failure", message: "Message Id is not valid" });
    const { title, message } = req.body;
    const updatedMessage = await Message.findByIdAndUpdate(id, {
      title,
      message,
    });
    if (!updatedMessage)
      return res
        .status(404)
        .json({ status: "failure", message: "Message Not Found" });
    res
      .status(200)
      .json({ status: "success", message: "Message Updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal server error",
    });
  }
};

// @route DELETE api/message/:id
// @desc Delete Message
// @access Teacher
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ status: "failure", message: "Message Id is not valid" });
    const deletedClass = await Message.findByIdAndDelete(id);
    if (!deletedClass)
      return res
        .status(404)
        .json({ status: "failure", message: "Message not found" });
    res
      .status(200)
      .json({ status: "success", message: "Message deleted successfully" });
  } catch (error) {
    console.error(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal server error",
    });
  }
};

export { addMessage, getMessage, getMessages, updateMessage, deleteMessage };
