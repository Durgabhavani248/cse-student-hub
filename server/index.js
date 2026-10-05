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
import pdfParse from "pdf-parse";

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

import dotenv from "dotenv";
dotenv.config({
  path: new URL("./.env", import.meta.url)
});

console.log("MONGO_URI loaded:", !!process.env.MONGO_URI);


import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Firebase Admin init — service account JSON is stored as a single env var
// (FIREBASE_SERVICE_ACCOUNT) rather than a file, since Render doesn't support
// uploading files. This never crashes the server even if misconfigured —
// push notifications just silently no-op, everything else keeps working.
let firebaseReady = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
    firebaseReady = true;
    console.log("✅ Firebase Admin initialized");
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT env var not set — push notifications disabled");
  }
} catch (err) {
  console.error("❌ Firebase Admin init failed:", err.message);
}

// Sends a push notification to all matching users' fcmTokens. Never throws —
// logs and returns silently if Firebase isn't configured or the send fails,
// so callers can fire-and-forget this after saving content.
async function notifyUsers(filter, title, body) {
  if (!firebaseReady) return;
  try {
    const users = await User.find({ ...filter, fcmToken: { $exists: true, $ne: null } }).select("fcmToken");
    const tokens = users.map(u => u.fcmToken).filter(Boolean);
    if (tokens.length === 0) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { notification: { icon: "/icon-192.png" } }
    });
  } catch (err) {
    console.error("notifyUsers error:", err.message);
  }
}

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



const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO_URI is not configured.");
  process.exit(1);
}

// Direct Atlas connection.
// mongodb+srv DNS lookup is currently failing in Node.js,
// while the individual Atlas hosts are reachable.
const directMongoUri = mongoUri.replace(
  /^mongodb\+srv:\/\/([^@]+)@[^/]+\/([^?]+)(\?.*)?$/,
  "mongodb://$1@ac-nnforld-shard-00-00.wvgiihe.mongodb.net:27017,ac-nnforld-shard-00-01.wvgiihe.mongodb.net:27017,ac-nnforld-shard-00-02.wvgiihe.mongodb.net:27017/$2?ssl=true&replicaSet=atlas-14gm3n-shard-0&authSource=admin&retryWrites=true&w=majority"
);

mongoose.connect(directMongoUri)

  .then(() => console.log("✅ MongoDB Connected ✅"))

  .catch(err => console.error("MongoDB Error:", err));

// ============== CLOUDINARY CONFIG =============

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
  branch: { type: String, default: null }, // null = visible to everyone; set = that branch only

pdfUrl: { type: String, default: null },
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
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
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
  section: { type: String, required: true },
  timings: [{
    label: String,
    start: String,
    end: String,
    type: String
  }],
  schedule: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});
// branch+section together must be unique (not section alone, since section "A"
// exists in every branch now)
TimetableSchema.index({ branch: 1, section: 1 }, { unique: true });

// ==================== LMS EXAM SCHEMAS ====================

// Exam Schema
const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  subject: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  instructions: {
    type: String,
    default: ""
  },

  branch: {
    type: String,
    required: true,
    trim: true
  },

  sections: [
    {
      section: {
        type: String,
        required: true,
        trim: true
      },

      startAt: {
        type: Date,
        required: true
      },

      endAt: {
        type: Date,
        required: true
      }
    }
  ],

  durationMinutes: {
    type: Number,
    required: true,
    min: 1
  },

  questions: [
    {
      question: {
        type: String,
        required: true
      },

      type: {
        type: String,
        enum: ["mcq", "true-false"],
        required: true
      },

      options: {
        type: [String],
        default: []
      },

      correctAnswer: {
        type: String,
        required: true
      },

      marks: {
        type: Number,
        required: true,
        min: 0
      },

      negativeMarks: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  ],

  totalMarks: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft"
  },

  createdBy: {
    role: {
      type: String,
      required: true
    },

    id: {
      type: String,
      required: true
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },
  questionPdfUrl: {
  type: String,
  default: ""
},

answerKeyPdfUrl: {
  type: String,
  default: ""
},
});


// Exam Attempt Schema
const ExamAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true
  },

  branch: {
    type: String,
    required: true
  },

  section: {
    type: String,
    required: true
  },

  startedAt: {
    type: Date,
    required: true
  },

  submittedAt: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ["in-progress", "submitted", "auto-submitted"],
    default: "in-progress"
  },

  tabSwitchCount: {
    type: Number,
    default: 0
  },

  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },

      answer: {
        type: String,
        default: ""
      }
    }
  ],

  score: {
    type: Number,
    default: 0
  },

  totalMarks: {
    type: Number,
    default: 0
  },

  percentage: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});


// One student can attempt one exam only once
ExamAttemptSchema.index(
  {
    studentId: 1,
    examId: 1
  },
  {
    unique: true
  }
);


// Models
const Exam = mongoose.model("Exam", ExamSchema);
const ExamAttempt = mongoose.model("ExamAttempt", ExamAttemptSchema);

// ============== MODELS ==============
// ==================== CODING PLATFORM SCHEMAS ====================

// Coding Problem Bank
const CodingProblemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    topic: {
      type: String,
      required: true,
      trim: true
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    inputFormat: {
      type: String,
      default: ""
    },

    outputFormat: {
      type: String,
      default: ""
    },

    constraints: {
      type: String,
      default: ""
    },

    examples: [
      {
        input: {
          type: String,
          default: ""
        },

        output: {
          type: String,
          default: ""
        },

        explanation: {
          type: String,
          default: ""
        }
      }
    ],

    supportedLanguages: {
      type: [String],
      default: ["C", "C++", "Java", "Python"]
    },

    marks: {
      type: Number,
      default: 10,
      min: 0
    },

    timeLimit: {
      type: Number,
      default: 2,
      min: 1
    },

    memoryLimit: {
      type: Number,
      default: 128,
      min: 1
    },

    // Hidden test cases will be used later
    // by the secure code execution system.
    testCases: [
      {
        input: {
          type: String,
          default: ""
        },

        expectedOutput: {
          type: String,
          default: ""
        }
      }
    ],

    active: {
      type: Boolean,
      default: true
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Indexes for fast filtering/pagination
CodingProblemSchema.index({
  topic: 1,
  difficulty: 1,
  active: 1
});

CodingProblemSchema.index({
  active: 1,
  createdAt: -1
});


// Student coding progress
const CodingProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    solvedProblems: [
      {
        problemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CodingProblem",
          required: true
        },

        solvedAt: {
          type: Date,
          default: Date.now
        },

        language: {
          type: String,
          default: ""
        },

        score: {
          type: Number,
          default: 0
        }
      }
    ],

    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },

    longestStreak: {
      type: Number,
      default: 0,
      min: 0
    },

    lastChallengeDate: {
      type: String,
      default: null
    },

    totalChallengesSolved: {
      type: Number,
      default: 0,
      min: 0
    },

    xp: {
      type: Number,
      default: 0,
      min: 0
    },

    level: {
      type: Number,
      default: 1,
      min: 1
    },

    badges: {
      type: [String],
      default: []
    },

    dailyChallengeHistory: [
      {
        date: {
          type: String,
          required: true
        },

        problemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CodingProblem",
          required: true
        }
      }
    ],

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// One coding-progress document per student
CodingProgressSchema.index(
  {
    studentId: 1
  },
  {
    unique: true
  }
);
const User = mongoose.model("User", UserSchema);
const Faculty = mongoose.model("Faculty", FacultySchema);
const Attendance = mongoose.model("Attendance", AttendanceSchema);
const Notice = mongoose.model("Notice", NoticeSchema);
const Note = mongoose.model("Note", NoteSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Paper = mongoose.model("Paper", PaperSchema);
const Material = mongoose.model("Material", MaterialSchema);
const Timetable = mongoose.model("Timetable", TimetableSchema);
const CodingProblem = mongoose.model(
  "CodingProblem",
  CodingProblemSchema
);

const CodingProgress = mongoose.model(
  "CodingProgress",
  CodingProgressSchema
);
// ==================== DAILY CHALLENGE ====================

const DailyChallengeAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    challengeDate: {
      type: String,
      required: true
    },

    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodingProblem",
      required: true
    },

    branch: {
      type: String,
      default: ""
    },

    section: {
      type: String,
      default: ""
    },

    startedAt: {
      type: Date,
      required: true
    },

    submittedAt: {
      type: Date,
      default: null
    },

    completionTimeMs: {
      type: Number,
      default: null
    },

    language: {
      type: String,
      default: ""
    },

    verdict: {
      type: String,
      enum: [
        "Not Attempted",
        "Wrong Answer",
        "Runtime Error",
        "Compilation Error",
        "Time Limit Exceeded",
        "Accepted"
      ],
      default: "Not Attempted"
    },

    xpEarned: {
      type: Number,
      default: 0
    },

    completed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);


// One daily challenge attempt per student per day
DailyChallengeAttemptSchema.index(
  {
    studentId: 1,
    challengeDate: 1
  },
  {
    unique: true
  }
);

const DailyChallengeAttempt =
  mongoose.model(
    "DailyChallengeAttempt",
    DailyChallengeAttemptSchema
  );
  

// ============== MIDDLEWARE FUNCTIONS ==============

// Attaches req.user if a valid token is present; never rejects the request.
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch (err) {
    // invalid/expired token — just treat as logged-out
  }
  next();
};

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

const studentMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Students only" });
    next();
  });
};

const facultyMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    if (req.user.role !== "faculty" && req.user.role !== "hod") {
      return res.status(403).json({ message: "Faculty/HOD only" });
    }
    next();
  });
};

const hodOrAdminMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    if (req.user.role !== "hod" && req.user.role !== "admin") {
      return res.status(403).json({ message: "HOD/Admin only" });
    }
    next();
  });
};

const uploaderMiddleware = (req, res, next) => {
  verifyAnyToken(req, res, () => {
    const u = req.user;
    const allowed = u.role === "faculty" || u.role === "hod" || u.role === "admin" || (u.role === "student" && u.isCR);
    if (!allowed) return res.status(403).json({ message: "Not authorized to upload" });
    next();
  });
};

function canAccess(user, branch, section) {
  if (user.role === "admin") return true;
  if (user.role === "hod") return user.branch === branch;
  if (user.role === "faculty") return user.branch === branch && (!section || (user.assignedSections || []).includes(section));
  if (user.role === "student") return user.branch === branch && (!section || user.section === section);
  return false;
}

function canViewTimetable(user, branch, section) {
  if (user.role === "admin") return true;
  if (user.role === "hod") return user.branch === branch;
  if (user.role === "faculty") return user.branch === branch;
  if (user.role === "student") return user.branch === branch && (!section || user.section === section);
  return false;
}

// ============== AUTH ROUTES ==============

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ 
      username,
      role: "admin"  // ✅ ADD THIS
    }, process.env.JWT_SECRET);
    return res.json({ token });
  }
  
  res.status(401).json({ message: "Invalid credentials" });
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


