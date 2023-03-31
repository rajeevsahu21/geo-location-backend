import mongoose from "mongoose";

import Message from "../models/message.js";
import { sendPushNotification } from "../utils/sendNotification.js";

const addMessage = async (req, res) => {
  try {
    const { title, message, courseId } = req.body;
    if (!title || !message || !mongoose.Types.ObjectId.isValid(courseId))
      return res
        .status(400)
        .json({ error: true, message: "Required field is missing" });
    const newMessage = await Message.create({ title, message, courseId });
    res.status(201).json({
      data: newMessage,
      error: false,
      message: "Message created successfully",
    });
    sendPushNotification(title, message, courseId);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

const getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ error: true, message: "Message Id is not valid" });
    const message = await Message.findById(id);
    if (!message)
      return res
        .status(404)
        .json({ error: true, message: "Message Not Found" });
    res.status(200).json({
      data: message,
      error: false,
      message: "Message Found successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { pageNumber, limit, searchTerm = "", courseId } = req.query;
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
      error: false,
      message: "All Messages found",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ error: true, message: "Message Id is not valid" });
    const { title, message } = req.body;
    const updatedMessage = await Message.findByIdAndUpdate(id, {
      title,
      message,
    });
    if (!updatedMessage)
      return res
        .status(404)
        .json({ error: true, message: "Message Not Found" });
    res
      .status(200)
      .json({ error: false, message: "Message Updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ error: true, message: "Message Id is not valid" });
    const deletedClass = await Message.findByIdAndDelete(id);
    if (!deletedClass)
      return res
        .status(404)
        .json({ error: true, message: "Message not found" });
    res
      .status(200)
      .json({ error: false, message: "Message deleted successfully" });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
};

export { addMessage, getMessage, getMessages, updateMessage, deleteMessage };
