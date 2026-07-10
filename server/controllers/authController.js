import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const login = async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({
        message: "ID and Password are required",
      });
    }

    let user;

    // Student / CR
    if (id.startsWith("24") || id.startsWith("25")) {
      user = await User.findOne({ rollNo: id });
    } else {
      // Faculty / HOD
      user = await User.findOne({ employeeId: id });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid Password",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      token,
      isFirstLogin: user.isFirstLogin,
      user: {
        name: user.name,
        role: user.role,
        rollNo: user.rollNo,
        employeeId: user.employeeId,
        branch: user.branch,
        section: user.section,
        year: user.year,
        semester: user.semester,
        department: user.department,
        crType: user.crType,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id, newPassword } = req.body;

    if (!id || !newPassword) {
      return res.status(400).json({
        message: "ID and New Password are required",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let user;

    if (id.startsWith("24") || id.startsWith("25")) {
      user = await User.findOne({ rollNo: id });
    } else {
      user = await User.findOne({ employeeId: id });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.password = hashedPassword;
    user.isFirstLogin = false;

    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};