app.post("/api/faculty/forgot-password", async (req, res) => {
  try {
    const { facultyId, name, newPassword } = req.body;

    if (!facultyId || !name || !newPassword) {
      return res.status(400).json({
        message: "Faculty ID, Name and New Password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const faculty = await Faculty.findOne({
      facultyId: facultyId.trim(),
      name: name.trim()
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty details not matched!"
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await Faculty.updateOne(
      { facultyId: facultyId.trim() },
      {
        password: hashedPassword,
        isFirstLogin: false
      }
    );

    res.json({
      message: "Password reset successful!"
    });

  } catch (err) {
    console.error(
      "Faculty forgot password error:",
      err
    );

    res.status(500).json({
      message: "Server error"
    });
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

// ==================== LMS PDF PARSER HELPERS ====================

function parseQuestionPdfText(text) {
  const cleanedText = String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!cleanedText) {
    throw new Error("Questions PDF is empty or could not be read.");
  }

  const questionRegex =
    /(?:^|\n)\s*(\d+)[.)]\s*(.*?)(?=\n\s*\d+[.)]\s*|\s*$)/gs;

  const questions = [];
  let match;

  while ((match = questionRegex.exec(cleanedText)) !== null) {
    const questionNumber = Number(match[1]);
    const block = match[2].trim();

    const optionMatches = [
      ...block.matchAll(
        /(?:^|\n)\s*([A-D])[.)]\s*(.*?)(?=\n\s*[A-D][.)]\s*|\s*$)/g
      )
    ];

    const questionText = block
      .split(/\n\s*[A-D][.)]\s*/)[0]
      .trim();

    if (!questionText) {
      throw new Error(
        `Question ${questionNumber} does not contain question text.`
      );
    }

    if (optionMatches.length === 4) {
      const options = optionMatches.map(m => m[2].trim());

      if (options.some(option => !option)) {
        throw new Error(
          `Question ${questionNumber} has an empty option.`
        );
      }

      questions.push({
        question: questionText,
        type: "mcq",
        options,
        questionNumber
      });

    } else {
      const normalized = questionText.toLowerCase();

      if (
        normalized.endsWith("true or false?") ||
        normalized.includes("true or false")
      ) {
        questions.push({
          question: questionText,
          type: "true-false",
          options: ["True", "False"],
          questionNumber
        });
      } else {
        throw new Error(
          `Question ${questionNumber} must contain four options A-D or be a True/False question.`
        );
      }
    }
  }

  if (!questions.length) {
    throw new Error(
      "No questions were detected in the Questions PDF."
    );
  }

  return questions;
}


function parseAnswerKeyPdfText(text) {
  const cleanedText = String(text || "")
    .replace(/\r/g, "")
    .trim();

  if (!cleanedText) {
    throw new Error("Answer Key PDF is empty or could not be read.");
  }

  const answerRegex =
    /(?:^|\n)\s*(\d+)\s*(?:[-.):]|->)\s*(A|B|C|D|TRUE|FALSE)\b/gi;

  const answers = new Map();

  let match;

  while ((match = answerRegex.exec(cleanedText)) !== null) {
    const questionNumber = Number(match[1]);
    const answer = match[2].toUpperCase();

    answers.set(questionNumber, answer);
  }

  if (!answers.size) {
    throw new Error(
      "No valid answers were detected in the Answer Key PDF."
    );
  }

  return answers;
}


function buildExamQuestions(
  questionText,
  answerText,
  marksPerQuestion,
  negativeMarks
) {
  const parsedQuestions = parseQuestionPdfText(questionText);
  const answerKey = parseAnswerKeyPdfText(answerText);

  const questions = [];

  for (const item of parsedQuestions) {
    const answer = answerKey.get(item.questionNumber);

    if (!answer) {
      throw new Error(
        `Missing answer key for question ${item.questionNumber}.`
      );
    }

    let correctAnswer;

    if (item.type === "mcq") {
      const answerIndex = {
        A: 0,
        B: 1,
        C: 2,
        D: 3
      }[answer];

      if (answerIndex === undefined) {
        throw new Error(
          `Invalid MCQ answer for question ${item.questionNumber}.`
        );
      }

      correctAnswer = item.options[answerIndex];

      if (!correctAnswer) {
        throw new Error(
          `Answer key for question ${item.questionNumber} points to a missing option.`
        );
      }
    } else {
      if (answer !== "TRUE" && answer !== "FALSE") {
        throw new Error(
          `Question ${item.questionNumber} is True/False but answer key is ${answer}.`
        );
      }

      correctAnswer = answer === "TRUE" ? "True" : "False";
    }

    questions.push({
      question: item.question,
      type: item.type,
      options: item.options,
      correctAnswer,
      marks: Number(marksPerQuestion),
      negativeMarks: Number(negativeMarks)
    });
  }

  for (const questionNumber of answerKey.keys()) {
    const exists = parsedQuestions.some(
      q => q.questionNumber === questionNumber
    );

    if (!exists) {
      throw new Error(
        `Answer key contains question ${questionNumber}, but that question is missing from the Questions PDF.`
      );
    }
  }

  return questions;
}


async function uploadExamPdfToCloudinary(filePath, publicId) {
  if (!filePath) return "";

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "image",
    public_id: publicId
  });

  return result.secure_url;
}

// =========================================================
// CODING PROBLEM BANK
// =========================================================

app.get(
  "/api/lms/coding/problems",
  verifyAnyToken,
  async (req, res) => {
    try {
      const role = req.user?.role;

      // Students and CRs can practice coding problems.
      // CR token has role = "student", so CRs are included.
      if (role !== "student") {
        return res.status(403).json({
          message: "Only students can access coding problems"
        });
      }

      // -----------------------------
      // PAGINATION
      // -----------------------------
      let page = Number.parseInt(req.query.page, 10) || 1;
      let limit = Number.parseInt(req.query.limit, 10) || 12;

      if (page < 1) {
        page = 1;
      }

      // Protect free-tier resources
      if (limit < 1) {
        limit = 12;
      }

      if (limit > 20) {
        limit = 20;
      }

      const skip = (page - 1) * limit;

      // -----------------------------
      // FILTERS
      // -----------------------------
      const { topic, difficulty, search } = req.query;

           const filter = {
        active: { $ne: false }
      };

      if (topic && String(topic).trim()) {
        filter.topic = String(topic).trim();
      }

      if (difficulty && String(difficulty).trim()) {
        const allowedDifficulties = [
          "Easy",
          "Medium",
          "Hard"
        ];

        if (
          !allowedDifficulties.includes(
            String(difficulty).trim()
          )
        ) {
          return res.status(400).json({
            message:
              "Difficulty must be Easy, Medium or Hard"
          });
        }

        filter.difficulty = String(difficulty).trim();
      }

      // -----------------------------
      // SEARCH
      // -----------------------------
      if (search && String(search).trim()) {
        const searchText = String(search).trim();

        filter.$or = [
          {
            title: {
              $regex: searchText,
              $options: "i"
            }
          },
          {
            topic: {
              $regex: searchText,
              $options: "i"
            }
          },
          {
            description: {
              $regex: searchText,
              $options: "i"
            }
          }
        ];
      }

      // -----------------------------
      // FETCH
      // -----------------------------
      const [problems, total] = await Promise.all([
        CodingProblem.find(filter)
          .select(
            "-testCases"
          )
          .sort({
            createdAt: -1,
            _id: 1
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        CodingProblem.countDocuments(filter)
      ]);

      const totalPages =
        total === 0
          ? 0
          : Math.ceil(total / limit);

      return res.json({
        problems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage:
            page < totalPages,
          hasPreviousPage:
            page > 1
        }
      });

    } catch (err) {
      console.error(
        "Coding problem bank error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to fetch coding problems",
        error: err.message
      });
    }
  }
);


// =========================================================
// CODING PROBLEM DETAILS
// =========================================================

app.get(
  "/api/lms/coding/problems/:problemId",
  verifyAnyToken,
  async (req, res) => {
    try {
      const role = req.user?.role;

      if (role !== "student") {
        return res.status(403).json({
          message:
            "Only students can access coding problems"
        });
      }

      const problem =
              await CodingProblem.findOne({
          _id: req.params.problemId,
          active: { $ne: false }
        })
          .select("-testCases")
          .lean();

      if (!problem) {
        return res.status(404).json({
          message:
            "Coding problem not found"
        });
      }

      return res.json({
        problem
      });

    } catch (err) {
      console.error(
        "Coding problem details error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to fetch coding problem",
        error: err.message
      });
    }
  }
);

// =========================================================
// CODING CODE EXECUTION - JUDGE0 CE
// =========================================================

const CODING_LANGUAGES = {
  Python: 71,
  Cpp: 54,
  Java: 62
};

const normalizeCodingOutput = (value) => {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
};

const executeOnJudge0 = async ({
  languageId,
  code,
  stdin = "",
  expectedOutput = null
}) => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const payload = {
      source_code: String(code),
      language_id: Number(languageId),
      stdin: String(stdin || ""),
      cpu_time_limit: 5,
      wall_time_limit: 10,
      memory_limit: 128000
    };

    if (expectedOutput !== null) {
      payload.expected_output = String(expectedOutput);
    }

    const response = await fetch(
      "https://ce.judge0.com/submissions?wait=true&base64_encoded=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "Judge0 HTTP error:",
        response.status,
        responseText
      );

      throw new Error(
        "Code execution service is temporarily unavailable."
      );
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(
        "Judge0 invalid JSON response:",
        responseText
      );

      throw new Error(
        "Invalid response from code execution service."
      );
    }

    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      compileOutput: result.compile_output || "",
      message: result.message || "",
      statusId:
        result.status?.id ??
        null,
      statusDescription:
        result.status?.description ||
        ""
    };

  } finally {
    clearTimeout(timeout);
  }
};


// ==================== RUN WITH CUSTOM INPUT ====================

app.post(
  "/api/lms/coding/run",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user?.role !== "student") {
        return res.status(403).json({
          message: "Only students can run code"
        });
      }

      const {
        language,
        code,
        stdin = ""
      } = req.body;

      if (
        !language ||
        !code ||
        !String(code).trim()
      ) {
        return res.status(400).json({
          message:
            "Language and code are required"
        });
      }

      const languageId =
        CODING_LANGUAGES[
          String(language).trim()
        ];

      if (!languageId) {
        return res.status(400).json({
          message:
            `${language} execution is not enabled yet.`
        });
      }

      if (String(code).length > 50000) {
        return res.status(400).json({
          message:
            "Code is too large. Maximum 50,000 characters allowed."
        });
      }

      if (String(stdin).length > 10000) {
        return res.status(400).json({
          message:
            "Input is too large. Maximum 10,000 characters allowed."
        });
      }

      const result =
        await executeOnJudge0({
          languageId,
          code,
          stdin
        });

      // Compilation error
      if (
        result.statusId === 6 ||
        result.compileOutput
      ) {
        return res.json({
          success: false,
          type: "Compilation Error",
          output: "",
          error:
            result.compileOutput ||
            result.stderr ||
            result.message ||
            "Compilation failed."
        });
      }

      // Runtime error
      if (
        result.statusId === 7 ||
        result.statusId === 5 ||
        result.statusId === 11 ||
        result.statusId === 12 ||
        result.statusId === 13 ||
        result.statusId === 14 ||
        result.statusId === 15
      ) {
        return res.json({
          success: false,
          type:
            result.statusId === 5
              ? "Time Limit Exceeded"
              : "Runtime Error",
          output: result.stdout,
          error:
            result.stderr ||
            result.message ||
            result.statusDescription ||
            "Program terminated with an error."
        });
      }

      // Accepted / normal execution
      return res.json({
        success: result.statusId === 3,
        type:
          result.statusId === 3
            ? "Success"
            : result.statusDescription || "Execution Finished",
        output: result.stdout,
        error:
          result.stderr ||
          result.message ||
          ""
      });

    } catch (err) {
      console.error(
        "Coding run error:",
        err
      );

      if (err.name === "AbortError") {
        return res.status(504).json({
          message:
            "Code execution timed out."
        });
      }

      return res.status(500).json({
        message:
          err.message ||
          "Failed to execute code."
      });
    }
  }
);


// ==================== SUBMIT AGAINST HIDDEN TEST CASES ====================

