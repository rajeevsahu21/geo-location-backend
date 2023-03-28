import User from "../models/User.js";

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      error: false,
      data: user,
      message: "User Found",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, profileImage, token } = req.body;
    await User.updateOne({ _id: req.user._id }, { name, profileImage, token });
    res
      .status(200)
      .json({ error: false, message: "User Profile Updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Internal Server Error" });
  }
};

export { getUser, updateUser };
