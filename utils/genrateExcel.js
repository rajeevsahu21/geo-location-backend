import XLSX from "xlsx";
import path from "path";
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
      const oldUser = await User.findOne({ email }, { email: 1, name: 1 });
      if (oldUser) {
        oldUsers.push(oldUser);
      } else {
        const newUser = await User.create({
          email,
          name: worksheet[`B${i}`]?.v,
          registrationNo: email.split("@")[0],
        });
        newUsers.push(newUser);
        const mailOptions = {
          from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
          to: newUser.email,
          subject: "Account Created",
          html: `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Account Created</title>
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
                          <p style="font-family: Merriweather; color: #002B5B;margin-left: 20px; font-weight: 600;">GKV<span> App</span></p>
                      </header>
                      <br />
                      <div>
                          <p style="font-family: Helvetica Neue,Helvetica,Lucida Grande,tahoma,verdana,arial,sans-serif; text-align: start; color: grey; line-height: 2;">
                              Hi ${newUser.name || "There"},<br />
                              Your Account is Created with us kindly download the App and use login with Google to see all your courses.</p>
                          <a href='https://play.google.com/store/apps/details?id=com.gkv.gkvapp' target="_blank">
                              <button
                                  style="background: #5DA7DB; border: none; color: white;cursor: pointer ;height: 50px; width: 280px; border-radius: 5px;margin-left: 20px; font-weight: 800; font-size: medium;">
                                  Download the App
                              </button>
                          </a>
                      </div>
                      <br />
                      <div>
                          <div style="display: flex; border-radius: 4px;">
                              <div style="padding-left: 1%;">
                                  <P style="word-wrap: break-word; font-weight: 600;">Available on Playstore</P>
                              </div>
                              <a href='https://play.google.com/store/apps/details?id=com.gkv.gkvapp' style='cursor:pointer;display:block'><img
                                      src='https://cdn.me-qr.com/qr/55920118.png?v=1681240451' style="overflow: hidden;"
                                      width="160px" alt='Download app from Playstore'></a>
                          </div>
                      </div>
                      <footer>
                          <p style="font-size:x-small;">You have received this mail because your e-mail ID is registered with
                              GKV-app. This is a system-generated e-mail, please don't reply to this message.</p>
                      </footer>
                  </div>
              </center>
          </body>
          </html>`,
        };
        sendEmail(mailOptions);
      }
    }
  }
  return { newUsers, oldUsers };
};

export { exportToExcel, readExcel };