app.post(
  "/api/lms/coding/submit",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user?.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can submit coding problems"
        });
      }

      const {
        problemId,
        language,
        code
      } = req.body;

      if (!problemId) {
        return res.status(400).json({
          message:
            "Problem ID is required"
        });
      }

      if (
        !language ||
        !code ||
        !String(code).trim()
      ) {
        return res.status(400).json({
          message:
            "Language and code are required"
        });
      }

      if (String(code).length > 50000) {
        return res.status(400).json({
          message:
            "Code is too large. Maximum 50,000 characters allowed."
        });
      }

      const languageId =
        CODING_LANGUAGES[
          String(language).trim()
        ];

      if (!languageId) {
        return res.status(400).json({
          message:
            `${language} execution is not enabled yet.`
        });
      }

      // Hidden test cases stay on backend
      const problem =
        await CodingProblem.findOne({
          _id: problemId,
          active: { $ne: false }
        })
          .select("title testCases")
          .lean();

      if (!problem) {
        return res.status(404).json({
          message:
            "Coding problem not found"
        });
      }

      const testCases =
        Array.isArray(problem.testCases)
          ? problem.testCases
          : [];

      if (testCases.length === 0) {
        return res.status(400).json({
          message:
            "This problem does not have test cases yet."
        });
      }

      const testResults = [];

      for (
        let i = 0;
        i < testCases.length;
        i++
      ) {
        const testCase =
          testCases[i];

        const input =
          testCase?.input || "";

        const expected =
          testCase?.expectedOutput || "";

        if (String(input).length > 10000) {
          return res.status(400).json({
            message:
              "A test case input is too large."
          });
        }

        let result;

        try {
          result =
            await executeOnJudge0({
              languageId,
              code,
              stdin: input,
              expectedOutput: expected
            });

        } catch (executionError) {
          console.error(
            "Judge0 test execution error:",
            executionError
          );

          return res.status(502).json({
            message:
              "Code execution service is temporarily unavailable."
          });
        }

        // Compilation error
        if (
          result.statusId === 6 ||
          result.compileOutput
        ) {
          return res.json({
            success: false,
            verdict: "Compilation Error",
            testCases: testResults,
            error:
              result.compileOutput ||
              result.stderr ||
              result.message ||
              "Compilation failed."
          });
        }

        // Runtime error
        if (
          result.statusId === 7 ||
          result.statusId === 11 ||
          result.statusId === 12 ||
          result.statusId === 13 ||
          result.statusId === 14 ||
          result.statusId === 15
        ) {
          testResults.push({
            testCase: i + 1,
            passed: false,
            actualOutput:
              result.stdout,
            error:
              result.stderr ||
              result.message ||
              result.statusDescription ||
              "Runtime error"
          });

          return res.json({
            success: false,
            verdict: "Runtime Error",
            testCases: testResults,
            error:
              result.stderr ||
              result.message ||
              result.statusDescription ||
              "Runtime error"
          });
        }

        // Time limit
        if (result.statusId === 5) {
          testResults.push({
            testCase: i + 1,
            passed: false,
            actualOutput:
              result.stdout,
            error:
              "Time limit exceeded."
          });

          return res.json({
            success: false,
            verdict: "Time Limit Exceeded",
            testCases: testResults,
            error:
              "Time limit exceeded."
          });
        }

        const actualOutput =
          normalizeCodingOutput(
            result.stdout
          );

        const expectedOutput =
          normalizeCodingOutput(
            expected
          );

        const passed =
          actualOutput ===
          expectedOutput;

     testResults.push({
  testCase: i + 1,
  passed,
  actualOutput,
  expectedOutput
});

        // Wrong answer
        if (!passed) {
          return res.json({
            success: false,
            verdict: "Wrong Answer",
            testCases: testResults
          });
        }
      }

      // All hidden test cases passed
      return res.json({
        success: true,
        verdict: "Accepted",
        testCases: testResults
      });

    } catch (err) {
      console.error(
        "Coding submission error:",
        err
      );

      return res.status(500).json({
        message:
          err.message ||
          "Failed to submit code."
      });
    }
  }
);


// ==================== LMS EXAM ROUTES ====================
// ==================== LMS EXAM ROUTES ====================

// =========================================================
// LMS HELPER FUNCTIONS
// =========================================================

async function getLmsStudentFromToken(user) {
  if (!user || user.role !== "student") {
    return null;
  }

  if (user.rollNo) {
    return await User.findOne({ rollNo: user.rollNo });
  }

  if (user.id || user._id) {
    return await User.findById(user.id || user._id);
  }

  return null;
}
function getDailyChallengeDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata"
    }
  ).format(new Date());
}
// ==================== DAILY CHALLENGE - TODAY ====================

app.get(
  "/api/lms/coding/daily-challenge",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user?.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can access Daily Challenge"
        });
      }

      const student =
        await getLmsStudentFromToken(req.user);

      if (!student) {
        return res.status(404).json({
          message: "Student account not found"
        });
      }

      const challengeDate =
        getDailyChallengeDate();

      const totalProblems =
        await CodingProblem.countDocuments({
          active: { $ne: false }
        });

      if (totalProblems === 0) {
        return res.status(404).json({
          message:
            "No coding problems are available."
        });
      }

      const currentDate =
        new Date(
          `${challengeDate}T00:00:00+05:30`
        );

      const startOfYear =
        new Date(
          `${challengeDate.substring(
            0,
            4
          )}-01-01T00:00:00+05:30`
        );

      const dayNumber =
        Math.floor(
          (
            currentDate.getTime() -
            startOfYear.getTime()
          ) /
          (24 * 60 * 60 * 1000)
        );

      const skip =
        dayNumber % totalProblems;

      const problem =
        await CodingProblem.findOne({
          active: { $ne: false }
        })
          .sort({
            createdAt: 1,
            _id: 1
          })
          .skip(skip)
          .select("-testCases")
          .lean();

      if (!problem) {
        return res.status(404).json({
          message:
            "Today's challenge could not be loaded."
        });
      }

      const existingAttempt =
        await DailyChallengeAttempt.findOne({
          studentId: student._id,
          challengeDate
        }).lean();

      return res.json({
        challengeDate,
        problem,
        attempt: existingAttempt
          ? {
              startedAt:
                existingAttempt.startedAt,
              submittedAt:
                existingAttempt.submittedAt,
              completionTimeMs:
                existingAttempt.completionTimeMs,
              verdict:
                existingAttempt.verdict,
              completed:
                existingAttempt.completed,
              xpEarned:
                existingAttempt.xpEarned
            }
          : null
      });

    } catch (err) {
      console.error(
        "Daily challenge load error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to load Daily Challenge"
      });
    }
  }
);


// ==================== DAILY CHALLENGE - START ====================

app.post(
  "/api/lms/coding/daily-challenge/start",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user?.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can start Daily Challenge"
        });
      }

      const student =
        await getLmsStudentFromToken(req.user);

      if (!student) {
        return res.status(404).json({
          message: "Student account not found"
        });
      }

      const challengeDate =
        getDailyChallengeDate();

      const existing =
        await DailyChallengeAttempt.findOne({
          studentId: student._id,
          challengeDate
        });

      if (existing) {
        return res.json({
          success: true,
          alreadyStarted: true,
          startedAt: existing.startedAt,
          completed: existing.completed,
          verdict: existing.verdict
        });
      }

      const totalProblems =
        await CodingProblem.countDocuments({
          active: { $ne: false }
        });

      if (totalProblems === 0) {
        return res.status(404).json({
          message:
            "No coding problems are available."
        });
      }

      const currentDate =
        new Date(
          `${challengeDate}T00:00:00+05:30`
        );

      const startOfYear =
        new Date(
          `${challengeDate.substring(
            0,
            4
          )}-01-01T00:00:00+05:30`
        );

      const dayNumber =
        Math.floor(
          (
            currentDate.getTime() -
            startOfYear.getTime()
          ) /
          (24 * 60 * 60 * 1000)
        );

      const skip =
        dayNumber % totalProblems;

      const problem =
        await CodingProblem.findOne({
          active: { $ne: false }
        })
          .sort({
            createdAt: 1,
            _id: 1
          })
          .skip(skip)
          .select("_id")
          .lean();

      if (!problem) {
        return res.status(404).json({
          message:
            "Today's challenge could not be loaded."
        });
      }

      const attempt =
        await DailyChallengeAttempt.create({
          studentId: student._id,
          challengeDate,
          problemId: problem._id,
          branch:
            student.branch || "CSE",
          section:
            student.section || "",
          startedAt: new Date(),
          verdict: "Not Attempted"
        });

      return res.json({
        success: true,
        alreadyStarted: false,
        startedAt:
          attempt.startedAt
      });

    } catch (err) {
      console.error(
        "Daily challenge start error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to start Daily Challenge"
      });
    }
  }
);

// ==================== DAILY CHALLENGE - SUBMIT ====================

