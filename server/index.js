import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    initializeApp({ credential: cert(serviceAccount) });
    console.log("Firebase initialized ✅");
  } catch (err) {
    console.log("Firebase init skipped:", err.message);
  }
} else {
  console.log("Firebase not configured - skipping");
}

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("MongoDB Error:", err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "nri-hub",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    resource_type: "image"
  })
});
const upload = multer({ storage: fileStorage });
const xlsxUpload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Admin only" });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const userSchema = new mongoose.Schema({
  rollNo: { type: String, unique: true },
  name: String,
  section: String,
  year: String,
  password: String,
  isFirstLogin: { type: Boolean, default: true },
  loginCount: { type: Number, default: 0 },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

const noticeSchema = new mongoose.Schema({ title: String, description: String, createdAt: { type: Date, default: Date.now } });
const noteSchema = new mongoose.Schema({title: String, subject: String, semester: String,section: String, fileUrl: String, fileType: String,createdAt: { type: Date, default: Date.now }});
const assignmentSchema = new mongoose.Schema({title: String, subject: String, semester: String,dueDate: String, fileUrl: String,createdAt: { type: Date, default: Date.now }});
const paperSchema = new mongoose.Schema({title: String, subject: String, semester: String,year: String, fileUrl: String,createdAt: { type: Date, default: Date.now }});
const studyMaterialSchema = new mongoose.Schema({title: String, subject: String, semester: String,fileUrl: String, createdAt: { type: Date, default: Date.now }});
const timetableSchema = new mongoose.Schema({ section: String, timings: Array, schedule: Object });
const fcmTokenSchema = new mongoose.Schema({ token: String, createdAt: { type: Date, default: Date.now } });

