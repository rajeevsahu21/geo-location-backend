import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      required: "Name is required",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      required: "Your email is required",
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
      default: ["student"],
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