app.post(
  "/api/lms/coding/daily-challenge/submit",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user?.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can submit Daily Challenge"
        });
      }

      const student =
        await getLmsStudentFromToken(req.user);

      if (!student) {
        return res.status(404).json({
          message: "Student account not found"
        });
      }

      const {
        language,
        code
      } = req.body;

      if (
        !language ||
        !code ||
        !String(code).trim()
      ) {
        return res.status(400).json({
          message:
            "Language and code are required"
        });
      }

      if (String(code).length > 50000) {
        return res.status(400).json({
          message:
            "Code is too large. Maximum 50,000 characters allowed."
        });
      }

      const languageId =
        CODING_LANGUAGES[
          String(language).trim()
        ];

      if (!languageId) {
        return res.status(400).json({
          message:
            `${language} execution is not enabled yet.`
        });
      }

      const challengeDate =
        getDailyChallengeDate();

      const attempt =
        await DailyChallengeAttempt.findOne({
          studentId: student._id,
          challengeDate
        });

      if (!attempt) {
        return res.status(400).json({
          message:
            "Please start today's Daily Challenge first."
        });
      }

      if (attempt.completed) {
        return res.status(400).json({
          message:
            "You have already completed today's challenge.",
          verdict: "Accepted",
          xpEarned: attempt.xpEarned,
          completionTimeMs:
            attempt.completionTimeMs
        });
      }

      const problem =
        await CodingProblem.findOne({
          _id: attempt.problemId,
          active: { $ne: false }
        })
          .select(
            "title difficulty testCases"
          )
          .lean();

      if (!problem) {
        return res.status(404).json({
          message:
            "Today's coding problem was not found."
        });
      }

      const testCases =
        Array.isArray(problem.testCases)
          ? problem.testCases
          : [];

      if (testCases.length === 0) {
        return res.status(400).json({
          message:
            "Today's challenge has no test cases."
        });
      }

      const testResults = [];

      // ==================== HIDDEN TEST CASES ====================

      for (
        let i = 0;
        i < testCases.length;
        i++
      ) {
        const testCase =
          testCases[i];

        const input =
          testCase?.input || "";

        const expected =
          testCase?.expectedOutput || "";

        let result;

        try {
          result =
            await executeOnJudge0({
              languageId,
              code,
              stdin: input,
              expectedOutput: expected
            });

        } catch (executionError) {
          console.error(
            "Daily Challenge Judge0 error:",
            executionError
          );

          return res.status(502).json({
            message:
              "Code execution service is temporarily unavailable."
          });
        }

        // Compilation Error
        if (
          result.statusId === 6 ||
          result.compileOutput
        ) {
          attempt.verdict =
            "Compilation Error";

          await attempt.save();

          return res.json({
            success: false,
            verdict:
              "Compilation Error",
            testCases: testResults,
            error:
              result.compileOutput ||
              result.stderr ||
              result.message ||
              "Compilation failed."
          });
        }

        // Runtime Error
        if (
          result.statusId === 7 ||
          result.statusId === 11 ||
          result.statusId === 12 ||
          result.statusId === 13 ||
          result.statusId === 14 ||
          result.statusId === 15
        ) {
          attempt.verdict =
            "Runtime Error";

          await attempt.save();

          testResults.push({
            testCase: i + 1,
            passed: false,
            actualOutput:
              result.stdout,
            error:
              result.stderr ||
              result.message ||
              result.statusDescription ||
              "Runtime error"
          });

          return res.json({
            success: false,
            verdict:
              "Runtime Error",
            testCases: testResults,
            error:
              result.stderr ||
              result.message ||
              result.statusDescription ||
              "Runtime error"
          });
        }

        // Time Limit
        if (result.statusId === 5) {
          attempt.verdict =
            "Time Limit Exceeded";

          await attempt.save();

          testResults.push({
            testCase: i + 1,
            passed: false,
            actualOutput:
              result.stdout,
            error:
              "Time limit exceeded."
          });

          return res.json({
            success: false,
            verdict:
              "Time Limit Exceeded",
            testCases: testResults,
            error:
              "Time limit exceeded."
          });
        }

        const actualOutput =
          normalizeCodingOutput(
            result.stdout
          );

        const expectedOutput =
          normalizeCodingOutput(
            expected
          );

        const passed =
          actualOutput ===
          expectedOutput;

        testResults.push({
          testCase: i + 1,
          passed,
          actualOutput
        });

        // Wrong Answer
        if (!passed) {
          attempt.verdict =
            "Wrong Answer";

          await attempt.save();

          return res.json({
            success: false,
            verdict:
              "Wrong Answer",
            testCases: testResults
          });
        }
      }

      // ==================== ACCEPTED ====================

      const submittedAt =
        new Date();

      const completionTimeMs =
        submittedAt.getTime() -
        new Date(
          attempt.startedAt
        ).getTime();

      // Base XP
      let xpEarned = 100;

      const minutes =
        completionTimeMs /
        (60 * 1000);

      // Speed bonus
      if (minutes <= 10) {
        xpEarned += 50;
      } else if (minutes <= 20) {
        xpEarned += 30;
      } else if (minutes <= 30) {
        xpEarned += 15;
      }

      // ==================== UPDATE ATTEMPT ====================

      attempt.submittedAt =
        submittedAt;

      attempt.completionTimeMs =
        completionTimeMs;

      attempt.language =
        String(language).trim();

      attempt.verdict =
        "Accepted";

      attempt.completed =
        true;

      attempt.xpEarned =
        xpEarned;

      await attempt.save();

      // ==================== CODING PROGRESS ====================

      let progress =
        await CodingProgress.findOne({
          studentId:
            student._id
        });

      if (!progress) {
        progress =
          await CodingProgress.create({
            studentId:
              student._id
          });
      }

      const previousDate =
        progress.lastChallengeDate;

      const previousDay =
        new Date(
          `${challengeDate}T00:00:00+05:30`
        );

      previousDay.setDate(
        previousDay.getDate() - 1
      );

      const previousDayString =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "Asia/Kolkata"
          }
        ).format(previousDay);

      if (
        previousDate ===
        challengeDate
      ) {
        // Already counted today
      } else if (
        previousDate ===
        previousDayString
      ) {
        progress.currentStreak =
          Number(
            progress.currentStreak || 0
          ) + 1;
      } else {
        progress.currentStreak = 1;
      }

      progress.longestStreak =
        Math.max(
          Number(
            progress.longestStreak || 0
          ),
          Number(
            progress.currentStreak || 0
          )
        );

      progress.lastChallengeDate =
        challengeDate;

      progress.totalChallengesSolved =
        Number(
          progress.totalChallengesSolved || 0
        ) + 1;

      progress.xp =
        Number(progress.xp || 0) +
        xpEarned;

      progress.level =
        Math.floor(
          Number(progress.xp || 0) /
          500
        ) + 1;

      // ==================== BADGES ====================

      const badges =
        Array.isArray(progress.badges)
          ? progress.badges
          : [];

      const addBadge = badge => {
        if (!badges.includes(badge)) {
          badges.push(badge);
        }
      };

      addBadge("First Daily Challenge");

      if (
        progress.currentStreak >= 7
      ) {
        addBadge("7 Day Streak");
      }

      if (
        progress.currentStreak >= 30
      ) {
        addBadge("30 Day Streak");
      }

      if (
        progress.totalChallengesSolved >= 10
      ) {
        addBadge("10 Daily Challenges");
      }

      progress.badges =
        badges;

      // ==================== HISTORY ====================

      if (
        !Array.isArray(
          progress.dailyChallengeHistory
        )
      ) {
        progress.dailyChallengeHistory =
          [];
      }

      const alreadyInHistory =
        progress.dailyChallengeHistory.some(
          item =>
            item.date ===
            challengeDate
        );

      if (!alreadyInHistory) {
        progress.dailyChallengeHistory.push({
          date:
            challengeDate,
          problemId:
            problem._id
        });
      }

      progress.updatedAt =
        new Date();

      await progress.save();

      return res.json({
        success: true,
        verdict: "Accepted",

        testCases:
          testResults,

        completionTimeMs:
          completionTimeMs,

        xpEarned:
          xpEarned,

        totalXp:
          progress.xp,

        level:
          progress.level,

        currentStreak:
          progress.currentStreak,

        longestStreak:
          progress.longestStreak,

        badges:
          progress.badges
      });

    } catch (err) {
      console.error(
        "Daily Challenge submit error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to submit Daily Challenge",
        error:
          err.message
      });
    }
  }
);

function getExamHardEnd(exam, attempt) {
  const sectionSchedule = exam.sections.find(
    item => String(item.section) === String(attempt.section)
  );

  if (!sectionSchedule) {
    return null;
  }

  const sectionEnd = new Date(sectionSchedule.endAt);

  const durationEnd = new Date(
    new Date(attempt.startedAt).getTime() +
    Number(exam.durationMinutes) * 60 * 1000
  );

  return durationEnd < sectionEnd
    ? durationEnd
    : sectionEnd;
}

function calculateExamScore(exam, attempt) {
  const submittedAnswers = new Map(
    (attempt.answers || []).map(item => [
      String(item.questionId),
      String(item.answer || "")
    ])
  );

  let score = 0;

  for (const question of exam.questions || []) {
    const studentAnswer =
      submittedAnswers.get(String(question._id)) || "";

    if (!studentAnswer) {
      continue;
    }

    const correctAnswer = String(
      question.correctAnswer || ""
    );

    if (studentAnswer === correctAnswer) {
      score += Number(question.marks || 0);
    } else {
      score -= Number(question.negativeMarks || 0);
    }
  }

  return Math.max(0, Number(score.toFixed(2)));
}

async function finalizeLmsAttempt(exam, attempt, forcedStatus = null) {
  const score = calculateExamScore(exam, attempt);

  const totalMarks = Number(exam.totalMarks || 0);

  const percentage =
    totalMarks > 0
      ? Number(((score / totalMarks) * 100).toFixed(2))
      : 0;

  attempt.score = score;
  attempt.totalMarks = totalMarks;
  attempt.percentage = percentage;
  attempt.submittedAt = new Date();

  if (forcedStatus) {
    attempt.status = forcedStatus;
  } else {
    attempt.status = "submitted";
  }

  await attempt.save();

  return {
    attemptId: attempt._id,
    examId: exam._id,
    score,
    totalMarks,
    percentage,
    status: attempt.status,
    submittedAt: attempt.submittedAt
  };
}

function examForStudent(exam, hardEnd) {
  return {
    id: exam._id,
    title: exam.title,
    subject: exam.subject,
    description: exam.description,
    instructions: exam.instructions,

    questions: (exam.questions || []).map(q => ({
      _id: q._id,
      question: q.question,
      type: q.type,
      options: q.options,
      marks: q.marks,
      negativeMarks: q.negativeMarks
    })),

    totalMarks: exam.totalMarks,
    durationMinutes: exam.durationMinutes,
    examEndAt: hardEnd
  };
}


// =========================================================
// LMS SECTION OPTIONS
// =========================================================

app.get(
  "/api/lms/section-options",
  verifyAnyToken,
  async (req, res) => {
    try {
      const role = req.user?.role;

      if (
        !["admin", "hod", "faculty", "student"].includes(role)
      ) {
        return res.status(403).json({
          message: "You are not allowed to access LMS options"
        });
      }

      const userBranches = await User.distinct("branch");
      const timetableBranches =
        await Timetable.distinct("branch");

      const branches = [
        ...new Set(
          [
            ...userBranches,
            ...timetableBranches
          ].filter(Boolean)
        )
      ].sort();

      let allowedBranches = branches;
// HOD / Faculty / Student → own branch only
if (
  role === "hod" ||
  role === "faculty" ||
  role === "student"
) {
  if (!req.user.branch) {
    return res.status(400).json({
      message: "User branch not found"
    });
  }

  allowedBranches = branches.filter(
    branch => String(branch) === String(req.user.branch)
  );
}

      const sectionsByBranch = {};

      for (const branchName of allowedBranches) {
        const userSections = await User.distinct(
          "section",
          {
            branch: branchName
          }
        );

        const timetableSections =
          await Timetable.distinct(
            "section",
            {
              branch: branchName
            }
          );

        let sections = [
          ...new Set(
            [
              ...userSections,
              ...timetableSections
            ].filter(Boolean)
          )
        ].sort();
// Faculty can conduct exams for any section

        // Student / CR → own section only
        if (role === "student") {
          sections = sections.filter(
            section =>
              String(section) ===
              String(req.user.section)
          );
        }

        sectionsByBranch[branchName] = sections;
      }

      return res.json({
        branches: allowedBranches,
        sectionsByBranch
      });

    } catch (err) {
      console.error(
        "LMS section options error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to load branch and section options"
      });
    }
  }
);


// =========================================================
// CREATE LMS EXAM
// Questions PDF + Answer Key PDF
// =========================================================

