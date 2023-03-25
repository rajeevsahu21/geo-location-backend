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
    req.body = { ...req.body, email };

    const oldUser = await User.findOne({ email });
    if (oldUser)
      return res
        .status(409)
        .json({ error: true, message: "User with given email already exist" });

    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    const user = await new User({ ...req.body, password: hashPassword }).save();
    const token = await generateToken(user);

    res.status(201).json({
      error: false,
      token,
      user,
      message: "Account created sucessfully",
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
      const role = /^\d[1-9]([0-9]{1,9}@gkv.ac.in$)/.test(email)
        ? "student"
        : "teacher";
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
          registrationNo,
        }).save();
      } else if (!user.gId) {
        await User.updateOne({ email }, { gId, profileImage });
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
    const role = /^\d[1-9]([0-9]{1,9}@gkv.ac.in$)/.test(email)
      ? "student"
      : "teacher";
    const registrationNo = role === "student" ? email.substr(0, 9) : null;
    let user = await User.findOne({ email });

    if (!user) {
      user = await new User({
        name,
        email,
        gId,
        profileImage,
        role,
        registrationNo,
      }).save();
    } else if (!user.gId) {
      await User.updateOne({ email }, { gId, profileImage });
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

// @route POST api/auth/recover
// @desc Recover Password - Generates token and Sends password reset email
// @access Public
const recover = async (req, res) => {
  if (!req.body.email)
    return res.status(400).json({ error: true, message: "Email is missing" });
  const email = req.body.email.replace(/\s/g, "").toLowerCase();
  try {
    const user = await User.findOneAndUpdate(
      { email },
      {
        resetPasswordToken: crypto.randomBytes(20).toString("hex"),
        resetPasswordExpires: Date.now() + 3600000,
      },
      { new: true }
    );
    if (!user)
      return res
        .status(401)
        .json({ error: true, message: "No User found with given email" });
    let link = `https://${process.env.HOST}/api/auth/reset/${user.resetPasswordToken}`;
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: user.email,
      subject: "Password change request",
      html: `<p>Hi ${user.name} <br>Please click on the following <a href=${link}>link</a> to reset your password. <br><br>If you did not request this, please ignore this email and your password will remain unchanged.<br></p>`,
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
      return res.send("Password reset token is invalid or has expired.");
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
      return res.send("Password reset token is invalid or has expired.");
    const mailOptions = {
      from: `"no-reply" ${process.env.SMTP_USER_NAME}`,
      to: user.email,
      subject: "Your password has been changed",
      text: `Hi ${user.name} \nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };
    sendEmail(mailOptions);
    res.send("Your password has been updated.");
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
