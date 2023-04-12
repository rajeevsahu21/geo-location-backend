import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import User from "../models/User.js";
import {
  logInBodyValidation,
  signUpBodyValidation,
} from "../utils/validationSchema.js";
import sendEmail from "../utils/sendEmail.js";

const login = async (req, res) => {
  try {
    const { error } = logInBodyValidation(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: true, message: error.details[0].message });
    const email = req.body.email.replace(/\s/g, "").toLowerCase();

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ error: true, message: "No User found with given email" });
    if (!user.password)
      return res.status(400).json({
        error: true,
        message: `You signed up with Google. Please login using Google or continue using forgot Password`,
      });

    if (user.status != "active") {
      return res.status(401).send({
        error: true,
        message: "Pending Account. Please Verify Your Email!",
      });
    }

    const verifiedPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!verifiedPassword)
      return res
        .status(401)
        .json({ error: true, message: "Invalid email or password" });

    const token = await generateToken(user);

    res.status(200).json({
      error: false,
      token,
      user,
      message: "Logged in sucessfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const signUp = async (req, res) => {
  try {
    const { error } = signUpBodyValidation(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: true, message: error.details[0].message });
    const email = req.body.email.replace(/\s/g, "").toLowerCase();
    if (!/[a-zA-Z0-9+_.-]+@gkv.ac.in/.test(email))
      return res
        .status(400)
        .json({ error: true, message: "Please use GKV mail" });
    const role = /^\d{9}@gkv\.ac\.in$/.test(email) ? "student" : "teacher";
    const registrationNo = role === "student" ? email.substring(0, 9) : null;
    const oldUser = await User.findOne({ email });
    if (oldUser)
      return res
        .status(409)
        .json({ error: true, message: "User with given email already exist" });
    const name = req.body.name.trim();
    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    const confirmationCode = crypto.randomBytes(25).toString("hex");
    const user = await User.create({
      name,
      email,
      registrationNo,
      role,
      password: hashPassword,
      confirmationCode,
    });
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: email,
      subject: "Please confirm your account",
      html: `<!DOCTYPE html>
      <html lang="en"> 
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Account</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href='https://fonts.googleapis.com/css?family=Orbitron' rel='stylesheet' type='text/css'>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather&family=Montserrat&family=Roboto&display=swap"
              rel="stylesheet">
      </head>
      <body>
          <div style="display: flex;align-items: center;justify-content: center;">
              <div style="width: 350px">
                  <header
                      style="display: flex; flex-direction: row; align-items:center; border-bottom: solid #A5D7E8; border-width: thin;">
                      <img src="https://play-lh.googleusercontent.com/asrfS4x89LkxFILsB4rYxFmX7n0K61MM0QEHpQ7GMlzfekHIeNLHxlP5dEbt1SstnFU=w240-h480"
                          width="60px" height="50px" alt="GKV" />
                      <p style="font-family: Merriweather; color: #002B5B;margin-left: 20px; font-weight: 600;">GKV<span>
                              App</span></p>
                  </header>
                  <br />
                  <div style="text-align: center;">
                      <div>
                          <img src="https://png.pngtree.com/png-vector/20190726/ourmid/pngtree-package-pending-icon-for-your-project-png-image_1599195.jpg"
                              width="120px">
                      </div>
                      <P style="text-align: left;">Hello ${name}</P>
                      <p style="text-align: left;">Thank you for part of the GKV. Please confirm your email by clicking on the
                          following link.</p>
                      <a href=https://${process.env.HOST}/api/auth/confirm/${confirmationCode} target="_blank">
                          <button
                              style="background: #5DA7DB; border: none; color: white; height: 40px; width: 280px; border-radius: 5px; font-weight: 800; font-size: medium;cursor: pointer;">
                              Verify Email-ID</button>
                      </a>
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
          </div>
      </body>
      </html>`,
    };
    sendEmail(mailOptions);

    res.status(201).json({
      error: false,
      message: "User was registered successfully! Please check your email",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const authWithGoogle = async (req, res) => {
  try {
    if (req.body.credential) {
      const verificationResponse = await verifyGoogleToken(req.body.credential);
      if (verificationResponse.error) {
        return res.status(400).json({
          error: true,
          message: verificationResponse.error,
        });
      }
      const profile = verificationResponse?.payload;
      const email = profile.email;
      if (!/[a-zA-Z0-9+_.-]+@gkv.ac.in/.test(email))
        return res
          .status(400)
          .json({ error: true, message: "Please use GKV mail" });
      const role = /^\d{9}@gkv\.ac\.in$/.test(email) ? "student" : "teacher";
      const registrationNo = role === "student" ? email.substring(0, 9) : null;
      const name = profile.name;
      const gId = profile.sub;
      const profileImage = profile.picture;
      let user = await User.findOne({ email });

      if (!user) {
        user = await new User({
          name,
          email,
          gId,
          profileImage,
          role,
          status: "active",
          registrationNo,
        }).save();
      } else if (!user.gId) {
        await User.updateOne(
          { email },
          { name, gId, profileImage, status: "active" }
        );
      }
      const token = await generateToken(user);
      res.status(200).json({
        error: false,
        token,
        user,
        message: "User Authenticated sucessfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const authWithGoogleForApp = async (req, res) => {
  try {
    const { name, email, gId, profileImage } = req.body;

    if (!gId || !name || !email)
      return res
        .status(400)
        .json({ error: true, message: "Somthing is missing" });
    if (!/[a-zA-Z0-9+_.-]+@gkv.ac.in/.test(email))
      return res
        .status(400)
        .json({ error: true, message: "Please use GKV mail" });
    const role = /^\d{9}@gkv\.ac\.in$/.test(email) ? "student" : "teacher";
    const registrationNo = role === "student" ? email.substr(0, 9) : null;
    let user = await User.findOne({ email });

    if (!user) {
      user = await new User({
        name,
        email,
        gId,
        profileImage,
        role,
        status: "active",
        registrationNo,
      }).save();
    } else if (!user.gId) {
      await User.updateOne(
        { email },
        { name, gId, profileImage, status: "active" }
      );
    }
    const token = await generateToken(user);
    res.status(200).json({
      error: false,
      token,
      user,
      message: "User Authenticated sucessfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const confirmAccount = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      {
        confirmationCode: req.params.token,
      },
      { status: "active" }
    );
    if (!user)
      return res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
    </head>
    <body>
        <div style="display: flex;align-items: center;justify-content: center;">
            <div style="width: 350px;">
                <div style="display: flex; flex-direction: column; align-items: center;padding-top: 80px;">
                    <div style="display: flex; justify-content: center;">
                        <img src="https://nika.shop/wp-content/uploads/2020/01/fail-png-7.png" width="120px">
                    </div>
                    <h2>Something Went Wrong!</h2>
                    <p style="color: red;">User Not Found.</p>
                </div>
            </div>
        </div>
    </body>
    </html>`);
    res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Success</title>
    </head>
    <body>
        <div style="display: flex;align-items: center;justify-content: center;">
            <div style="width: 350px;">
                <div style="display: flex; flex-direction: column; align-items: center;padding-top: 80px;">
                    <div style="display: flex; justify-content: center;">
                        <img src="https://freepngimg.com/thumb/success/6-2-success-png-image.png" width="120px">
                    </div>
                    <h2>Successful!</h2>
                    <p style="color: green;">Your Account has been Verified!</p>
                </div>
            </div>
        </div>
    </body>
    </html>`);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

// @route POST api/auth/recover
// @desc Recover Password - Generates token and Sends password reset email
// @access Public
const recover = async (req, res) => {
  if (!req.body.email)
    return res.status(400).json({ error: true, message: "Email is missing" });
  const email = req.body.email.replace(/\s/g, "").toLowerCase();
  try {
    const resetPasswordToken = crypto.randomBytes(20).toString("hex");
    const user = await User.findOneAndUpdate(
      { email },
      {
        resetPasswordToken,
        resetPasswordExpires: Date.now() + 3600000,
      }
    );
    if (!user)
      return res
        .status(401)
        .json({ error: true, message: "No User found with given email" });
    let link = `https://${process.env.HOST}/api/auth/reset/${resetPasswordToken}`;
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: user.email,
      subject: "Password change request",
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Change</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href='https://fonts.googleapis.com/css?family=Orbitron' rel='stylesheet' type='text/css'>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather&family=Montserrat&family=Roboto&display=swap"
              rel="stylesheet">
          <style>
              .mail-container {
                  width: 350px;
              }
          </style>
      </head>
      <body style="display: flex;align-items: center;justify-content: center;">
          <div>
              <div class="mail-container">
                  <header
                      style="display: flex; flex-direction: row; align-items: center; border-bottom: solid #A5D7E8; border-width: thin;">
                      <img src="https://play-lh.googleusercontent.com/asrfS4x89LkxFILsB4rYxFmX7n0K61MM0QEHpQ7GMlzfekHIeNLHxlP5dEbt1SstnFU=w240-h480"
                          width="60px" height="50px" alt="GKV" />
                      <p style="font-family: Merriweather; color: #002B5B;margin-left: 20px; font-weight: 600;">GKV<span> App</span></p>
                  </header>
                  <br />
                  <div>
                      <p style="font-family: Helvetica Neue,Helvetica,Lucida Grande,tahoma,verdana,arial,sans-serif; text-align: start; color: grey; line-height: 2;">
                          Hi ${user.name},<br /> <br />
                          Sorry to hear you're having trouble logging into GKV-app. We got a message that you forgot your
                          password. If this was you, you can reset your password now.</p>
                      <a href=${link} target="_blank">
                          <button
                              style="background: #5DA7DB; border: none; color: white;cursor: pointer ;height: 50px; width: 280px; border-radius: 5px;margin-left: 20px; font-weight: 800; font-size: medium;">
                              Reset your password
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
                      <p style="font-size:small;">You have received this mail because your e-mail ID is registered with
                          GKV-app. This is a system-generated e-mail, please don't reply to this message.</p>
                  </footer>
              </div>
          </div>
      </body>
      </html>`,
    };
    sendEmail(mailOptions);
    res
      .status(200)
      .json({ error: false, message: "A reset email has been sent" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

// @route GET api/auth/reset/:token
// @desc Reset Password - Validate password reset token and shows the password reset view
// @access Public
const reset = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
      </head>
      <body>
          <div style="display: flex;align-items: center;justify-content: center;">
              <div style="width: 350px;">
                  <div style="display: flex; flex-direction: column; align-items: center;padding-top: 80px;">
                      <div style="display: flex; justify-content: center;">
                          <img src="https://nika.shop/wp-content/uploads/2020/01/fail-png-7.png" width="120px">
                      </div>
                      <h2>Something Went Wrong!</h2>
                      <p style="color: red;">Password reset token is invalid or has expired.</p>
                  </div>
              </div>
          </div>
      </body>
      </html>`);
    const __dirname = path.resolve();
    res.sendFile(__dirname + "/reset.html");
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

// @route POST api/auth/reset/:token
// @desc Reset Password
// @access Public
const resetPassword = async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashPassword = await bcrypt.hash(req.body.password, salt);
    const user = await User.findOneAndUpdate(
      {
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() },
      },
      {
        password: hashPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    );
    if (!user)
      return res.send(`<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
      </head>
      <body>
          <div style="display: flex;align-items: center;justify-content: center;">
              <div style="width: 350px;">
                  <div style="display: flex; flex-direction: column; align-items: center;padding-top: 80px;">
                      <div style="display: flex; justify-content: center;">
                          <img src="https://nika.shop/wp-content/uploads/2020/01/fail-png-7.png" width="120px">
                      </div>
                      <h2>Something Went Wrong!</h2>
                      <p style="color: red;">Password reset token is invalid or has expired.</p>
                  </div>
              </div>
          </div>
      </body>
      </html>`);
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: user.email,
      subject: "Your password has been changed",
      text: `Hi ${user.name} \nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };
    sendEmail(mailOptions);
    res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Success</title>
    </head>
    <body>
        <div style="display: flex;align-items: center;justify-content: center;">
            <div style="width: 350px;">
                <div style="display: flex; flex-direction: column; align-items: center;padding-top: 80px;">
                    <div style="display: flex; justify-content: center;">
                        <img src="https://freepngimg.com/thumb/success/6-2-success-png-image.png" width="120px">
                    </div>
                    <h2>Successful!</h2>
                    <p>Your Password has been Updated!</p>
                </div>
            </div>
        </div>
    </body>
    </html>`);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

export {
  login,
  signUp,
  authWithGoogle,
  authWithGoogleForApp,
  confirmAccount,
  recover,
  reset,
  resetPassword,
  generateToken,
};

const generateToken = async (user) => {
  try {
    const payload = { _id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_PRIVATE_KEY, {
      expiresIn: "30d",
    });

    return Promise.resolve(token);
  } catch (err) {
    return Promise.reject(err);
  }
};

const verifyGoogleToken = async (token) => {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return { payload: ticket.getPayload() };
  } catch (error) {
    return { error: "Invalid user detected. Please try again" };
  }
};
