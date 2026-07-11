import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";

import axios from "axios";
import XLSX from "xlsx";
import { v2 as cloudinary } from "cloudinary";
import fileUpload from "express-fileupload";

import multer from "multer";
import path from "path";
import fs from "fs";

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";



//const serviceAccount = JSON.parse(
  //fs.readFileSync("./serviceAccountKey.json", "utf-8")
//);
const app = express();

// ============== MIDDLEWARE ==============
app.use(cors());
app.use(express.json({ limit: "50mb" }));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));
app.use(express.urlencoded({ limit: "50mb" }));
app.use(fileUpload());

// ============== DATABASE CONNECTION ==============
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected ✅"))
  .catch(err => console.error("MongoDB Error:", err));

// ============== CLOUDINARY CONFIG =============
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============== SCHEMAS ==============

const UserSchema = new mongoose.Schema({
  rollNo: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  section: { type: String, required: true },
  branch: { type: String, default: "CSE" },
  password: { type: String, required: true },
  isFirstLogin: { type: Boolean, default: true },
  isCR: { type: Boolean, default: false },
  fcmToken: String,
  lastNotificationTime: Date,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Faculty & HOD accounts. role="hod" gets full-branch access (all sections),
// role="faculty" is restricted to assignedSections only.
const FacultySchema = new mongoose.Schema({
  facultyId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  branch: { type: String, required: true },
  role: { type: String, enum: ["faculty", "hod"], default: "faculty" },
  assignedSections: [{ type: String }], // ignored for hod (full branch access)
  isFirstLogin: { type: Boolean, default: true },
  fcmToken: String,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const AttendanceSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  studentName: String,
  branch: { type: String, required: true },
  section: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  status: { type: String, enum: ["present", "absent"], required: true },
  markedBy: { type: String, required: true }, // facultyId
  createdAt: { type: Date, default: Date.now }
});

const NoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const NoteSchema = new mongoose.Schema({
  branch: { type: String, default: "CSE" },
  section: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: String,
  uploadedBy: String, // facultyId or rollNo (CR)
  createdAt: { type: Date, default: Date.now }
});

const AssignmentSchema = new mongoose.Schema({
  branch: { type: String, default: "CSE" },
  section: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: String,
  uploadedBy: String,
  createdAt: { type: Date, default: Date.now }
});

const PaperSchema = new mongoose.Schema({
  branch: { type: String, default: "CSE" },
  subject: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MaterialSchema = new mongoose.Schema({
  branch: { type: String, default: "CSE" },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});
const TimetableSchema = new mongoose.Schema({
  branch: { type: String, default: "CSE" },
  section: {
    type: String,
    required: true
  },

  timings: [{
    label: String,
    start: String,
    end: String,
    type: String
  }],

  schedule: {
    type: Object,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});
// branch+section together must be unique (not section alone, since section "A"
// exists in every branch now)
TimetableSchema.index({ branch: 1, section: 1 }, { unique: true });

// ============== MODELS ==============
const User = mongoose.model("User", UserSchema);
const Faculty = mongoose.model("Faculty", FacultySchema);
const Attendance = mongoose.model("Attendance", AttendanceSchema);
const Notice = mongoose.model("Notice", NoticeSchema);
const Note = mongoose.model("Note", NoteSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Paper = mongoose.model("Paper", PaperSchema);
const Material = mongoose.model("Material", MaterialSchema);
const Timetable = mongoose.model("Timetable", TimetableSchema);


// ============== MIDDLEWARE FUNCTIONS ==============

const adminMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Not authorized" });

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Verifies any valid token (student / faculty / hod / admin) and attaches
// the decoded payload to req.user. Used as a base for role checks below.
const verifyAnyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Student-only routes (change password, notifications, etc.)
const studentMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Students only" });
    next();
  });
};

// Faculty or HOD (both are stored in the Faculty collection)
const facultyMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    if (req.user.role !== "faculty" && req.user.role !== "hod") {
      return res.status(403).json({ message: "Faculty/HOD only" });
    }
    next();
  });
};

// HOD or Admin (branch-wide / global management actions)
const hodOrAdminMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    if (req.user.role !== "hod" && req.user.role !== "admin") {
      return res.status(403).json({ message: "HOD/Admin only" });
    }
    next();
  });
};

