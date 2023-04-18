import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Your email is required"],
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
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
