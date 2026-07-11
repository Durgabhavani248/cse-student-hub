import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    unique: true,
    sparse: true,
  },

  employeeId: {
    type: String,
    unique: true,
    sparse: true,
  },

  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    default: "",
  },

  role: {
    type: String,
    enum: ["student", "cr", "faculty", "hod", "admin"],
    default: "student",
  },

  crType: {
    type: String,
    enum: ["Boy", "Girl", null],
    default: null,
  },

  branch: {
    type: String,
    default: "",
  },

  section: {
    type: String,
    default: "",
  },

  year: {
    type: Number,
    default: null,
  },

  semester: {
    type: Number,
    default: null,
  },

  department: {
    type: String,
    default: "",
  },

  password: {
    type: String,
    required: true,
  },

  profileImage: {
    type: String,
    default: "",
  },

  isFirstLogin: {
    type: Boolean,
    default: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  fcmToken: {
    type: String,
    default: "",
  },

  lastNotificationTime: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },

  lastLogin: Date,
});

export default mongoose.model("User", UserSchema);