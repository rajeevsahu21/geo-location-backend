import "./instrument";

import express from "express";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { createRequire } from "node:module";

import dbConnect from "./config/dbConnect.js";
import authRoutes from "./routes/auth.js";
import authMiddleWare from "./middleware/auth.js";
import classRoutes from "./routes/class.js";
import courseRoutes from "./routes/course.js";
import userRoutes from "./routes/user.js";
import messageRoutes from "./routes/message.js";

const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const app = express();

dbConnect();

Sentry.setupExpressErrorHandler(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err, req, res, next) => {
  if (err.stack) {
    return res
      .status(400)
      .json({ status: "failure", message: "Invalid request body" });
  }
  next();
});
app.use(
  morgan("dev", {
    skip: function (req, res) {
      return res.statusCode < 400;
    },
  })
);
app.use(
  morgan("combined", {
    stream: fs.createWriteStream(path.join(path.resolve(), ".log"), {
      flags: "a",
    }),
  })
);

app.get("/api", (req, res) => {
  res
    .status(200)
    .json({ status: "success", message: "API is working", version });
});

import "./attendanceReportCorn.js";

app.use("/api/auth", authRoutes);
app.use(authMiddleWare);
app.use("/api/class", classRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server Listening on port ${port}...`));
