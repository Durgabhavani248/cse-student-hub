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

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Init
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  initializeApp({ credential: cert(serviceAccount) });
  console.log("Firebase initialized ✅");
} catch (err) {
  console.log("Firebase init skipped:", err.message);
}

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("MongoDB Error:", err));

// Cloudinary Config
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
    resource_type: file.mimetype === "application/pdf" ? "raw" : "image"
  })
});
const upload = multer({ storage: fileStorage });
const xlsxUpload = multer({ storage: multer.memoryStorage() });

// Auth Middleware
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

// Schemas
const userSchema = new mongoose.Schema({
  rollNo: { type: String, unique: true },
  name: String,
  section: String,
  year: String,
  password: String,
  isFirstLogin: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const noticeSchema = new mongoose.Schema({ title: String, description: String, createdAt: { type: Date, default: Date.now } });

const noteSchema = new mongoose.Schema({
  title: String, subject: String, semester: String,
  section: String, fileUrl: String, fileType: String,
  createdAt: { type: Date, default: Date.now }
});

const assignmentSchema = new mongoose.Schema({
  title: String, subject: String, semester: String,
  dueDate: String, fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const paperSchema = new mongoose.Schema({
  title: String, subject: String, semester: String,
  year: String, fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const studyMaterialSchema = new mongoose.Schema({
  title: String, subject: String, semester: String,
  fileUrl: String, createdAt: { type: Date, default: Date.now }
});

const timetableSchema = new mongoose.Schema({ section: String, timings: Array, schedule: Object });

const fcmTokenSchema = new mongoose.Schema({ token: String, createdAt: { type: Date, default: Date.now } });

const User = mongoose.model("User", userSchema);
const Notice = mongoose.model("Notice", noticeSchema);
const Note = mongoose.model("Note", noteSchema);
const Assignment = mongoose.model("Assignment", assignmentSchema);
const Paper = mongoose.model("Paper", paperSchema);
const StudyMaterial = mongoose.model("StudyMaterial", studyMaterialSchema);
const Timetable = mongoose.model("Timetable", timetableSchema);
const FCMToken = mongoose.model("FCMToken", fcmTokenSchema);

// HOME
app.get("/", (req, res) => res.send("NRI Hub Server 🚀"));

// ADMIN LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, role: "admin" });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// STUDENT LOGIN
app.post("/api/student/login", async (req, res) => {
  const { rollNo, password } = req.body;
  const user = await User.findOne({ rollNo: rollNo.toUpperCase().trim() });
  if (!user) return res.status(404).json({ message: "Roll number not found!" });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Wrong password!" });
  const token = jwt.sign({ rollNo: user.rollNo, role: "student", section: user.section }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, role: "student", user: { rollNo: user.rollNo, name: user.name, section: user.section, year: user.year, isFirstLogin: user.isFirstLogin } });
});

// STUDENT CHANGE PASSWORD
app.post("/api/student/change-password", authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ rollNo: req.user.rollNo }, { password: hashed, isFirstLogin: false });
  res.json({ message: "Password changed!" });
});

// UPLOAD STUDENTS EXCEL
app.post("/api/admin/upload-students", adminMiddleware, xlsxUpload.single("file"), async (req, res) => {
  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  let count = 0;
  let skipped = 0;
  for (const row of data) {
    const rollNo = String(row.rollNo || row["ROLL NO"] || row["Roll No"] || row["RollNo"] || "").trim().toUpperCase();
    const name = row.name || row["NAME"] || row["Name"] || "";
    const section = String(row.section || row["SECTION"] || row["Section"] || "").trim();
    const year = String(row.year || row["YEAR"] || row["Year"] || "2").trim();

    if (!rollNo) continue;

    const existing = await User.findOne({ rollNo });
    if (!existing) {
      const hashed = await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10);
      await new User({ rollNo, name, section, year, password: hashed }).save();
      count++;
    } else {
      skipped++;
    }
  }
  res.json({ message: `${count} students added! (${skipped} already existed)` });
});

// FCM Subscribe
app.post("/api/fcm-subscribe", async (req, res) => {
  const { token } = req.body;
  const existing = await FCMToken.findOne({ token });
  if (!existing) await new FCMToken({ token }).save();
  res.json({ message: "Subscribed!" });
});

// NOTICES
app.get("/api/notices", async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
});
app.post("/api/notices", adminMiddleware, async (req, res) => {
  const notice = new Notice(req.body);
  await notice.save();
  const tokens = await FCMToken.find();
  if (tokens.length > 0) {
    const message = { notification: { title: "📢 New Notice!", body: notice.title }, tokens: tokens.map(t => t.token) };
    getMessaging().sendEachForMulticast(message).catch(err => console.log("FCM Error:", err));
  }
  res.json(notice);
});
app.delete("/api/notices/:id", adminMiddleware, async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// NOTES
app.get("/api/notes", async (req, res) => {
  const { section } = req.query;
  const notes = await Note.find(section ? { section } : {}).sort({ createdAt: -1 });
  res.json(notes);
});
app.post("/api/notes", adminMiddleware, upload.single("file"), async (req, res) => {
  const { subject, semester, title, section } = req.body;
  const note = new Note({ title, subject, semester, section, fileUrl: req.file.path, fileType: req.file.mimetype });
  await note.save();
  res.json(note);
});
app.delete("/api/notes/:id", adminMiddleware, async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ASSIGNMENTS
app.get("/api/assignments", async (req, res) => {
  const assignments = await Assignment.find().sort({ createdAt: -1 });
  res.json(assignments);
});
app.post("/api/assignments", adminMiddleware, upload.single("file"), async (req, res) => {
  const { title, subject, semester, dueDate } = req.body;
  const assignment = new Assignment({ title, subject, semester, dueDate, fileUrl: req.file?.path });
  await assignment.save();
  res.json(assignment);
});
app.delete("/api/assignments/:id", adminMiddleware, async (req, res) => {
  await Assignment.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// PREVIOUS PAPERS
app.get("/api/papers", async (req, res) => {
  const papers = await Paper.find().sort({ createdAt: -1 });
  res.json(papers);
});
app.post("/api/papers", adminMiddleware, upload.single("file"), async (req, res) => {
  const { title, subject, semester, year } = req.body;
  const paper = new Paper({ title, subject, semester, year, fileUrl: req.file.path });
  await paper.save();
  res.json(paper);
});
app.delete("/api/papers/:id", adminMiddleware, async (req, res) => {
  await Paper.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// STUDY MATERIALS
app.get("/api/materials", async (req, res) => {
  const materials = await StudyMaterial.find().sort({ createdAt: -1 });
  res.json(materials);
});
app.post("/api/materials", adminMiddleware, upload.single("file"), async (req, res) => {
  const { title, subject, semester } = req.body;
  const material = new StudyMaterial({ title, subject, semester, fileUrl: req.file.path });
  await material.save();
  res.json(material);
});
app.delete("/api/materials/:id", adminMiddleware, async (req, res) => {
  await StudyMaterial.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// TIMETABLES
app.get("/api/timetables", async (req, res) => {
  const timetables = await Timetable.find();
  res.json(timetables.map(t => t.section));
});
app.get("/api/timetable/:section", async (req, res) => {
  const timetable = await Timetable.findOne({ section: req.params.section });
  res.json(timetable);
});
app.post("/api/timetable/:section", adminMiddleware, async (req, res) => {
  const { timings, schedule } = req.body;
  await Timetable.findOneAndUpdate(
    { section: req.params.section },
    { section: req.params.section, timings, schedule },
    { upsert: true, new: true }
  );
  res.json({ message: "Saved!" });
});
app.delete("/api/timetable/:section", adminMiddleware, async (req, res) => {
  await Timetable.findOneAndDelete({ section: req.params.section });
  res.json({ message: "Deleted" });
});

app.listen(3001, () => console.log("Server running on 3001 🚀"));