app.post(
  "/api/lms/exams",
  verifyAnyToken,
  upload.fields([
    {
      name: "questionsPdf",
      maxCount: 1
    },
    {
      name: "answerKeyPdf",
      maxCount: 1
    }
  ]),
  async (req, res) => {
    let questionFile = null;
    let answerFile = null;

    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required"
        });
      }

      // Only Admin / HOD / Faculty
      if (
        !["admin", "hod", "faculty"].includes(
          req.user.role
        )
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to create exams"
        });
      }

      questionFile =
        req.files?.questionsPdf?.[0] || null;

      answerFile =
        req.files?.answerKeyPdf?.[0] || null;

      if (!questionFile) {
        return res.status(400).json({
          message: "Questions PDF is required"
        });
      }

      if (!answerFile) {
        return res.status(400).json({
          message: "Answer Key PDF is required"
        });
      }

      let metadata = {};

      try {
        metadata = JSON.parse(
          req.body.metadata || "{}"
        );
      } catch (err) {
        return res.status(400).json({
          message: "Invalid exam metadata"
        });
      }

      const {
        title,
        subject,
        description = "",
        instructions = "",
        branch,
        sections,
        durationMinutes,
        marksPerQuestion,
        negativeMarks
      } = metadata;

      // -------------------------
      // Basic validation
      // -------------------------

      if (
        !title ||
        !subject ||
        !branch
      ) {
        return res.status(400).json({
          message:
            "Title, subject and branch are required"
        });
      }

      if (
        !Array.isArray(sections) ||
        sections.length === 0
      ) {
        return res.status(400).json({
          message:
            "At least one section schedule is required"
        });
      }

      if (
        Number(durationMinutes) <= 0
      ) {
        return res.status(400).json({
          message:
            "Duration must be greater than 0"
        });
      }

      if (
        marksPerQuestion === undefined ||
        Number(marksPerQuestion) < 0
      ) {
        return res.status(400).json({
          message:
            "Valid marks per question are required"
        });
      }

      if (
        negativeMarks === undefined ||
        Number(negativeMarks) < 0
      ) {
        return res.status(400).json({
          message:
            "Valid negative marking value is required"
        });
      }

      // -------------------------
      // Branch permission
      // -------------------------

      if (
        req.user.role === "hod" &&
        String(req.user.branch) !==
        String(branch)
      ) {
        return res.status(403).json({
          message:
            "HOD can create exams only for their own branch"
        });
      }

      if (
        req.user.role === "faculty" &&
        String(req.user.branch) !==
        String(branch)
      ) {
        return res.status(403).json({
          message:
            "Faculty can create exams only for their own branch"
        });
      }

      // -------------------------
      // Get valid DB sections
      // -------------------------

      const dbUserSections =
        await User.distinct(
          "section",
          {
            branch,
            section: {
              $nin: [null, ""]
            }
          }
        );

      const dbTimetableSections =
        await Timetable.distinct(
          "section",
          {
            branch,
            section: {
              $nin: [null, ""]
            }
          }
        );

      const validSections = new Set(
        [
          ...dbUserSections,
          ...dbTimetableSections
        ]
          .filter(Boolean)
          .map(section =>
            String(section).trim()
          )
      );

      // -------------------------
      // Normalize section schedules
      // -------------------------

      const normalizedSections = [];

      for (const item of sections) {
        const section = String(
          item?.section || ""
        ).trim();

        if (!section) {
          return res.status(400).json({
            message:
              "Each section must have a valid section"
          });
        }

        if (!validSections.has(section)) {
          return res.status(400).json({
            message:
              `Section ${section} does not exist for branch ${branch}`
          });
        }

        if (
          !item.startAt ||
          !item.endAt
        ) {
          return res.status(400).json({
            message:
              `Start time and end time are required for section ${section}`
          });
        }

        const startAt =
          new Date(item.startAt);

        const endAt =
          new Date(item.endAt);

        if (
          Number.isNaN(startAt.getTime()) ||
          Number.isNaN(endAt.getTime())
        ) {
          return res.status(400).json({
            message:
              `Invalid date/time for section ${section}`
          });
        }

        if (startAt >= endAt) {
          return res.status(400).json({
            message:
              `End time must be after start time for section ${section}`
          });
        }

        normalizedSections.push({
          section,
          startAt,
          endAt
        });
      }

      // -------------------------
      // Duplicate section check
      // -------------------------

      const sectionNames =
        normalizedSections.map(
          item => item.section
        );

      if (
        new Set(sectionNames).size !==
        sectionNames.length
      ) {
        return res.status(400).json({
          message:
            "The same section cannot be added more than once"
        });
      }

      // -------------------------
      // Faculty assigned section check
      // -------------------------

      // Faculty can conduct exams for any section

      // -------------------------
      // Read Questions PDF
      // -------------------------

      const questionBuffer =
        fs.readFileSync(
          questionFile.path
        );

      const questionPdf =
        await pdfParse(
          questionBuffer
        );

      // -------------------------
      // Read Answer Key PDF
      // -------------------------

      const answerBuffer =
        fs.readFileSync(
          answerFile.path
        );

      const answerPdf =
        await pdfParse(
          answerBuffer
        );

      // -------------------------
      // IMPORTANT:
      // Use existing corrected helper
      // -------------------------

      const questions =
        buildExamQuestions(
          questionPdf.text || "",
          answerPdf.text || "",
          Number(marksPerQuestion),
          Number(negativeMarks)
        );

      if (!questions.length) {
        return res.status(400).json({
          message:
            "No questions detected in PDF"
        });
      }

      // -------------------------
      // Total marks
      // -------------------------

      const totalMarks =
        questions.reduce(
          (sum, question) =>
            sum +
            Number(question.marks || 0),
          0
        );

      // -------------------------
      // Created By
      // -------------------------

      const creatorId =
        req.user.facultyId ||
        req.user.employeeId ||
        req.user.rollNo ||
        req.user.id ||
        req.user._id ||
        "admin";

      // -------------------------
      // Create exam
      // -------------------------

      const exam =
        await Exam.create({
          title:
            String(title).trim(),

          subject:
            String(subject).trim(),

          description:
            String(description || ""),

          instructions:
            String(instructions || ""),

          branch:
            String(branch).trim(),

          sections:
            normalizedSections,

          durationMinutes:
            Number(durationMinutes),

          questions,

          totalMarks,

          status: "draft",

          createdBy: {
            role: req.user.role,
            id: String(creatorId)
          },

          createdAt: new Date(),
          updatedAt: new Date()
        });

      // -------------------------
      // Cloudinary PDFs
      // -------------------------

      try {
        if (
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ) {
          const questionPdfUrl =
            await uploadExamPdfToCloudinary(
              questionFile.path,
              `questions-${exam._id}`
            );

          const answerKeyPdfUrl =
            await uploadExamPdfToCloudinary(
              answerFile.path,
              `answer-key-${exam._id}`
            );

          exam.questionPdfUrl =
            questionPdfUrl || "";

          exam.answerKeyPdfUrl =
            answerKeyPdfUrl || "";

          await exam.save();
        }
      } catch (cloudinaryError) {
        console.error(
          "Exam PDF Cloudinary upload error:",
          cloudinaryError
        );
      }

      return res.status(201).json({
        message:
          "Exam created successfully as Draft",
        exam
      });

    } catch (err) {
      console.error(
        "Create LMS exam error:",
        err
      );

      return res.status(500).json({
        message:
          err.message ||
          "Failed to create exam"
      });

    } finally {
      // -------------------------
      // Cleanup temporary files
      // -------------------------

      try {
        if (
          questionFile?.path &&
          fs.existsSync(
            questionFile.path
          )
        ) {
          fs.unlinkSync(
            questionFile.path
          );
        }

        if (
          answerFile?.path &&
          fs.existsSync(
            answerFile.path
          )
        ) {
          fs.unlinkSync(
            answerFile.path
          );
        }
      } catch (cleanupError) {
        console.warn(
          "Exam PDF cleanup warning:",
          cleanupError.message
        );
      }
    }
  }
);


// =========================================================
// GET LMS EXAMS
// =========================================================

app.get(
  "/api/lms/exams",
  verifyAnyToken,
  async (req, res) => {
    try {
      const role = req.user?.role;

      if (
        ![
          "admin",
          "hod",
          "faculty",
          "student"
        ].includes(role)
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to view exams"
        });
      }

      let filter = {};

      // Student + CR
      if (role === "student") {
        filter = {
          branch: req.user.branch,
          status: "published",
          "sections.section":
            req.user.section
        };
      }

      // Faculty
      else if (role === "faculty") {
        const facultyId =
          req.user.facultyId ||
          req.user.employeeId ||
          req.user.id;

        filter = {
          branch: req.user.branch,
          "createdBy.id":
            String(facultyId)
        };
      }

      // HOD
      else if (role === "hod") {
        filter = {
          branch: req.user.branch
        };
      }

      // Admin
      else if (role === "admin") {
        filter = {};
      }

      const exams =
        await Exam.find(filter)
          .sort({
            createdAt: -1
          })
          .lean();

      return res.json({
        exams
      });

    } catch (err) {
      console.error(
        "Get LMS exams error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to fetch exams",
        error: err.message
      });
    }
  }
);


// =========================================================
// PUBLISH EXAM
// =========================================================

app.patch(
  "/api/lms/exams/:examId/publish",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (
        ![
          "admin",
          "hod",
          "faculty"
        ].includes(req.user.role)
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to publish exams"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        );

      if (!exam) {
        return res.status(404).json({
          message: "Exam not found"
        });
      }

      // HOD branch check
      if (
        req.user.role === "hod" &&
        String(req.user.branch) !==
        String(exam.branch)
      ) {
        return res.status(403).json({
          message:
            "HOD can publish only exams of their own branch"
        });
      }

      // Faculty branch + creator check
      if (
        req.user.role === "faculty"
      ) {
        if (
          String(req.user.branch) !==
          String(exam.branch)
        ) {
          return res.status(403).json({
            message:
              "Faculty can publish only exams of their own branch"
          });
        }

        const facultyId =
          req.user.facultyId ||
          req.user.employeeId ||
          req.user.id;

        if (
          String(exam.createdBy.id) !==
          String(facultyId)
        ) {
          return res.status(403).json({
            message:
              "You can publish only exams created by you"
          });
        }
      }

      exam.status = "published";
      exam.updatedAt = new Date();

      await exam.save();

      return res.json({
        message:
          "Exam published successfully",
        exam
      });

    } catch (err) {
      console.error(
        "Publish LMS exam error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to publish exam",
        error: err.message
      });
    }
  }
);


// =========================================================
// START EXAM
// =========================================================

app.post(
  "/api/lms/exams/:examId/start",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can start exams"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        ).lean();

      if (!exam) {
        return res.status(404).json({
          message: "Exam not found"
        });
      }

      if (exam.status !== "published") {
        return res.status(403).json({
          message:
            "This exam is not available yet"
        });
      }

      if (
        String(exam.branch) !==
        String(req.user.branch)
      ) {
        return res.status(403).json({
          message:
            "This exam is not assigned to your branch"
        });
      }

      const sectionSchedule =
        exam.sections.find(
          item =>
            String(item.section) ===
            String(req.user.section)
        );

      if (!sectionSchedule) {
        return res.status(403).json({
          message:
            "This exam is not assigned to your section"
        });
      }

      const now = new Date();

      const startAt =
        new Date(
          sectionSchedule.startAt
        );

      const endAt =
        new Date(
          sectionSchedule.endAt
        );

      if (now < startAt) {
        return res.status(403).json({
          message:
            "Exam is not available yet",
          startAt
        });
      }

      if (now >= endAt) {
        return res.status(403).json({
          message:
            "Exam window has ended",
          endAt
        });
      }

      // Resolve real MongoDB student
      const student =
        await getLmsStudentFromToken(
          req.user
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student account not found"
        });
      }

      const studentId =
        student._id;

      // Existing attempt
      let attempt =
        await ExamAttempt.findOne({
          studentId,
          examId: exam._id
        });

      // Already submitted
      if (
        attempt &&
        (
          attempt.status ===
            "submitted" ||
          attempt.status ===
            "auto-submitted"
        )
      ) {
        return res.status(403).json({
          message:
            "You have already completed this exam"
        });
      }

      // Resume existing attempt
      if (
        attempt &&
        attempt.status ===
          "in-progress"
      ) {
        const hardEnd =
          getExamHardEnd(
            exam,
            attempt
          );

        if (
          !hardEnd ||
          now >= hardEnd
        ) {
          const result =
            await finalizeLmsAttempt(
              exam,
              attempt,
              "auto-submitted"
            );

          return res.status(403).json({
            message:
              "Exam time has ended",
            result
          });
        }

        return res.json({
          message:
            "Existing exam attempt resumed",

          attempt: {
            id: attempt._id,
            startedAt:
              attempt.startedAt,
            status:
              attempt.status,
            tabSwitchCount:
              attempt.tabSwitchCount,
            answers:
              attempt.answers
          },

          exam:
            examForStudent(
              exam,
              hardEnd
            )
        });
      }

      // New attempt
      try {
        attempt =
          await ExamAttempt.create({
            studentId,
            examId:
              exam._id,
            branch:
              req.user.branch,
            section:
              req.user.section,
            startedAt:
              now,
            status:
              "in-progress",
            tabSwitchCount:
              0,
            answers: [],
            score: 0,
            totalMarks:
              exam.totalMarks,
            percentage: 0
          });
      } catch (createError) {
        // Unique index protection
        if (
          createError?.code === 11000
        ) {
          attempt =
            await ExamAttempt.findOne({
              studentId,
              examId:
                exam._id
            });

          if (!attempt) {
            throw createError;
          }

          const hardEnd =
            getExamHardEnd(
              exam,
              attempt
            );

          return res.json({
            message:
              "Existing exam attempt resumed",

            attempt: {
              id: attempt._id,
              startedAt:
                attempt.startedAt,
              status:
                attempt.status,
              tabSwitchCount:
                attempt.tabSwitchCount,
              answers:
                attempt.answers
            },

            exam:
              examForStudent(
                exam,
                hardEnd
              )
          });
        }

        throw createError;
      }

      const hardEnd =
        getExamHardEnd(
          exam,
          attempt
        );

      return res.status(201).json({
        message:
          "Exam started successfully",

        attempt: {
          id: attempt._id,
          startedAt:
            attempt.startedAt,
          status:
            attempt.status,
          tabSwitchCount:
            attempt.tabSwitchCount,
          answers:
            attempt.answers
        },

        exam:
          examForStudent(
            exam,
            hardEnd
          )
      });

    } catch (err) {
      console.error(
        "Start LMS exam error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to start exam",
        error: err.message
      });
    }
  }
);