// Anyone who can upload content: CR (student flag), faculty, hod, admin
const uploaderMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    const u = req.user;
    const allowed = u.role === "faculty" || u.role === "hod" || u.role === "admin" || (u.role === "student" && u.isCR);
    if (!allowed) return res.status(403).json({ message: "Not authorized to upload" });
    next();
  });
};

// Given req.user (from a verified token) and a target { branch, section },
// returns true if that user is allowed to see/act on that branch+section.
function canAccess(user, branch, section) {
  if (user.role === "admin") return true;
  if (user.role === "hod") return user.branch === branch;
  if (user.role === "faculty") return user.branch === branch && (!section || (user.assignedSections || []).includes(section));
  if (user.role === "student") return user.branch === branch && (!section || user.section === section);
  return false;
}

// ============== AUTH ROUTES ==============

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "24h" });
      return res.json({ token, role: "admin" });
    }

    res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/student-login", async (req, res) => {
  try {
    const { rollNo, password, branch } = req.body;

    if (!rollNo || !password) {
      return res.status(400).json({ message: "Roll No and password required" });
    }

    const user = await User.findOne({ rollNo });

    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (branch && user.branch && branch !== user.branch) {
      return res.status(400).json({ message: `This roll number belongs to ${user.branch}. Please select the correct branch.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { rollNo, role: "student", branch: user.branch, section: user.section, isCR: user.isCR },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    await User.updateOne({ rollNo }, { lastLogin: new Date() });

    res.json({
      token,
      student: {
        rollNo: user.rollNo,
        name: user.name,
        section: user.section,
        branch: user.branch,
        isCR: user.isCR,
        isFirstLogin: user.isFirstLogin
      }
    });
  } catch (err) {
    console.error("Student login error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== FACULTY / HOD AUTH ==============

app.post("/api/faculty-login", async (req, res) => {
  try {
    const { facultyId, password } = req.body;

    if (!facultyId || !password) {
      return res.status(400).json({ message: "Faculty ID and password required" });
    }

    const faculty = await Faculty.findOne({ facultyId });
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        facultyId: faculty.facultyId,
        role: faculty.role, // "faculty" or "hod"
        branch: faculty.branch,
        assignedSections: faculty.assignedSections || []
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await Faculty.updateOne({ facultyId }, { lastLogin: new Date() });

    res.json({
      token,
      faculty: {
        facultyId: faculty.facultyId,
        name: faculty.name,
        branch: faculty.branch,
        role: faculty.role,
        assignedSections: faculty.assignedSections || [],
        isFirstLogin: faculty.isFirstLogin
      }
    });
  } catch (err) {
    console.error("Faculty login error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/faculty/change-password", async (req, res) => {
  try {
    const { facultyId, newPassword } = req.body;

    if (!facultyId || !newPassword) {
      return res.status(400).json({ message: "Faculty ID and new password required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await Faculty.updateOne(
      { facultyId },
      { password: hashedPassword, isFirstLogin: false }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Faculty change password error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin creates faculty/HOD accounts (default password, forced change on first login)
app.post("/api/admin/create-faculty", adminMiddleware, async (req, res) => {
  try {
    const { facultyId, name, branch, role, assignedSections } = req.body;

    if (!facultyId || !name || !branch) {
      return res.status(400).json({ message: "facultyId, name and branch are required" });
    }

    const existing = await Faculty.findOne({ facultyId });
    if (existing) {
      return res.status(400).json({ message: "Faculty ID already exists" });
    }

    if (role === "hod") {
      const existingHod = await Faculty.findOne({ branch, role: "hod" });
      if (existingHod) {
        return res.status(400).json({ message: `${branch} already has an HOD (${existingHod.facultyId})` });
      }
    }

    if (!process.env.DEFAULT_PASSWORD) {
      return res.status(500).json({ message: "Server misconfigured: DEFAULT_PASSWORD env var is not set" });
    }

    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD, 10);

    const faculty = await Faculty.create({
      facultyId: String(facultyId).trim(),
      name: String(name).trim(),
      branch: String(branch).trim(),
      role: role === "hod" ? "hod" : "faculty",
      assignedSections: role === "hod" ? [] : (assignedSections || []),
      password: hashedPassword
    });

    res.status(201).json({
      message: "Faculty account created",
      faculty: { facultyId: faculty.facultyId, name: faculty.name, branch: faculty.branch, role: faculty.role }
    });
  } catch (err) {
    console.error("Create faculty error:", err);
    res.status(500).json({ message: err.message });
  }
});

// List faculty (HOD sees own branch, Admin sees all)
app.get("/api/faculty", hodOrAdminMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === "hod" ? { branch: req.user.branch } : {};
    const faculty = await Faculty.find(filter).select("-password").sort({ name: 1 });
    res.json(faculty);
  } catch (err) {
    console.error("List faculty error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/student/change-password", studentMiddleware, async (req, res) => {
  try {
    const rollNo = req.user.rollNo;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await User.updateOne(
      { rollNo },
      { password: hashedPassword, isFirstLogin: false }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Password changed!" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/student/forgot-password", async (req, res) => {
  try {
    const { rollNo, name, section, newPassword } = req.body;

    if (!rollNo || !name || !section || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ rollNo, name, section });

    if (!user) {
      return res.status(404).json({ message: "Student details not matched!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ rollNo }, { password: hashedPassword, isFirstLogin: false });

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============== NOTICES ==============

app.get("/api/notices", async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error("Get notices error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notices", adminMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description required" });
    }

    const notice = new Notice({ title, description });
    await notice.save();
    const users = await User.find({
  fcmToken: { $exists: true, $ne: null }
});

const tokens = users
  .map(u => u.fcmToken)
  .filter(Boolean);

if (tokens.length > 0) {
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: title,
      body: description
    },
    webpush: {
      notification: {
        icon: "/icon-192.png"
      }
    }
  });
}
    res.json(notice);
  } catch (err) {
    console.error("Post notice error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notices/:id", adminMiddleware, async (req, res) => {
  try {
    await Notice.deleteOne({ _id: req.params.id });
    res.json({ message: "Notice deleted" });
  } catch (err) {
    console.error("Delete notice error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== NOTES ==============

app.get("/api/notes", verifyAnyToken, async (req, res) => {
  try {
    const u = req.user;
    let filter = {};
    if (u.role === "student") filter = { branch: u.branch, section: u.section };
    else if (u.role === "faculty") filter = { branch: u.branch, section: { $in: u.assignedSections || [] } };
    else if (u.role === "hod") filter = { branch: u.branch };
    // admin: no filter, sees everything

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error("Get notes error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notes", uploaderMiddleware, async (req, res) => {
  try {

    const {
      branch,
      section,
      subject,
      title,
      description,
      fileUrl
    } = req.body;

    if (!section || !subject || !title || !description) {
      return res.status(400).json({
        message: "All fields required"
      });
    }

    const targetBranch = branch || req.user.branch || "CSE";
    if (!canAccess(req.user, targetBranch, section)) {
      return res.status(403).json({ message: "You can only upload for your own branch/section" });
    }

    const note = await Note.create({
      branch: targetBranch,
      section,
      subject,
      title,
      description,
      fileUrl,
      uploadedBy: req.user.facultyId || req.user.rollNo
    });

    res.status(201).json(note);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message
    });
  }
});

app.delete("/api/notes/:id", uploaderMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (!canAccess(req.user, note.branch, note.section)) {
      return res.status(403).json({ message: "Not authorized to delete this note" });
    }

    await Note.findByIdAndDelete(req.params.id);

    res.json({
      message: "Note deleted successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message
    });
  }
});

app.get("/api/notes/test", (req, res) => {
  res.json({ message: "notes test works" });
});
// ============== ASSIGNMENTS ==============

app.get("/api/assignments", verifyAnyToken, async (req, res) => {
  try {
    const u = req.user;
    let filter = {};
    if (u.role === "student") filter = { branch: u.branch, section: u.section };
    else if (u.role === "faculty") filter = { branch: u.branch, section: { $in: u.assignedSections || [] } };
    else if (u.role === "hod") filter = { branch: u.branch };

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json({ assignments });
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/assignments", uploaderMiddleware, async (req, res) => {
  try {
    const {
  branch,
  section,
  subject,
  title,
  description,
  fileUrl,
} = req.body;
    

    if (!section || !subject || !title || !description) {
      return res.status(400).json({ message: "All fields required" });
    }

    const targetBranch = branch || req.user.branch || "CSE";
    if (!canAccess(req.user, targetBranch, section)) {
      return res.status(403).json({ message: "You can only upload for your own branch/section" });
    }

  const assignment = new Assignment({
  branch: targetBranch,
  section,
  subject,
  title,
  description,
  fileUrl,
  uploadedBy: req.user.facultyId || req.user.rollNo
});

    await assignment.save();

    res.json(assignment);

  } catch (err) {
    console.error("Post assignment error:", err);
    res.status(500).json({ message: err.message });
  }
});
app.delete("/api/assignments/:id", uploaderMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!canAccess(req.user, assignment.branch, assignment.section)) {
      return res.status(403).json({ message: "Not authorized to delete this assignment" });
    }
    await Assignment.deleteOne({ _id: req.params.id });
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ====================== PAPERS ======================

// Get all papers (branch-scoped; papers aren't section-specific)
app.get("/api/papers", verifyAnyToken, async (req, res) => {
  try {
    const u = req.user;
    const filter = u.role === "admin" ? {} : { branch: u.branch };
    const papers = await Paper.find(filter).sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    console.error("Get papers error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Add paper
app.post("/api/papers", uploaderMiddleware, async (req, res) => {
  try {
    const { branch, subject, title, fileUrl } = req.body;

    if (!subject || !title || !fileUrl) {
      return res.status(400).json({
        message: "Subject, title and fileUrl are required"
      });
    }

    const targetBranch = branch || req.user.branch || "CSE";
    if (!canAccess(req.user, targetBranch)) {
      return res.status(403).json({ message: "You can only upload for your own branch" });
    }

    const paper = new Paper({
      branch: targetBranch,
      subject,
      title,
      fileUrl
    });

    await paper.save();

    res.status(201).json(paper);

  } catch (err) {
    console.log("FULL ERROR");
    console.log(err);
    console.log(err.errors);

    res.status(500).json({
      message: err.message
    });
  }
});
app.delete("/api/papers/:id", uploaderMiddleware, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });
    if (!canAccess(req.user, paper.branch)) {
      return res.status(403).json({ message: "Not authorized to delete this paper" });
    }
    await Paper.findByIdAndDelete(req.params.id);

    res.json({
      message: "Paper deleted successfully",
    });
  } catch (err) {
    console.error("Delete paper error:", err);
    res.status(500).json({
      message: err.message,
    });
  }
});
// ============== STUDY MATERIALS ==============

app.get("/api/materials", verifyAnyToken, async (req, res) => {
  try {
    const u = req.user;
    const filter = u.role === "admin" ? {} : { branch: u.branch };
    const materials = await Material.find(filter).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/materials", uploaderMiddleware, async (req, res) => {
  try {
    const { branch, subject, title, fileUrl } = req.body;

    if (!subject || !title || !fileUrl) {
      return res.status(400).json({
        message: "Subject, title and fileUrl are required"
      });
    }

    const targetBranch = branch || req.user.branch || "CSE";
    if (!canAccess(req.user, targetBranch)) {
      return res.status(403).json({ message: "You can only upload for your own branch" });
    }

    const material = await Material.create({
      branch: targetBranch,
      subject,
      title,
      fileUrl
    });

    res.status(201).json(material);

  } catch (err) {
    console.error("Post material error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/materials/:id", uploaderMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });
    if (!canAccess(req.user, material.branch)) {
      return res.status(403).json({ message: "Not authorized to delete this material" });
    }
    await Material.deleteOne({ _id: req.params.id });
    res.json({ message: "Material deleted" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== TIMETABLE ==============

app.get("/api/timetable/:branch/:section", verifyAnyToken, async (req, res) => {
  try {
    const { branch, section } = req.params;
    if (!canAccess(req.user, branch, section)) {
      return res.status(403).json({ message: "Not authorized for this branch/section" });
    }

    const timetable = await Timetable.findOne({ branch, section }).lean();

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json({
      branch: timetable.branch,
      section: timetable.section,
      timings: timetable.timings || [],
      schedule: timetable.schedule || {}
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Old URL kept working for existing CSE-only clients during rollout (defaults to branch=CSE)
app.get("/api/timetable/:section", verifyAnyToken, async (req, res) => {
  try {
    const branch = req.user.branch || "CSE";
    const { section } = req.params;
    if (!canAccess(req.user, branch, section)) {
      return res.status(403).json({ message: "Not authorized for this branch/section" });
    }
    const timetable = await Timetable.findOne({ branch, section }).lean();
    if (!timetable) return res.status(404).json({ message: "Timetable not found" });
    res.json({ branch: timetable.branch, section: timetable.section, timings: timetable.timings || [], schedule: timetable.schedule || {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Create/update timetable — HOD (own branch) or Admin
app.post("/api/timetable", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch, section, timings, schedule } = req.body;
    if (!branch || !section || !schedule) {
      return res.status(400).json({ message: "branch, section and schedule are required" });
    }
    if (!canAccess(req.user, branch)) {
      return res.status(403).json({ message: "You can only manage your own branch's timetable" });
    }

    const timetable = await Timetable.findOneAndUpdate(
      { branch, section },
      { branch, section, timings: timings || [], schedule },
      { upsert: true, new: true }
    );

    res.status(201).json(timetable);
  } catch (err) {
    console.error("Save timetable error:", err);
    res.status(500).json({ message: err.message });
  }
});
// ============== ATTENDANCE ==============

// Faculty/HOD marks attendance for a whole section, one subject, one date.
// body: { branch, section, subject, date, records: [{ rollNo, status }] }
app.post("/api/attendance/mark", facultyMiddleware, async (req, res) => {
  try {
    const { branch, section, subject, date, records } = req.body;

    if (!branch || !section || !subject || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "branch, section, subject, date and records[] are required" });
    }

    if (!canAccess(req.user, branch, section)) {
      return res.status(403).json({ message: "You are not assigned to this section" });
    }

    const ops = [];
    for (const r of records) {
      if (!r.rollNo || !r.status) continue;
      const student = await User.findOne({ rollNo: r.rollNo });
      ops.push({
        updateOne: {
          filter: { rollNo: r.rollNo, subject, date },
          update: {
            rollNo: r.rollNo,
            studentName: student?.name || "",
            branch,
            section,
            subject,
            date,
            status: r.status,
            markedBy: req.user.facultyId
          },
          upsert: true
        }
      });
    }

    if (ops.length > 0) await Attendance.bulkWrite(ops);

    res.json({ message: `Attendance marked for ${ops.length} students` });
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Faculty/HOD viewing a section's attendance for a date+subject
app.get("/api/attendance/section/:branch/:section", facultyMiddleware, async (req, res) => {
  try {
    const { branch, section } = req.params;
    const { subject, date } = req.query;

    if (!canAccess(req.user, branch, section)) {
      return res.status(403).json({ message: "You are not assigned to this section" });
    }

    const filter = { branch, section };
    if (subject) filter.subject = subject;
    if (date) filter.date = date;

    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error("Get section attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Student viewing their own attendance
app.get("/api/attendance/my", studentMiddleware, async (req, res) => {
  try {
    const records = await Attendance.find({ rollNo: req.user.rollNo }).sort({ date: -1 });

    const totalClasses = records.length;
    const present = records.filter(r => r.status === "present").length;
    const percentage = totalClasses > 0 ? ((present / totalClasses) * 100).toFixed(1) : "0.0";

    res.json({ records, summary: { totalClasses, present, percentage } });
  } catch (err) {
    console.error("Get my attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== CHATBOT ==============

   
    
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing");
      return res.status(500).json({ message: "Chat service not configured" });
    }

    console.log("Chat request:", message);

    const fullText = `You are a helpful NRI Institute CSE student assistant. Answer questions about DBMS, OS, CN, DS, and other CSE subjects. Be helpful and concise. Answer in English only.\n\nQuestion: ${message}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: fullText
              }
            ]
          }
        ]
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    console.log("Gemini response received");

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Invalid response:", response.data);
      return res.status(500).json({ message: "Invalid response from AI" });
    }

    const reply = response.data.candidates[0].content.parts[0].text;
    console.log("Reply:", reply.substring(0, 50) + "...");

    res.json({ reply });

  } catch (err) {
    console.error("Chat Error:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });

    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ message: "Request timeout. Try again." });
    }

    if (err.response?.status === 400) {
      return res.status(400).json({ message: "Invalid message format" });
    }

    if (err.response?.status === 401 || err.response?.status === 403) {
      return res.status(500).json({ message: "Authentication failed" });
    }

    if (err.response?.status === 429) {
      return res.status(429).json({ message: "Rate limited. Try again later." });
    }

    res.status(500).json({ message: "Error: " + (err.response?.data?.error?.message || err.message) });
  }
});
// ============== UPLOAD STUDENTS ==============

