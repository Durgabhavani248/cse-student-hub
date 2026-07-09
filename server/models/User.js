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
    enum: ["student", "cr", "faculty", "hod"],
    default: "student",
  },

  crType: {
    type: String,
    enum: ["Boy", "Girl", null],
    default: null,
  },

  section: String,
  branch: String,
  year: Number,
  semester: Number,
  department: String,

  password: {
    type: String,
    required: true,
  },

  profileImage: String,

  isFirstLogin: {
    type: Boolean,
    default: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  fcmToken: String,

  lastNotificationTime: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },

  lastLogin: Date,
});

export default mongoose.model("User", UserSchema);