// =========================================================
// SAVE EXAM ANSWERS
// =========================================================

app.patch(
  "/api/lms/exams/:examId/attempt/:attemptId/answers",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can save exam answers"
        });
      }

      const {
        answers
      } = req.body;

      if (!Array.isArray(answers)) {
        return res.status(400).json({
          message:
            "Answers must be an array"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        ).lean();

      if (!exam) {
        return res.status(404).json({
          message:
            "Exam not found"
        });
      }

      const student =
        await getLmsStudentFromToken(
          req.user
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student account not found"
        });
      }

      const attempt =
        await ExamAttempt.findOne({
          _id:
            req.params.attemptId,
          examId:
            exam._id,
          studentId:
            student._id
        });

      if (!attempt) {
        return res.status(404).json({
          message:
            "Exam attempt not found"
        });
      }

      if (
        attempt.status !==
        "in-progress"
      ) {
        return res.status(403).json({
          message:
            "This exam attempt is no longer active"
        });
      }

      const hardEnd =
        getExamHardEnd(
          exam,
          attempt
        );

      const now = new Date();

      if (
        !hardEnd ||
        now >= hardEnd
      ) {
        await finalizeLmsAttempt(
          exam,
          attempt,
          "auto-submitted"
        );

        return res.status(403).json({
          message:
            "Exam time has ended. Your attempt was auto-submitted."
        });
      }

      const validQuestionIds =
        new Set(
          exam.questions.map(
            q => String(q._id)
          )
        );

      const cleanedAnswers = [];

      for (const item of answers) {
        if (
          !item ||
          !item.questionId
        ) {
          continue;
        }

        if (
          !validQuestionIds.has(
            String(item.questionId)
          )
        ) {
          continue;
        }

        cleanedAnswers.push({
          questionId:
            item.questionId,

          answer:
            item.answer ===
              undefined ||
            item.answer === null
              ? ""
              : String(item.answer)
        });
      }

      attempt.answers =
        cleanedAnswers;

      await attempt.save();

      return res.json({
        message:
          "Answers saved successfully",
        answers:
          attempt.answers
      });

    } catch (err) {
      console.error(
        "Save LMS exam answers error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to save answers",
        error: err.message
      });
    }
  }
);


// =========================================================
// SUBMIT EXAM
// =========================================================

app.post(
  "/api/lms/exams/:examId/attempt/:attemptId/submit",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can submit exams"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        ).lean();

      if (!exam) {
        return res.status(404).json({
          message:
            "Exam not found"
        });
      }

      const student =
        await getLmsStudentFromToken(
          req.user
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student account not found"
        });
      }

      const attempt =
        await ExamAttempt.findOne({
          _id:
            req.params.attemptId,
          examId:
            exam._id,
          studentId:
            student._id
        });

      if (!attempt) {
        return res.status(404).json({
          message:
            "Exam attempt not found"
        });
      }

      if (
        attempt.status !==
        "in-progress"
      ) {
        return res.status(403).json({
          message:
            "This exam attempt has already been submitted"
        });
      }

      const hardEnd =
        getExamHardEnd(
          exam,
          attempt
        );

      const now = new Date();

      const autoSubmitted =
        !hardEnd ||
        now >= hardEnd;

      const result =
        await finalizeLmsAttempt(
          exam,
          attempt,
          autoSubmitted
            ? "auto-submitted"
            : "submitted"
        );

      return res.json({
        message:
          autoSubmitted
            ? "Exam time ended. Exam auto-submitted successfully."
            : "Exam submitted successfully.",

        result
      });

    } catch (err) {
      console.error(
        "Submit LMS exam error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to submit exam",
        error: err.message
      });
    }
  }
);


// =========================================================
// TAB SWITCH
// 1st → warning
// 2nd → auto submit
// =========================================================

app.post(
  "/api/lms/exams/:examId/attempt/:attemptId/tab-switch",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can take exams"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        ).lean();

      if (!exam) {
        return res.status(404).json({
          message:
            "Exam not found"
        });
      }

      const student =
        await getLmsStudentFromToken(
          req.user
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student account not found"
        });
      }

      const attempt =
        await ExamAttempt.findOne({
          _id:
            req.params.attemptId,
          examId:
            exam._id,
          studentId:
            student._id
        });

      if (!attempt) {
        return res.status(404).json({
          message:
            "Exam attempt not found"
        });
      }

      if (
        attempt.status !==
        "in-progress"
      ) {
        return res.status(403).json({
          message:
            "This exam attempt is no longer active"
        });
      }

      const hardEnd =
        getExamHardEnd(
          exam,
          attempt
        );

      const now = new Date();

      // If exam time already ended
      if (
        !hardEnd ||
        now >= hardEnd
      ) {
        const result =
          await finalizeLmsAttempt(
            exam,
            attempt,
            "auto-submitted"
          );

        return res.json({
          message:
            "Exam time ended. Exam auto-submitted.",
          autoSubmitted: true,
          warning: false,
          result
        });
      }

      attempt.tabSwitchCount =
        Number(
          attempt.tabSwitchCount || 0
        ) + 1;

      // FIRST TAB SWITCH
      if (
        attempt.tabSwitchCount === 1
      ) {
        await attempt.save();

        return res.json({
          message:
            "Tab switch detected",
          tabSwitchCount:
            attempt.tabSwitchCount,
          warning: true,
          autoSubmitted: false
        });
      }

      // SECOND OR MORE
      const result =
        await finalizeLmsAttempt(
          exam,
          attempt,
          "auto-submitted"
        );

      return res.json({
        message:
          "Second tab switch detected. Exam automatically submitted.",
        tabSwitchCount:
          attempt.tabSwitchCount,
        warning: false,
        autoSubmitted: true,
        result
      });

    } catch (err) {
      console.error(
        "LMS tab switch error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to record tab switch",
        error: err.message
      });
    }
  }
);


// =========================================================
// STUDENT OWN RESULT
// =========================================================

app.get(
  "/api/lms/exams/:examId/attempt/:attemptId/result",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can view this result"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        ).lean();

      if (!exam) {
        return res.status(404).json({
          message:
            "Exam not found"
        });
      }

      const student =
        await getLmsStudentFromToken(
          req.user
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student account not found"
        });
      }

      const attempt =
        await ExamAttempt.findOne({
          _id:
            req.params.attemptId,
          examId:
            exam._id,
          studentId:
            student._id
        }).lean();

      if (!attempt) {
        return res.status(404).json({
          message:
            "Exam attempt not found"
        });
      }

      if (
        attempt.status ===
        "in-progress"
      ) {
        return res.status(403).json({
          message:
            "Exam has not been submitted yet"
        });
      }

      return res.json({
        result: {
          attemptId:
            attempt._id,

          examId:
            exam._id,

          title:
            exam.title,

          subject:
            exam.subject,

          score:
            attempt.score,

          totalMarks:
            attempt.totalMarks,

          percentage:
            attempt.percentage,

          status:
            attempt.status,

          tabSwitchCount:
            attempt.tabSwitchCount,

          startedAt:
            attempt.startedAt,

          submittedAt:
            attempt.submittedAt
        }
      });

    } catch (err) {
      console.error(
        "Get LMS own result error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to fetch result",
        error: err.message
      });
    }
  }
);


// =========================================================
// FACULTY / HOD / ADMIN RESULTS
// =========================================================

app.get(
  "/api/lms/exams/:examId/results",
  verifyAnyToken,
  async (req, res) => {
    try {
      const role =
        req.user.role;

      if (
        ![
          "admin",
          "hod",
          "faculty"
        ].includes(role)
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to view exam results"
        });
      }

      const exam =
        await Exam.findById(
          req.params.examId
        ).lean();

      if (!exam) {
        return res.status(404).json({
          message:
            "Exam not found"
        });
      }

      // HOD → own branch
      if (
        role === "hod" &&
        String(req.user.branch) !==
        String(exam.branch)
      ) {
        return res.status(403).json({
          message:
            "HOD can view results only for their own branch"
        });
      }

      // Faculty → own branch + own exam
      if (role === "faculty") {
        if (
          String(req.user.branch) !==
          String(exam.branch)
        ) {
          return res.status(403).json({
            message:
              "Faculty can view results only for their own branch"
          });
        }

        const facultyId =
          req.user.facultyId ||
          req.user.employeeId ||
          req.user.id;

        if (
          String(exam.createdBy.id) !==
          String(facultyId)
        ) {
          return res.status(403).json({
            message:
              "You can view results only for exams created by you"
          });
        }
      }

      const attempts =
        await ExamAttempt.find({
          examId:
            exam._id
        })
        .populate({
          path: "studentId",
          select:
            "name rollNo branch section"
        })
        .sort({
          submittedAt: -1
        })
        .lean();

      const results =
        attempts.map(
          attempt => ({
            attemptId:
              attempt._id,

            studentId:
              attempt.studentId?._id,

            studentName:
              attempt.studentId?.name ||
              "",

            rollNo:
              attempt.studentId?.rollNo ||
              "",

            branch:
              attempt.branch,

            section:
              attempt.section,

            score:
              attempt.score,

            totalMarks:
              attempt.totalMarks,

            percentage:
              attempt.percentage,

            status:
              attempt.status,

            tabSwitchCount:
              attempt.tabSwitchCount,

            startedAt:
              attempt.startedAt,

            submittedAt:
              attempt.submittedAt
          })
        );

      return res.json({
        exam: {
          _id:
            exam._id,
          title:
            exam.title,
          subject:
            exam.subject,
          branch:
            exam.branch,
          totalMarks:
            exam.totalMarks
        },

        results
      });

    } catch (err) {
      console.error(
        "Get LMS exam results error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to fetch exam results",
        error: err.message
      });
    }
  }
);
// Export LMS exam results to Excel
app.get(
  "/api/lms/exams/:examId/results/export",
  verifyAnyToken,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required"
        });
      }

      // Only Admin, HOD and Faculty can export results
      if (!["admin", "hod", "faculty"].includes(req.user.role)) {
        return res.status(403).json({
          message: "You are not allowed to export exam results"
        });
      }

      const exam = await Exam.findById(req.params.examId).lean();

      if (!exam) {
        return res.status(404).json({
          message: "Exam not found"
        });
      }

      // HOD can export only exams of their branch
      if (
        req.user.role === "hod" &&
        req.user.branch !== exam.branch
      ) {
        return res.status(403).json({
          message: "HOD can export only exams of their own branch"
        });
      }

      // Faculty can export only exams of their branch
     // Faculty can create exams for any branch and any section

      // Faculty can export only exams created by them
      if (req.user.role === "faculty") {
        const facultyId =
          req.user.facultyId ||
          req.user.employeeId ||
          req.user.id;

        if (
          String(exam.createdBy?.id) !==
          String(facultyId)
        ) {
          return res.status(403).json({
            message: "You can export only exams created by you"
          });
        }
      }

      const attempts = await ExamAttempt.find({
        examId: exam._id,
        status: {
          $in: ["submitted", "auto-submitted"]
        }
      })
        .populate(
          "studentId",
          "name rollNo branch section"
        )
        .sort({ submittedAt: -1 })
        .lean();

      const rows = attempts.map((attempt) => ({
        "Roll No": attempt.studentId?.rollNo || "",
        "Student Name": attempt.studentId?.name || "",
        "Branch": attempt.branch || "",
        "Section": attempt.section || "",
        "Score": attempt.score ?? 0,
        "Total Marks": attempt.totalMarks ?? 0,
        "Percentage": attempt.percentage ?? 0,
        "Status":
          attempt.status === "auto-submitted"
            ? "Auto-submitted"
            : "Submitted",
        "Tab Switches": attempt.tabSwitchCount ?? 0,
        "Started At": attempt.startedAt
          ? new Date(attempt.startedAt).toLocaleString()
          : "",
        "Submitted At": attempt.submittedAt
          ? new Date(attempt.submittedAt).toLocaleString()
          : ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 16 },
        { wch: 24 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 24 },
        { wch: 24 }
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Results"
      );

      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx"
      });

      const safeTitle = String(exam.title || "Exam")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "");

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle || "Exam"}_Results.xlsx"`
      );

      res.send(buffer);

    } catch (err) {
      console.error(
        "Export LMS exam results error:",
        err
      );

      res.status(500).json({
        message: "Failed to export exam results",
        error: err.message
      });
    }
  }
);
// ============== NOTICES ==============