app.post("/api/admin/upload-students", adminMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!process.env.DEFAULT_PASSWORD) {
      return res.status(500).json({ message: "Server misconfigured: DEFAULT_PASSWORD env var is not set" });
    }

    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    let added = 0, skipped = 0;

    for (const row of data) {
      const existing = await User.findOne({ rollNo: row.rollNo });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD, 10);
        await User.create({
          rollNo: String(row.rollNo).trim(),
          name: String(row.name).trim(),
          section: String(row.section).trim(),
          branch: String(row.branch || "CSE").trim(),
          password: hashedPassword
        });
        added++;
      } else {
        skipped++;
      }
    }

    res.json({ message: `✅ Added: ${added} ⏭️ Skipped: ${skipped}` });
  } catch (err) {
    console.error("Upload students error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Bulk faculty/HOD upload via Excel — same pattern as student upload.
// Excel columns: facultyId, name, branch, role (faculty/hod), sections (comma-separated, e.g. "A,B")
app.post("/api/admin/upload-faculty", adminMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!process.env.DEFAULT_PASSWORD) {
      return res.status(500).json({ message: "Server misconfigured: DEFAULT_PASSWORD env var is not set" });
    }

    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    let added = 0, skipped = 0;
    const skippedReasons = [];

    for (const row of data) {
      const facultyId = String(row.facultyId || "").trim();
      const name = String(row.name || "").trim();
      const branch = String(row.branch || "").trim();
      const role = String(row.role || "faculty").trim().toLowerCase() === "hod" ? "hod" : "faculty";
      const sections = String(row.sections || "").split(",").map(s => s.trim()).filter(Boolean);

      if (!facultyId || !name || !branch) {
        skipped++;
        skippedReasons.push(`Row skipped (missing facultyId/name/branch): ${JSON.stringify(row)}`);
        continue;
      }

      const existing = await Faculty.findOne({ facultyId });
      if (existing) {
        skipped++;
        skippedReasons.push(`${facultyId} already exists`);
        continue;
      }

      if (role === "hod") {
        const existingHod = await Faculty.findOne({ branch, role: "hod" });
        if (existingHod) {
          skipped++;
          skippedReasons.push(`${branch} already has an HOD (${existingHod.facultyId}), skipped ${facultyId}`);
          continue;
        }
      }

      const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD, 10);
      await Faculty.create({
        facultyId,
        name,
        branch,
        role,
        assignedSections: role === "hod" ? [] : sections,
        password: hashedPassword
      });
      added++;
    }

    res.json({
      message: `✅ Added: ${added} ⏭️ Skipped: ${skipped}`,
      skippedReasons
    });
  } catch (err) {
    console.error("Upload faculty error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== PROFILE ==============

app.get("/api/profile/:rollNo", verifyAnyToken, async (req, res) => {
  try {
    const user = await User.findOne({ rollNo: req.params.rollNo }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const u = req.user;
    const isSelf = u.role === "student" && u.rollNo === user.rollNo;
    if (!isSelf && !canAccess(u, user.branch, user.section)) {
      return res.status(403).json({ message: "Not authorized to view this profile" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== FILE UPLOAD ==============

app.post("/api/upload", uploaderMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const file = req.files.file;

    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        resource_type: "auto",
        folder: "nri-hub",
        timeout: 60000
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ message: "Upload failed: " + error.message });
        }
        res.json({ url: result.secure_url });
      }
    );

    uploadStream.end(file.data);
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== NOTIFICATION SUBSCRIPTION ==============

app.post("/api/notifications/subscribe", async (req, res) => {
  try {
    const { token, rollNo, name } = req.body;

    if (!token || !rollNo) {
      return res.status(400).json({ message: "Token and rollNo required" });
    }

    const result = await User.findOneAndUpdate(
      { rollNo },
      { 
        fcmToken: token,
        lastNotificationTime: new Date()
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "Subscribed to notifications" });
  } catch (err) {
    console.error("Subscribe notification error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notifications/send", adminMiddleware, async (req, res) => {
  try {
    const { rollNo, title, body, type } = req.body;

    if (!rollNo || !title || !body) {
      return res.status(400).json({ message: "rollNo, title, and body required" });
    }

    const user = await User.findOne({ rollNo });
    if (!user || !user.fcmToken) {
      return res.status(404).json({ message: "User not found or no FCM token" });
    }

    res.json({ success: true, message: "Notification sent" });
  } catch (err) {
    console.error("Send notification error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notifications/broadcast", adminMiddleware, async (req, res) => {
  try {
    const { section, title, body, type } = req.body;

    if (!section || !title || !body) {
      return res.status(400).json({ message: "section, title, and body required" });
    }

    const users = await User.find({ section, fcmToken: { $exists: true } });

    if (users.length === 0) {
      return res.json({ message: "No users to notify in this section" });
    }

    const tokens = users
  .map(user => user.fcmToken)
  .filter(Boolean);

await admin.messaging().sendEachForMulticast({
  tokens,
  notification: {
    title,
    body
  },
  webpush: {
    notification: {
      icon: "/icon-192.png"
    }
  }
});

res.json({
  success: true,
  message: `Notification sent to ${tokens.length} students`
});
  } catch (err) {
    console.error("Broadcast notification error:", err);
    res.status(500).json({ message: err.message });
  }
});


// ============== ADMIN STATS ==============

app.get("/api/admin/stats", adminMiddleware, async (req, res) => {
  try {

    const totalStudents = await User.countDocuments();
    const totalNotices = await Notice.countDocuments();
    const totalNotes = await Note.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalPapers = await Paper.countDocuments();
    const totalMaterials = await Material.countDocuments();

    const everLoggedIn = await User.countDocuments({
      lastLogin: { $exists: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeToday = await User.countDocuments({
      lastLogin: { $gte: today }
    });

    const week = new Date();
    week.setDate(week.getDate() - 7);

    const activeThisWeek = await User.countDocuments({
      lastLogin: { $gte: week }
    });

    const sectionCounts = await User.aggregate([
      {
        $group: {
          _id: "$section",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      totalStudents,
      totalNotices,
      totalNotes,
      totalAssignments,
      totalPapers,
      totalMaterials,
      everLoggedIn,
      activeToday,
      activeThisWeek,
      sectionCounts
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message
    });
  }
});


// ============== HOD STATS (branch-scoped) ==============

app.get("/api/hod/stats", hodOrAdminMiddleware, async (req, res) => {
  try {
    const branchFilter = req.user.role === "hod" ? { branch: req.user.branch } : {};

    const totalStudents = await User.countDocuments(branchFilter);
    const totalFaculty = await Faculty.countDocuments({ ...branchFilter, role: "faculty" });
    const totalNotes = await Note.countDocuments(branchFilter);
    const totalAssignments = await Assignment.countDocuments(branchFilter);
    const totalPapers = await Paper.countDocuments(branchFilter);
    const totalMaterials = await Material.countDocuments(branchFilter);

    const sectionCounts = await User.aggregate([
      { $match: branchFilter },
      { $group: { _id: "$section", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      branch: req.user.role === "hod" ? req.user.branch : "ALL",
      totalStudents,
      totalFaculty,
      totalNotes,
      totalAssignments,
      totalPapers,
      totalMaterials,
      sectionCounts
    });
  } catch (err) {
    console.error("HOD stats error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== TEMP DEBUG (remove after fixing password issue) ==============
app.get("/api/admin/debug-default-password", adminMiddleware, async (req, res) => {
  const val = process.env.DEFAULT_PASSWORD;
  res.json({
    exists: val !== undefined,
    length: val ? val.length : 0,
    value_json: JSON.stringify(val), // shows exact chars including hidden spaces
    charCodes: val ? [...val].map(c => c.charCodeAt(0)) : []
  });
});

// ============== HEALTH CHECK ==============

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date()
  });
});
app.get("/api/test123", (req, res) => {
  res.json({ message: "working" });
});


// ============== ERROR HANDLING ==============

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    message: "Internal server error"
  });
});


// ============== START SERVER ==============

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server running on ${PORT} 🚀`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
});