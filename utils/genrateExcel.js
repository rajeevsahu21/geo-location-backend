import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import Handlebars from "handlebars";

import User from "../models/User.js";
import sendEmail from "./sendEmail.js";

const exportToExcel = async (
  data,
  workSheetColumnName,
  workSheetName,
  filePath
) => {
  const wb = XLSX.utils.book_new();
  const workSheetData = [workSheetColumnName, ...data];
  const ws = XLSX.utils.aoa_to_sheet(workSheetData);
  XLSX.utils.book_append_sheet(wb, ws, workSheetName);
  await XLSX.writeFile(wb, path.resolve(filePath));
};

const readExcel = async (file) => {
  const workbook = XLSX.readFile(file);
  const wsnames = workbook.SheetNames;
  const worksheet = workbook.Sheets[wsnames[0]];
  const length = +worksheet["!ref"].split(":")[1].substring(1);
  let newUsers = [];
  let oldUsers = [];
  for (let i = 1; i <= length; i++) {
    const email = worksheet[`A${i}`].v.replace(/\s/g, "").toLowerCase();
    if (worksheet[`A${i}`] && /^\d{8,9}@gkv\.ac\.in$/.test(email)) {
      const name = worksheet[`B${i}`]?.v;
      const parentEmail = worksheet[`C${i}`]?.v;
      const parentPhone = worksheet[`D${i}`]?.v;
      const oldUser = await User.findOneAndUpdate(
        { email },
        { name, parentEmail, parentPhone }
      );
      if (oldUser) {
        oldUsers.push(oldUser);
      } else {
        const newUser = await User.create({
          email,
          name,
          parentEmail,
          parentPhone,
          registrationNo: email.split("@")[0],
        });
        newUsers.push(newUser);
        const __dirname = path.resolve();
        const templatePath = path.join(
          __dirname,
          "./template/account-creation.html"
        );
        const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
        const template = Handlebars.compile(source);
        const html = template({
          NAME: newUser.name || "There",
        });
        const mailOptions = {
          from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
          to: newUser.email,
          subject: "Account Created",
          html,
        };
        sendEmail(mailOptions);
      }
    }
  }
  return { newUsers, oldUsers };
};

export { exportToExcel, readExcel };
