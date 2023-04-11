import express from "express";
import { config } from "dotenv";
import cors from "cors";
import session from "express-session";
import passport from "passport";
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

config();
dbConnect();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.APP_SECRET,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.status(200).json({ error: false, message: "API is working", version });
});
app.use("/", authRoutes);
app.use(authMiddleWare);
app.use("/api", classRoutes);
app.use("/api", courseRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server Listening on port ${port}...`));

import { OAuth2Strategy as GoogleStrategy } from "passport-google-oauth";
import User from "./models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `https://${process.env.HOST}/auth/google/callback`,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      let user;
      try {
        const email = profile.emails[0].value;
        const gId = profile.id;
        const profileImage = profile.photos[0].value;
        const name = profile.displayName;
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
          const role = /^\d[1-9]([0-9]{1,9}@gkv.ac.in$)/.test(email)
            ? "student"
            : "teacher";
          const registrationNo =
            role === "student" ? email.substring(0, 9) : null;
          const userData = {
            name,
            email,
            gId,
            profileImage,
            role,
            status: "active",
            registrationNo,
          };
          const newUser = await User.create(userData);
          user = newUser;
        } else {
          if (!existingUser.gId) {
            await User.updateOne(
              { email },
              { name, gId, profileImage, status: "active" }
            );
          }
          user = existingUser;
        }
        return done(null, user);
      } catch (err) {
        return done(err, user);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});