app.get("/api/notices", optionalAuth, async (req, res) => {
  try {
    const u = req.user;
    let filter;
    if (u?.role === "admin") {
      filter = {};
    } else if (u?.branch) {
      filter = { $or: [{ branch: null }, { branch: { $exists: false } }, { branch: u.branch }] };
    } else {
      filter = { $or: [{ branch: null }, { branch: { $exists: false } }] };
    }
    const notices = await Notice.find(filter).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error("Get notices error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post(
  "/api/notices",
  hodOrAdminMiddleware,
  async (req, res) => {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          message: "Title and description required"
        });
      }

      const branch =
        req.user.role === "hod"
          ? req.user.branch
          : null;

      let pdfUrl = null;

      const pdfFile = req.files?.pdf;

      // PDF is optional
      if (pdfFile) {
        if (pdfFile.mimetype !== "application/pdf") {
          return res.status(400).json({
            message: "Only PDF files are allowed"
          });
        }

        if (pdfFile.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            message: "PDF size must be below 10 MB"
          });
        }

        pdfUrl = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "notices",
              public_id:
                `notice-${Date.now()}-${pdfFile.name
                  .replace(/\.pdf$/i, "")
                  .replace(/[^a-zA-Z0-9-_]/g, "_")}`
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result.secure_url);
              }
            }
          );

          stream.end(pdfFile.data);
        });
      }

      const notice = new Notice({
        title,
        description,
        branch,
        pdfUrl
      });

      await notice.save();

      notifyUsers(
        branch ? { branch } : {},
        `📢 ${title}`,
        description
      );

      res.json(notice);

    } catch (err) {
      console.error("Post notice error:", err);

      res.status(500).json({
        message: err.message
      });
    }
  }
);
app.delete("/api/notices/:id", hodOrAdminMiddleware, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    if (req.user.role === "hod" && notice.branch !== req.user.branch) {
      return res.status(403).json({ message: "You can only delete your own branch's notices" });
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ============== NOTES ==============

app.get("/api/notes", verifyAnyToken, async (req, res) => {
  try {
    const u = req.user;
    let filter = {};
    if (u.role === "student") filter = { branch: u.branch, section: u.section };
    else if (u.role === "faculty") {
  filter = {
    branch: u.branch,
    section: { $in: u.assignedSections || [] },
    uploadedBy: u.facultyId
  };
}
    else if (u.role === "hod") filter = { branch: u.branch };

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error("Get notes error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notes", uploaderMiddleware, async (req, res) => {
  try {
    const { branch, section, subject, title, description, fileUrl } = req.body;

    if (!section || !subject || !title || !description) {
      return res.status(400).json({ message: "All fields required" });
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

    notifyUsers({ branch: targetBranch, section }, `📚 New Note: ${subject}`, title);

    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notes/:id", uploaderMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (!canAccess(req.user, note.branch, note.section)) {
  return res.status(403).json({ message: "Not authorized to delete this note" });
}

if (req.user.role === "faculty" && note.uploadedBy !== req.user.facultyId) {
  return res.status(403).json({ message: "You can only delete your own notes" });
}

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
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
    else if (u.role === "faculty") {
  filter = {
    branch: u.branch,
    section: { $in: u.assignedSections || [] },
    uploadedBy: u.facultyId
  };
}
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
    const { branch, section, subject, title, description, fileUrl } = req.body;

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

    notifyUsers({ branch: targetBranch, section }, `📝 New Assignment: ${subject}`, title);

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

if (req.user.role === "faculty" && assignment.uploadedBy !== req.user.facultyId) {
  return res.status(403).json({ message: "You can only delete your own assignments" });
}
    await Assignment.deleteOne({ _id: req.params.id });
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ====================== PAPERS ======================

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

app.post("/api/papers", uploaderMiddleware, async (req, res) => {
  try {
    const { branch, subject, title, fileUrl } = req.body;

    if (!subject || !title || !fileUrl) {
      return res.status(400).json({ message: "Subject, title and fileUrl are required" });
    }

    const targetBranch = branch || req.user.branch || "CSE";
    if (!canAccess(req.user, targetBranch)) {
      return res.status(403).json({ message: "You can only upload for your own branch" });
    }

    const paper = new Paper({ branch: targetBranch, subject, title, fileUrl });
    await paper.save();

    notifyUsers({ branch: targetBranch }, `📄 New Question Paper: ${subject}`, title);

    res.status(201).json(paper);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
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
    res.json({ message: "Paper deleted successfully" });
  } catch (err) {
    console.error("Delete paper error:", err);
    res.status(500).json({ message: err.message });
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
      return res.status(400).json({ message: "Subject, title and fileUrl are required" });
    }

    const targetBranch = branch || req.user.branch || "CSE";
    if (!canAccess(req.user, targetBranch)) {
      return res.status(403).json({ message: "You can only upload for your own branch" });
    }

    const material = await Material.create({ branch: targetBranch, subject, title, fileUrl });

    notifyUsers({ branch: targetBranch }, `📖 New Study Material: ${subject}`, title);

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
    if (!canViewTimetable(req.user, branch, section)) {
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
    if (!canViewTimetable(req.user, branch, section)) {
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

// Bulk timetable upload — updates ALL sections of a branch in one go.
// Excel: Sheet 1 "Schedule" columns = section, day, period, subject (one row per period)
//        Sheet 2 "Timings" (optional) columns = period, label, start, end, type — shared across all sections
// NOTE: writes go through the native MongoDB driver (mongoose.connection.collection)
// instead of the Mongoose model, to sidestep a stale-schema cast issue seen in
// production — this bypasses Mongoose casting entirely and is proven reliable.
app.post("/api/admin/upload-timetable", hodOrAdminMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const branch = req.body.branch || req.user.branch;
    if (!canAccess(req.user, branch)) {
      return res.status(403).json({ message: "You can only manage your own branch's timetable" });
    }

    const workbook = XLSX.read(req.files.file.data, { type: "buffer" });

    const scheduleSheetName = workbook.SheetNames.find(n => n.toLowerCase() === "schedule") || workbook.SheetNames[0];
    const scheduleRows = XLSX.utils.sheet_to_json(workbook.Sheets[scheduleSheetName]);
    if (!scheduleRows || scheduleRows.length === 0) {
      return res.status(400).json({ message: "Schedule sheet is empty" });
    }

    let timings = [];
    const timingsSheetName = workbook.SheetNames.find(n => n.toLowerCase() === "timings");
    if (timingsSheetName) {
      const timingRows = XLSX.utils.sheet_to_json(workbook.Sheets[timingsSheetName]);
      timings = timingRows
        .sort((a, b) => Number(a.period) - Number(b.period))
        .map(r => ({
          label: String(r.label ?? r.period ?? ""),
          start: String(r.start ?? ""),
          end: String(r.end ?? ""),
          type: String(r.type ?? "class")
        }));
    }

    // Group rows by section -> day -> ordered-by-period subject list.
    // Section is normalized to digits only so "Sec - 7", "Section 7", "7" all
    // map to the same section key as what's already stored in the DB.
    const bySection = {};
    for (const row of scheduleRows) {
      const section = String(row.section || "").replace(/[^0-9]/g, "").trim();
      const day = String(row.day || "").trim().toUpperCase().slice(0, 3);
      const period = Number(row.period);
      const subject = String(row.subject || "").trim();
      if (!section || !day || !period || !subject) continue;

      if (!bySection[section]) bySection[section] = {};
      if (!bySection[section][day]) bySection[section][day] = [];
      bySection[section][day][period - 1] = subject;
    }

    const sectionsUpdated = Object.keys(bySection);
    if (sectionsUpdated.length === 0) {
      return res.status(400).json({ message: "No valid rows found (check section/day/period/subject columns)" });
    }

    for (const section of sectionsUpdated) {
      const schedule = {};
      for (const day of Object.keys(bySection[section])) {
        schedule[day] = Array.from({ length: bySection[section][day].length }, (_, i) => bySection[section][day][i] || "");
      }

      const update = { branch, section, schedule };
      if (timings.length > 0) update.timings = timings;

      await mongoose.connection.collection("timetables").updateOne(
        { branch, section },
        { $set: timings.length > 0 ? update : { branch, section, schedule } },
        { upsert: true }
      );
    }

    res.json({ message: `✅ Updated timetables for ${sectionsUpdated.length} sections`, sections: sectionsUpdated });
  } catch (err) {
    console.error("Bulk timetable upload error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Create/update a single section's timetable — HOD (own branch) or Admin
app.post("/api/timetable", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch, section, timings, schedule } = req.body;
    if (!branch || !section || !schedule) {
      return res.status(400).json({ message: "branch, section and schedule are required" });
    }
    if (!canAccess(req.user, branch)) {
      return res.status(403).json({ message: "You can only manage your own branch's timetable" });
    }

    await mongoose.connection.collection("timetables").updateOne(
      { branch, section },
      { $set: { branch, section, timings: timings || [], schedule } },
      { upsert: true }
    );

    const timetable = await Timetable.findOne({ branch, section }).lean();
    res.status(201).json(timetable);
  } catch (err) {
    console.error("Save timetable error:", err);
    res.status(500).json({ message: err.message });
  }
});

// List students in a branch+section — used by faculty/HOD to build attendance rosters
app.get("/api/students/:branch/:section", verifyAnyToken, async (req, res) => {
  try {
    if (!["faculty", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { branch, section } = req.params;
    if (!canAccess(req.user, branch, section)) {
      return res.status(403).json({ message: "Not authorized for this branch/section" });
    }
    const students = await User.find({ branch, section }).select("rollNo name isCR").sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    console.error("List students error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Set/unset a student as CR (Class Representative) — HOD (own branch) or Admin
app.post("/api/admin/set-cr", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { rollNo, isCR } = req.body;
    if (!rollNo || typeof isCR !== "boolean") {
      return res.status(400).json({ message: "rollNo and isCR (true/false) are required" });
    }

    const student = await User.findOne({ rollNo });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!canAccess(req.user, student.branch, student.section)) {
      return res.status(403).json({ message: "Not authorized for this student's branch/section" });
    }

    await User.updateOne({ rollNo }, { isCR });
    res.json({ message: `${student.name} (${rollNo}) is ${isCR ? "now a CR ⭐" : "no longer a CR"}` });
  } catch (err) {
    console.error("Set CR error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== ATTENDANCE ==============

// Faculty/HOD marks attendance for a whole section, one subject, one date.
// body: { branch, section, subject, date, records: [{ rollNo, status }] }
app.post("/api/attendance/mark", facultyMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can mark attendance (not HOD)" });
    }

    const { branch, section, subject, date, records } = req.body;

    if (!branch || !section || !subject || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "branch, section, subject, date and records[] are required" });
    }

    if (!canAccess(req.user, branch, section)) {
      return res.status(403).json({ message: "You are not assigned to this section" });
    }

    const ops = [];
    for (const r of records) {
      if (
  !r.rollNo ||
  !["present", "absent"].includes(r.status)
) {
  continue;
}
      const student = await User.findOne({
  rollNo: r.rollNo,
  branch,
  section
});
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

    const bySubject = {};
    for (const r of records) {
      if (!bySubject[r.subject]) bySubject[r.subject] = { total: 0, present: 0 };
      bySubject[r.subject].total++;
      if (r.status === "present") bySubject[r.subject].present++;
    }
    const subjectSummary = Object.entries(bySubject).map(([subject, s]) => ({
      subject,
      total: s.total,
      present: s.present,
      percentage: ((s.present / s.total) * 100).toFixed(1)
    }));

    res.json({ records, summary: { totalClasses, present, percentage }, subjectSummary });
  } catch (err) {
    console.error("Get my attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

// HOD/Admin: branch-wide attendance report — per-student percentage, flags low attendance (<75%)
app.get("/api/attendance/branch-report/:branch", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch } = req.params;
    if (!canAccess(req.user, branch)) {
      return res.status(403).json({ message: "Not authorized for this branch" });
    }

    const report = await Attendance.aggregate([
      { $match: { branch } },
      {
        $group: {
          _id: { rollNo: "$rollNo", section: "$section" },
          studentName: { $first: "$studentName" },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          rollNo: "$_id.rollNo",
          section: "$_id.section",
          studentName: 1,
          total: 1,
          present: 1,
          percentage: { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 1] }
        }
      },
      { $sort: { section: 1, rollNo: 1 } }
    ]);

    const sectionSummaryMap = {};
    for (const r of report) {
      if (!sectionSummaryMap[r.section]) sectionSummaryMap[r.section] = { total: 0, sumPct: 0, count: 0 };
      sectionSummaryMap[r.section].sumPct += r.percentage;
      sectionSummaryMap[r.section].count += 1;
    }
    const sectionSummary = Object.entries(sectionSummaryMap).map(([section, s]) => ({
      section,
      studentsTracked: s.count,
      avgPercentage: (s.sumPct / s.count).toFixed(1)
    }));

    res.json({
      branch,
      students: report,
      sectionSummary,
      lowAttendance: report.filter(r => r.percentage < 75)
    });
  } catch (err) {
    console.error("Branch attendance report error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== ATTENDANCE EXPORT & CLEANUP ==============
// Lets HOD/Admin pull a filtered slice of attendance records (for Excel
// export on the frontend via the xlsx library) and then optionally wipe
// those same records from the DB afterward, to keep the collection small.

app.get("/api/attendance/export/:branch", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch } = req.params;
    const { section, subject, startDate, endDate } = req.query;

    if (!canAccess(req.user, branch)) {
      return res.status(403).json({ message: "You can only export your own branch's attendance" });
    }

    const filter = { branch };
    if (section) filter.section = String(section);
    if (subject) filter.subject = String(subject);

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = String(startDate);
      if (endDate) filter.date.$lte = String(endDate);
    }

    const records = await Attendance.find(filter).sort({ date: -1, section: 1, rollNo: 1 });

    res.json(records);
  } catch (err) {
    console.error("Export attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/attendance/delete/:branch", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch } = req.params;
    const { section, subject, startDate, endDate } = req.query;

    if (!canAccess(req.user, branch)) {
      return res.status(403).json({ message: "You can only delete your own branch's attendance" });
    }

    const filter = { branch };
    if (section) filter.section = String(section);
    if (subject) filter.subject = String(subject);

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = String(startDate);
      if (endDate) filter.date.$lte = String(endDate);
    }

    const result = await Attendance.deleteMany(filter);

    res.json({
      message: `✅ Deleted ${result.deletedCount} attendance records from database`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Delete attendance error:", err);
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

    const fullText = `You are a helpful NRI Institute CSE student assistant. Answer questions about DBMS, OS, CN, DS, and other CSE subjects. Be helpful and concise. Answer in English only.\n\nQuestion: ${message}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: fullText }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Invalid response:", response.data);
      return res.status(500).json({ message: "Invalid response from AI" });
    }

    const reply = response.data.candidates[0].content.parts[0].text;
    res.json({ reply });
  } catch (err) {
    console.error("Chat Error:", { message: err.message, status: err.response?.status, data: err.response?.data });

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

    let added = 0, updated = 0, skipped = 0;

    for (const row of data) {
      const rollNo = String(row.rollNo || "").trim();
      if (!rollNo) { skipped++; continue; }

      const newBranch = String(row.branch || "CSE").trim();
      const newSection = String(row.section || "").trim();
      const newName = String(row.name || "").trim();

      const existing = await User.findOne({ rollNo });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD, 10);
        await User.create({
          rollNo,
          name: newName,
          section: newSection,
          branch: newBranch,
          password: hashedPassword
        });
        added++;
      } else {
        const changes = {};
        if (newBranch && existing.branch !== newBranch) changes.branch = newBranch;
        if (newSection && existing.section !== newSection) changes.section = newSection;
        if (newName && existing.name !== newName) changes.name = newName;

        if (Object.keys(changes).length > 0) {
          await User.updateOne({ rollNo }, changes);
          updated++;
        } else {
          skipped++;
        }
      }
    }

    res.json({ message: `✅ Added: ${added} 🔄 Updated: ${updated} ⏭️ Skipped: ${skipped}` });
  } catch (err) {
    console.error("Upload students error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Bulk faculty/HOD upload via Excel
// Excel columns: facultyId, name, branch, role, sections
app.post("/api/admin/upload-faculty", adminMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    if (!process.env.DEFAULT_PASSWORD) {
      return res.status(500).json({
        message: "Server misconfigured: DEFAULT_PASSWORD env var is not set"
      });
    }

    const file = req.files.file;

    const workbook = XLSX.read(file.data, {
      type: "buffer"
    });

    const sheetName = workbook.SheetNames[0];

    const data = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    if (!data || data.length === 0) {
      return res.status(400).json({
        message: "Excel file is empty"
      });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    const skippedReasons = [];

    for (const row of data) {

      const facultyId = String(
        row.facultyId || ""
      ).trim();

      const name = String(
        row.name || ""
      ).trim();

      const branch = String(
        row.branch || ""
      ).trim();

      const role =
        String(row.role || "faculty")
          .trim()
          .toLowerCase() === "hod"
          ? "hod"
          : "faculty";

      const sections = String(
        row.sections || ""
      )
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);


      // Validation
      if (!facultyId || !name || !branch) {
        skipped++;

        skippedReasons.push(
          `Row skipped (missing facultyId/name/branch): ${JSON.stringify(row)}`
        );

        continue;
      }


      // Check existing faculty
      const existing = await Faculty.findOne({
        facultyId
      });


      // =====================================
      // EXISTING FACULTY → UPDATE
      // =====================================

      if (existing) {

        // Prevent duplicate HOD in same branch
        if (
          role === "hod" &&
          (
            existing.role !== "hod" ||
            existing.branch !== branch
          )
        ) {

          const existingHod = await Faculty.findOne({
            branch,
            role: "hod",
            facultyId: { $ne: facultyId }
          });

          if (existingHod) {
            skipped++;

            skippedReasons.push(
              `${facultyId} cannot be updated as HOD because ${branch} already has HOD ${existingHod.facultyId}`
            );

            continue;
          }
        }


        // Update Excel-related fields only
        // Password is NOT changed
        // isFirstLogin is NOT changed

        existing.name = name;
        existing.branch = branch;
        existing.role = role;

        existing.assignedSections =
          role === "hod"
            ? []
            : sections;

        await existing.save();

        updated++;

        continue;
      }


      // =====================================
      // NEW FACULTY → ADD
      // =====================================

      if (role === "hod") {

        const existingHod = await Faculty.findOne({
          branch,
          role: "hod"
        });

        if (existingHod) {
          skipped++;

          skippedReasons.push(
            `${branch} already has an HOD (${existingHod.facultyId}), skipped ${facultyId}`
          );

          continue;
        }
      }


      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_PASSWORD,
        10
      );


      await Faculty.create({
        facultyId,
        name,
        branch,
        role,

        assignedSections:
          role === "hod"
            ? []
            : sections,

        password: hashedPassword,

        isFirstLogin: true
      });

      added++;
    }


    res.json({
      message:
        `✅ Added: ${added} 🔄 Updated: ${updated} ⏭️ Skipped: ${skipped}`,

      added,
      updated,
      skipped,

      skippedReasons
    });

  } catch (err) {

    console.error(
      "Upload faculty error:",
      err
    );

    res.status(500).json({
      message: err.message
    });
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
      { resource_type: "auto", folder: "nri-hub", timeout: 60000 },
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
      { fcmToken: token, lastNotificationTime: new Date() },
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
    const { rollNo, title, body } = req.body;

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
    const { section, title, body } = req.body;

    if (!section || !title || !body) {
      return res.status(400).json({ message: "section, title, and body required" });
    }

    await notifyUsers({ section }, title, body);

    res.json({ success: true, message: `Notification sent to Section ${section}` });
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

    const everLoggedIn = await User.countDocuments({ lastLogin: { $exists: true } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeToday = await User.countDocuments({ lastLogin: { $gte: today } });

    const week = new Date();
    week.setDate(week.getDate() - 7);

    const activeThisWeek = await User.countDocuments({ lastLogin: { $gte: week } });

    const sectionCounts = await User.aggregate([
      { $group: { _id: { branch: "$branch", section: "$section" }, count: { $sum: 1 } } },
      { $sort: { "_id.branch": 1, "_id.section": 1 } },
      { $project: { _id: 0, branch: "$_id.branch", section: "$_id.section", count: 1 } }
    ]);

    res.json({
      totalStudents, totalNotices, totalNotes, totalAssignments, totalPapers, totalMaterials,
      everLoggedIn, activeToday, activeThisWeek, sectionCounts
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
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
      totalStudents, totalFaculty, totalNotes, totalAssignments, totalPapers, totalMaterials,
      sectionCounts
    });
  } catch (err) {
    console.error("HOD stats error:", err);
    res.status(500).json({ message: err.message });
  }
});
// ============== CODING ANALYTICS ==============

app.get("/api/lms/coding/analytics", hodOrAdminMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const isHod = req.user.role === "hod";

    if (!isAdmin && !isHod) {
      return res.status(403).json({
        message: "Only Admin and HOD can view coding analytics"
      });
    }

    // Admin → all students
    // HOD → only students from their branch
    const studentFilter = isHod
      ? { role: "student", branch: req.user.branch }
      : { role: "student" };

    const students = await User.find(
      studentFilter,
      "_id name rollNo branch section"
    ).lean();

    const studentIds = students.map(student => student._id);

    const progress = await CodingProgress.find({
      studentId: { $in: studentIds }
    })
      .populate("studentId", "name rollNo branch section")
      .lean();

    const attempts = await DailyChallengeAttempt.find({
      studentId: { $in: studentIds }
    })
      .populate("studentId", "name rollNo branch section")
      .lean();

    res.json({
      success: true,
      scope: isAdmin ? "all" : "branch",
      branch: isAdmin ? "ALL" : req.user.branch,
      students,
      progress,
      attempts
    });

  } catch (err) {
    console.error("Coding analytics error:", err);
    res.status(500).json({
      message: "Failed to load coding analytics"
    });
  }
});
// ============== HEALTH CHECK ==============

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date(), version: "v-attendance-export-2026-09" });
});

app.get("/api/debug/schema", (req, res) => {
  res.json({
    timingsPath: Timetable.schema.path("timings")?.instance,
    timingsCaster: Timetable.schema.path("timings")?.caster?.instance,
  });
});

// ============== ERROR HANDLING ==============

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ============== START SERVER ==============

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server running on ${PORT} 🚀`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
});