const attendanceRecordSchema = new mongoose.Schema({
  section: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  date: { type: String, required: true, index: true },
  records: [{ rollNo: String, name: String, status: { type: String, enum: ['present', 'absent'], default: 'absent' } }],
  markedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
attendanceRecordSchema.index({ section: 1, date: 1, subject: 1 });

const attendanceSummarySchema = new mongoose.Schema({
  rollNo: { type: String, unique: true, required: true, index: true },
  section: String,
  name: String,
  totalClasses: { type: Number, default: 0 },
  presentCount: { type: Number, default: 0 },
  absentCount: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Notice = mongoose.model("Notice", noticeSchema);
const Note = mongoose.model("Note", noteSchema);
const Assignment = mongoose.model("Assignment", assignmentSchema);
const Paper = mongoose.model("Paper", paperSchema);
const StudyMaterial = mongoose.model("StudyMaterial", studyMaterialSchema);
const Timetable = mongoose.model("Timetable", timetableSchema);
const FCMToken = mongoose.model("FCMToken", fcmTokenSchema);
const AttendanceRecord = mongoose.model("AttendanceRecord", attendanceRecordSchema);
const AttendanceSummary = mongoose.model("AttendanceSummary", attendanceSummarySchema);

app.get("/", (req, res) => res.send("NRI Hub Server 🚀"));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, role: "admin" });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.post("/api/student/login", async (req, res) => {
  try {
    const { rollNo, password } = req.body;
    const user = await User.findOne({ rollNo: rollNo.toUpperCase().trim() });
    if (!user) return res.status(404).json({ message: "Roll number not found!" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Wrong password!" });
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ rollNo: user.rollNo, role: "student", section: user.section }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, role: "student", user: { rollNo: user.rollNo, name: user.name, section: user.section, year: user.year, isFirstLogin: user.isFirstLogin } });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

app.post("/api/student/change-password", authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ rollNo: req.user.rollNo }, { password: hashed, isFirstLogin: false });
    res.json({ message: "Password changed!" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

app.post("/api/student/forgot-password", async (req, res) => {
  try {
    const { rollNo, name, section, newPassword } = req.body;
    const user = await User.findOne({rollNo: rollNo.toUpperCase().trim(),name: name.trim(),section: section.trim()});
    if (!user) return res.status(404).json({message: "Student details not matched!"});
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.isFirstLogin = false;
    await user.save();
    res.json({message: "Password reset successful!"});
  } catch (err) {
    res.status(500).json({message: "Server error: " + err.message});
  }
});
// ============== PUSH NOTIFICATIONS ==============
// Subscribe student to push notifications
app.post("/api/notifications/subscribe", async (req, res) => {
  try {
    const { token, rollNo, name } = req.body;

    // Save FCM token to database
    await User.findOneAndUpdate(
      { rollNo },
      { fcmToken: token, lastNotificationTime: new Date() },
      { upsert: true }
    );

    res.json({ success: true, message: "Subscribed to notifications" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send notification to specific student
app.post("/api/notifications/send", adminMiddleware, async (req, res) => {
  try {
    const { rollNo, title, body, type } = req.body;

    const user = await User.findOne({ rollNo });
    if (!user || !user.fcmToken) {
      return res.status(404).json({ message: "User not found or no FCM token" });
    }

    // Import admin SDK
    const admin = require("firebase-admin");
    
    const message = {
      notification: {
        title,
        body
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: true
        }
      },
      token: user.fcmToken
    };

    await admin.messaging().send(message);
    
    res.json({ success: true, message: "Notification sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Broadcast notification to all students in section
app.post("/api/notifications/broadcast", adminMiddleware, async (req, res) => {
  try {
    const { section, title, body, type } = req.body;

    const users = await User.find({ section, fcmToken: { $exists: true } });
    
    if (users.length === 0) {
      return res.json({ message: "No users to notify" });
    }

    const admin = require("firebase-admin");
    const tokens = users.map(u => u.fcmToken);

    for (let token of tokens) {
      await admin.messaging().send({
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            requireInteraction: true
          }
        },
        token
      });
    }

    res.json({ success: true, message: `Sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ============== END NOTIFICATIONS ==============
// ✅ FIXED UPLOAD - ENSURES SECTION IS STRING
app.post("/api/admin/upload-students", adminMiddleware, xlsxUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded!" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`📊 Upload: ${data.length} rows`);
    let count = 0, skipped = 0;
    for (const row of data) {
      try {
        const keys = Object.keys(row);
        const getValue = (possibleNames) => {
          for (const name of possibleNames) {
            const matchKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
            if (matchKey && row[matchKey] !== undefined && row[matchKey] !== "") {
              return String(row[matchKey]).trim();
            }
          }
          return null;
        };
        const rollNo = (getValue(["rollNo", "ROLL NO", "Roll No", "RollNo"]) || "").toUpperCase();
        const name = getValue(["name", "NAME", "Name"]) || "";
        const section = String(getValue(["section", "SECTION", "Section"]) || "").trim(); // ✅ STRING!
        const branch = getValue(["branch", "BRANCH", "Branch"]) || "CSE";
        const year = getValue(["year", "YEAR", "Year"]) || "2";
        if (!rollNo) { skipped++; continue; }
        const existing = await User.findOne({ rollNo });
        if (!existing) {
          const hashed = await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10);
          await User.create({ rollNo, name, section, branch, year, password: hashed });
          count++;
        } else {
          skipped++;
        }
      } catch (innerErr) {
        console.error("Row error:", innerErr.message);
        skipped++;
      }
    }
    res.json({ message: `✅ ${count} students added! (${skipped} skipped/existed)` });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Error: " + err.message });
  }
});
app.get("/api/sections", async (req, res) => {
  try {
    // Return all 24 sections (1-24) regardless of students
    const allSections = Array.from({ length: 24 }, (_, i) => String(i + 1));
    res.json(allSections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get("/api/admin/stats", adminMiddleware, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalNotices = await Notice.countDocuments();
    const totalNotes = await Note.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalPapers = await Paper.countDocuments();
    const totalMaterials = await StudyMaterial.countDocuments();
    const totalSubscriptions = await FCMToken.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeToday = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeThisWeek = await User.countDocuments({ lastLogin: { $gte: sevenDaysAgo } });
    const everLoggedIn = await User.countDocuments({ loginCount: { $gt: 0 } });
    const sectionCounts = await User.aggregate([{ $group: { _id: "$section", count: { $sum: 1 } } },{ $sort: { _id: 1 } }]);
    res.json({ totalStudents, totalNotices, totalNotes, totalAssignments, totalPapers, totalMaterials, totalSubscriptions, activeToday, activeThisWeek, everLoggedIn, sectionCounts });
  } catch (err) {
    res.status(500).json({ message: "Error: " + err.message });
  }
});

app.post("/api/fcm-subscribe", async (req, res) => {
  try {
    const { token } = req.body;
    const existing = await FCMToken.findOne({ token });
    if (!existing) {
      await new FCMToken({ token }).save();
    }
    res.json({ message: "Subscribed!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/fcm-count", async (req, res) => {
  try {
    const count = await FCMToken.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const prompt = `You are NRI Hub AI Assistant for CSE students at NRI Institute of Technology.`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt + message);
      const reply = result.response.text();
      return res.json({ reply });
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
    }
  }
  res.status(500).json({ reply: "Sorry, try again in a moment!" });
});

app.get("/api/students", async (req, res) => {
  try {
    const students = await User.find({}, "rollNo name section");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/notices", async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notices", adminMiddleware, async (req, res) => {
  try {
    const notice = new Notice(req.body);
    await notice.save();
    res.json(notice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notices/:id", adminMiddleware, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/notes", async (req, res) => {
  try {
    const { section } = req.query;
    const notes = await Note.find(section ? { section } : {}).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notes", adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { subject, semester, title, section } = req.body;
    const note = new Note({ title, subject, semester, section, fileUrl: req.file.path, fileType: req.file.mimetype });
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notes/:id", adminMiddleware, async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/assignments", adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, subject, semester, dueDate } = req.body;
    const assignment = new Assignment({ title, subject, semester, dueDate, fileUrl: req.file?.path });
    await assignment.save();
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/assignments/:id", adminMiddleware, async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/papers", async (req, res) => {
  try {
    const papers = await Paper.find().sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/papers", adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, subject, semester, year } = req.body;
    const paper = new Paper({ title, subject, semester, year, fileUrl: req.file.path });
    await paper.save();
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/papers/:id", adminMiddleware, async (req, res) => {
  try {
    await Paper.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/materials", async (req, res) => {
  try {
    const materials = await StudyMaterial.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/materials", adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, subject, semester } = req.body;
    const material = new StudyMaterial({ title, subject, semester, fileUrl: req.file.path });
    await material.save();
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/materials/:id", adminMiddleware, async (req, res) => {
  try {
    await StudyMaterial.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/timetables", async (req, res) => {
  try {
    const timetables = await Timetable.find();
    res.json(timetables.map(t => t.section));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/timetable/:section", async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ section: req.params.section });
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/timetable/:section", adminMiddleware, async (req, res) => {
  try {
    const { timings, schedule } = req.body;
    await Timetable.findOneAndUpdate({ section: req.params.section }, { section: req.params.section, timings, schedule }, { upsert: true, new: true });
    res.json({ message: "Saved!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/timetable/:section", adminMiddleware, async (req, res) => {
  try {
    await Timetable.findOneAndDelete({ section: req.params.section });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/attendance/section/:section/students", adminMiddleware, async (req, res) => {
  try {
    const { section } = req.params;
    const students = await User.find({ section }, "rollNo name section").sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/attendance/section/:section/date/:date", adminMiddleware, async (req, res) => {
  try {
    const { section, date } = req.params;
    const { subject } = req.query;
    const record = await AttendanceRecord.findOne({section, date, subject});
    if (!record) {
      const students = await User.find({ section }, "rollNo name").sort({ rollNo: 1 });
      return res.json({ section, date, subject, records: students.map(s => ({rollNo: s.rollNo, name: s.name, status: "absent"}))});
    }
    res.json({section, date, subject, records: record.records});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/attendance/mark", adminMiddleware, async (req, res) => {
  try {
    const { section, subject, date, records } = req.body;
    if (!section || !subject || !date || !records) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    let attendance = await AttendanceRecord.findOne({section, date, subject});
    if (!attendance) {
      attendance = new AttendanceRecord({section, subject, date, records, markedBy: req.user.username, createdAt: new Date(), updatedAt: new Date()});
    } else {
      attendance.records = records;
      attendance.updatedAt = new Date();
    }
    await attendance.save();
    for (let rec of records) {
      let summary = await AttendanceSummary.findOne({ rollNo: rec.rollNo });
      if (!summary) {
        summary = new AttendanceSummary({
          rollNo: rec.rollNo,
          section,
          name: rec.name,
          totalClasses: 1,
          presentCount: rec.status === "present" ? 1 : 0,
          absentCount: rec.status === "absent" ? 1 : 0
        });
      } else {
        summary.totalClasses = (summary.totalClasses || 0) + 1;
        if (rec.status === "present") {
          summary.presentCount = (summary.presentCount || 0) + 1;
        } else {
          summary.absentCount = (summary.absentCount || 0) + 1;
        }
      }
      summary.percentage = summary.totalClasses > 0 
        ? (summary.presentCount / summary.totalClasses) * 100 
        : 0;
      summary.lastUpdated = new Date();
      await summary.save();
    }
    res.json({ message: "Attendance marked successfully", data: attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/attendance/report/all-sections", adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    const records = await AttendanceRecord.find(query).sort({ date: -1 });
    const sectionData = {};
    records.forEach(rec => {
      if (!sectionData[rec.section]) {
        sectionData[rec.section] = { section: rec.section, totalClasses: 0, dates: [], subjects: new Set(), studentStats: {} };
      }
      sectionData[rec.section].totalClasses++;
      sectionData[rec.section].dates.push(rec.date);
      sectionData[rec.section].subjects.add(rec.subject);
      rec.records.forEach(student => {
        if (!sectionData[rec.section].studentStats[student.rollNo]) {
          sectionData[rec.section].studentStats[student.rollNo] = {
            rollNo: student.rollNo,
            name: student.name,
            present: 0,
            absent: 0
          };
        }
        if (student.status === "present") {
          sectionData[rec.section].studentStats[student.rollNo].present++;
        } else {
          sectionData[rec.section].studentStats[student.rollNo].absent++;
        }
      });
    });
    const result = Object.values(sectionData).map(section => {
      const students = Object.values(section.studentStats).map(student => ({
        ...student,
        percentage: student.present + student.absent > 0 
          ? ((student.present / (student.present + student.absent)) * 100).toFixed(2)
          : 0
      }));
      return {
        section: section.section,
        totalClasses: section.totalClasses,
        subjects: Array.from(section.subjects),
        uniqueDates: [...new Set(section.dates)].length,
        students: students.sort((a, b) => b.percentage - a.percentage)
      };
    });
    res.json({
      period: { startDate, endDate },
      sections: result.sort((a, b) => {
        const secA = parseInt(a.section);
        const secB = parseInt(b.section);
        return secA - secB;
      })
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/attendance/report/section/:section", adminMiddleware, async (req, res) => {
  try {
    const { section } = req.params;
    const { startDate, endDate } = req.query;
    const query = { section };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    const records = await AttendanceRecord.find(query).sort({ date: -1 });
    const dates = [...new Set(records.map(r => r.date))];
    const subjects = [...new Set(records.map(r => r.subject))];
    const students = await User.find({ section }, "rollNo name").sort({ rollNo: 1 });
    const attendanceMatrix = {};
    students.forEach(student => {
      attendanceMatrix[student.rollNo] = {
        rollNo: student.rollNo,
        name: student.name,
        present: 0,
        absent: 0,
        percentage: 0
      };
    });
    records.forEach(rec => {
      rec.records.forEach(student => {
        if (attendanceMatrix[student.rollNo]) {
          if (student.status === "present") {
            attendanceMatrix[student.rollNo].present++;
          } else {
            attendanceMatrix[student.rollNo].absent++;
          }
        }
      });
    });
    Object.values(attendanceMatrix).forEach(student => {
      const total = student.present + student.absent;
      student.percentage = total > 0 ? ((student.present / total) * 100).toFixed(2) : 0;
    });
    res.json({
      section,
      period: { startDate, endDate },
      totalClasses: records.length,
      uniqueDates: dates.length,
      subjects,
      students: Object.values(attendanceMatrix).sort((a, b) => b.percentage - a.percentage)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.delete("/api/attendance/mark/:section/:date/:subject", adminMiddleware, async (req, res) => {
  try {
    const { section, date, subject } = req.params;

    await AttendanceRecord.deleteOne({
      section,
      date,
      subject
    });

    res.json({ message: "✅ Attendance deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get("/api/attendance/student/:rollNo", async (req, res) => {
  try {
    const { rollNo } = req.params;
    const summary = await AttendanceSummary.findOne({ rollNo: rollNo.toUpperCase() });
    if (!summary) {
      return res.json({
        rollNo: rollNo.toUpperCase(),
        totalClasses: 0,
        presentCount: 0,
        absentCount: 0,
        percentage: 0,
        message: "No attendance data found"
      });
    }
    res.json({
      rollNo: summary.rollNo,
      section: summary.section,
      name: summary.name,
      totalClasses: summary.totalClasses,
      presentCount: summary.presentCount,
      absentCount: summary.absentCount,
      percentage: summary.percentage.toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(3001, () => console.log("Server running on 3001 🚀"));
// ==================== FIXED ADMIN UPLOAD ROUTE ====================

app.post("/api/admin/upload-students", adminMiddleware, xlsxUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded!" });
    
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Excel upload started: ${data.length} rows`);

    let count = 0;
    let skipped = 0;
    let errors = [];

    for (const row of data) {
      try {
        const keys = Object.keys(row);
        
        // Better key matching - case insensitive
        const getValue = (possibleNames) => {
          for (const name of possibleNames) {
            const matchKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
            if (matchKey && row[matchKey] !== undefined && row[matchKey] !== "") {
              return String(row[matchKey]).trim();
            }
          }
          return null;
        };

        const rollNo = (getValue(["rollNo", "ROLL NO", "Roll No", "RollNo", "roll no"]) || "").toUpperCase();
        const name = getValue(["name", "NAME", "Name"]) || "";
        const sectionRaw = getValue(["section", "SECTION", "Section"]) || "";
        const section = String(sectionRaw).trim(); // ENSURE STRING
        const branch = getValue(["branch", "BRANCH", "Branch"]) || "CSE";
        const year = getValue(["year", "YEAR", "Year"]) || "2";

        if (!rollNo) {
          skipped++;
          continue;
        }

        console.log(`Processing: ${rollNo} | ${name} | Section: ${section}`);

        const existing = await User.findOne({ rollNo });
        
        if (!existing) {
          const hashed = await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10);
          await User.create({
            rollNo,
            name,
            section, // STRING
            branch,
            year,
            password: hashed
          });
          count++;
          console.log(`✅ Added: ${rollNo}`);
        } else {
          skipped++;
          console.log(`⏭️  Skipped (exists): ${rollNo}`);
        }
      } catch (innerErr) {
        errors.push(`Row error: ${innerErr.message}`);
        console.error("Row error:", innerErr);
        skipped++;
      }
    }

    console.log(`📈 Upload complete: ${count} added, ${skipped} skipped`);
    
    res.json({ 
      message: `✅ ${count} students added! (${skipped} skipped/existed)`,
      details: {
        added: count,
        skipped: skipped,
        total: data.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("❌ Excel upload error:", err);
    res.status(500).json({ 
      message: "Error: " + err.message,
      error: err.toString()
    });
  }
});

// ==================== DEBUG ROUTE - Check Students by Section ====================

app.get("/api/admin/students-by-section", adminMiddleware, async (req, res) => {
  try {
    const sections = await User.aggregate([
      { $group: { _id: "$section", count: { $sum: 1 }, sample: { $first: "$$ROOT" } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      totalStudents: await User.countDocuments(),
      bySection: sections.map(s => ({
        section: s._id,
        sectionType: typeof s._id,
        count: s.count,
        sampleStudent: { rollNo: s.sample.rollNo, name: s.sample.name, section: s.sample.section }
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
