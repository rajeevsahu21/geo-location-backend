import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: [3, "Name must be 3 characters or more"],
    },
    email: {
      type: String,
      required: [true, "Your email is required"],
      validate: [validator.isEmail, "Please provide a valid email address"],
      unique: true,
      trim: true,
    },
    gId: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      max: 100,
    },
    profileImage: {
      type: String,
      max: 255,
    },
    registrationNo: {
      type: String,
    },
    role: {
      type: String,
      enum: ["student", "teacher"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
    },
    token: {
      type: String,
      max: 255,
    },
    confirmationCode: {
      type: String,
      unique: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    lastActivity: {
      type: Date,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
