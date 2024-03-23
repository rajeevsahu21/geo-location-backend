import cron from "node-cron";
import validator from "validator";

import Class from "./models/Class.js";
import Course from "./models/Course.js";
import User from "./models/User.js";
import sendEmail from "./utils/sendEmail.js";

cron.schedule(
  "00 18 * * 1,2,3,4,5,6",
  async () => {
    console.log("cron started");
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const students = await User.find({ role: "student" });
    for (let i = 0; i < students.length; i++) {
      const missedClasses = [];
      const courses = await Course.find({ students: students[i]._id });
      for (let j = 0; j < courses.length; j++) {
        const classes = await Class.find({
          courseId: courses[j]._id,
          createdAt: {
            $gte: currentDate,
            $lt: endOfDay,
          },
        });
        for (let k = 0; k < classes.length; k++) {
          if (!classes[k].students.includes(students[i]._id)) {
            missedClasses.push(courses[j].courseName);
          }
        }
      }
      if (
        /\S+@\S+\.\S+/.test(students[i].parentEmail) &&
        missedClasses.length
      ) {
        const mailOptions = {
          from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
          to: students[i].parentEmail,
          subject: "Attendence Report of your child",
          html: `Dear Parent,
          Your Son ${
            students[i].name
          } have missed the today's class of following courses:
          ${missedClasses.join(", ")}`,
        };
        sendEmail(mailOptions);
      }
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
