import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import Handlebars from "handlebars";
import fs from "fs";

import User from "../models/User.js";
import Course from "../models/Course.js";
import {
  logInBodyValidation,
  signUpBodyValidation,
} from "../utils/validationSchema.js";
import sendEmail from "../utils/sendEmail.js";

// @route POST /api/auth/login
// @desc Login with email and password
// @access Public
const login = async (req, res) => {
  try {
    const { error } = logInBodyValidation(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: "failure", message: error.details[0].message });
    const email = req.body.email.replace(/\s/g, "").toLowerCase();

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ status: "failure", message: "No User found with given email" });
    if (!user.password)
      return res.status(400).json({
        status: "failure",
        message: `You signed up with Google. Please login using Google or continue using forgot Password`,
      });

    if (user.status != "active") {
      return res.status(401).send({
        status: "failure",
        message:
          "Pending Account. Please Verify Your Email or Continue with Google",
      });
    }

    const verifiedPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!verifiedPassword)
      return res
        .status(401)
        .json({ status: "failure", message: "Invalid email or password" });

    const course = await Course.find({ students: user.id, activeClass: true });
    if (course.length) {
      return res.status(400).json({
        status: "failure",
        message: "login denied because active class found",
      });
    }
    const token = await generateToken(user);

    res.status(200).json({
      status: "success",
      token,
      user,
      message: "Logged in sucessfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/auth/signUp
// @desc create a new user account
// @access Public
const signUp = async (req, res) => {
  try {
    const { error } = signUpBodyValidation(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: "failure", message: error.details[0].message });
    const email = req.body.email.replace(/\s/g, "").toLowerCase();
    if (!/[a-zA-Z0-9+_.-]+@gkv.ac.in/.test(email))
      return res
        .status(400)
        .json({ status: "failure", message: "Please use GKV mail" });
    const role = /^\d{8,9}@gkv\.ac\.in$/.test(email) ? "student" : "teacher";
    const registrationNo = role === "student" ? email.split("@")[0] : null;
    const oldUser = await User.findOne({ email });
    if (oldUser)
      return res.status(409).json({
        status: "failure",
        message: "User with given email already exist",
      });
    const name = req.body.name.trim();
    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    const confirmationCode = crypto.randomBytes(25).toString("hex");
    await User.create({
      name,
      email,
      registrationNo,
      role,
      password: hashPassword,
      confirmationCode,
    });
    const __dirname = path.resolve();
    const templatePath = path.join(
      __dirname,
      "./template/confirm-account.html"
    );
    const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
    const template = Handlebars.compile(source);
    const html = template({
      OTP: confirmationCode,
      NAME: name,
      HOST: process.env.HOST,
    });
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: email,
      subject: "Please confirm your account",
      html,
    };
    sendEmail(mailOptions);

    res.status(201).json({
      status: "success",
      message: "User was registered successfully! Please check your email",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/auth/google
// @desc continue with google authentication
// @access Public
const authWithGoogle = async (req, res) => {
  try {
    let profile;
    if (req.body.credential) {
      const verificationResponse = await verifyGoogleToken(req.body.credential);
      if (verificationResponse.error) {
        return res.status(400).json({
          status: "failure",
          message: verificationResponse.error,
        });
      }
      profile = verificationResponse?.payload;
    } else {
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${req.body.userToken}` },
        }
      );
      if (!response.ok)
        return res.status(400).json({
          status: "failure",
          message: "Invalid user detected. Please try again",
        });
      profile = await response.json();
    }
    const email = profile.email;
    if (!/[a-zA-Z0-9+_.-]+@gkv.ac.in/.test(email))
      return res
        .status(400)
        .json({ status: "failure", message: "Please use GKV mail" });
    const role = /^\d{8,9}@gkv\.ac\.in$/.test(email) ? "student" : "teacher";
    const registrationNo = role === "student" ? email.split("@")[0] : null;
    const name = profile.name;
    const gId = profile.sub || profile.id;
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
    const course = await Course.find({ students: user.id, activeClass: true });
    if (course.length) {
      return res.status(400).json({
        status: "failure",
        message: "login denied because active class found",
      });
    }
    const token = await generateToken(user);
    res.status(200).json({
      status: "success",
      token,
      user,
      message: "User Authenticated sucessfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/auth/confirm/:token
// @desc verify the user account
// @access Public
const confirmAccount = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      {
        confirmationCode: req.params.token,
      },
      { status: "active" }
    );
    if (!user) {
      const __dirname = path.resolve();
      const templatePath = path.join(__dirname, "./template/error.html");
      const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
      const template = Handlebars.compile(source);
      const html = template({
        TITLE: "User Not Found.",
        MESSAGE: "Please register again or Continue with Google.",
      });
      return res.send(html);
    }
    const __dirname = path.resolve();
    const templatePath = path.join(__dirname, "./template/success.html");
    const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
    const template = Handlebars.compile(source);
    const html = template({
      TITLE: "Your Account has been Verified!",
      MESSAGE: "Now, You are able to Login.",
    });
    res.send(html);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

// @route POST api/auth/recover
// @desc Recover Password - Generates token and Sends password reset email
// @access Public
const recover = async (req, res) => {
  if (!req.body.email)
    return res
      .status(400)
      .json({ status: "failure", message: "Email is missing" });
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
    if (!user) {
      return res
        .status(401)
        .json({ status: "failure", message: "No User found with given email" });
    }
    const __dirname = path.resolve();
    const templatePath = path.join(
      __dirname,
      "./template/forgot-password.html"
    );
    const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
    const template = Handlebars.compile(source);
    const html = template({
      OTP: resetPasswordToken,
      NAME: user.name,
      HOST: process.env.HOST,
    });
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: user.email,
      subject: "Password change request",
      html,
    };
    sendEmail(mailOptions);
    res
      .status(200)
      .json({ status: "success", message: "A reset email has been sent" });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
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
    const __dirname = path.resolve();
    if (!user) {
      const templatePath = path.join(__dirname, "./template/error.html");
      const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
      const template = Handlebars.compile(source);
      const html = template({
        TITLE: "Password reset token is invalid or has expired.",
        MESSAGE: "Please reset your password once again.",
      });
      return res.send(html);
    }
    res.sendFile(__dirname, "./template/reset-password.html");
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
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
        status: "active",
      }
    );
    const __dirname = path.resolve();
    if (!user) {
      const templatePath = path.join(__dirname, "./template/error.html");
      const source = fs.readFileSync(templatePath, { encoding: "utf-8" });
      const template = Handlebars.compile(source);
      const html = template({
        TITLE: "Password reset token is invalid or has expired.",
        MESSAGE: "Please reset your password once again.",
      });
      return res.send(html);
    }
    let templatePath = path.join(__dirname, "./template/error.html");
    let source = fs.readFileSync(templatePath, { encoding: "utf-8" });
    let template = Handlebars.compile(source);
    let html = template({
      NAME: user.name,
      EMAIL: user.email,
    });
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: user.email,
      subject: "Your password has been changed",
      html,
    };
    sendEmail(mailOptions);
    templatePath = path.join(__dirname, "./template/success.html");
    source = fs.readFileSync(templatePath, { encoding: "utf-8" });
    template = Handlebars.compile(source);
    html = template({
      TITLE: "Your Password has been Updated!",
      MESSAGE: "Now, You are able to Login.",
    });
    res.send(html);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "failure",
      message: err.message || "Internal Server Error",
    });
  }
};

export {
  login,
  signUp,
  authWithGoogle,
  confirmAccount,
  recover,
  reset,
  resetPassword,
};

const generateToken = async (user) => {
  try {
    const payload = { _id: user._id };
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
