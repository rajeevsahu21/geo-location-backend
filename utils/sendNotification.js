import fetch from "node-fetch";

import Course from "../models/Course.js";
import User from "../models/User.js";

const sendPushNotification = async (title, body, courseId) => {
  try {
    const students = await Course.findById(courseId).distinct("students");
    const tokens = await User.find({ _id: { $in: students } }).distinct(
      "token"
    );
    const message = {
      to: tokens,
      sound: "default",
      title: title,
      body: body,
      data: { someData: "goes here" },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export { sendPushNotification };
