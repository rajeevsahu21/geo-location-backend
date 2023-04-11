const checkTeacherRole = (req, res, next) => {
  if (req.user.role === "teacher") {
    next();
  } else {
    return res
      .status(403)
      .json({ error: true, message: "Access denied: user is not a teacher" });
  }
};

export { checkTeacherRole };
