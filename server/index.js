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

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  initializeApp({ credential: cert(serviceAccount) });
  console.log("Firebase initialized ✅");
} catch (err) {
  console.log("Firebase init skipped:", err.message);
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

app.post("/api/admin/upload-students", adminMiddleware, xlsxUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded!" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    let count = 0;
    let skipped = 0;

    for (const row of data) {
      const keys = Object.keys(row);
      const getValue = (possibleNames) => {
        for (const name of possibleNames) {
          const matchKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
          if (matchKey && row[matchKey] !== undefined && row[matchKey] !== "") return row[matchKey];
        }
        return null;
      };

      const rollNo = String(getValue(["rollNo", "ROLL NO", "Roll No", "RollNo", "roll no"]) || "").trim().toUpperCase();
      const name = getValue(["name", "NAME", "Name"]) || "";
      const section = String(getValue(["section", "SECTION", "Section"]) || "").trim();
      const year = String(getValue(["year", "YEAR", "Year"]) || "2").trim();

      if (!rollNo) {
        skipped++;
        continue;
      }

      try {
        const existing = await User.findOne({ rollNo });
        if (!existing) {
          const hashed = await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10);
          await new User({ rollNo, name, section, year, password: hashed }).save();
          count++;
        } else {
          skipped++;
        }
      } catch (innerErr) {
        skipped++;
      }
    }
    res.json({ message: `${count} students added! (${skipped} skipped/existed)` });
  } catch (err) {
    console.error("Excel upload error:", err);
    res.status(500).json({ message: "Error: " + err.message });
  }
});

app.post("/api/fcm-subscribe", async (req, res) => {
  try {
    const { token } = req.body;
    const existing = await FCMToken.findOne({ token });
    if (!existing) await new FCMToken({ token }).save();
    res.json({ message: "Subscribed!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// AI CHATBOT with retry logic
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const prompt = `You are a helpful AI assistant for CSE engineering students at NRI Institute of Technology. Answer the student's question clearly and concisely. If it's a technical/academic question (DBMS, OS, Computer Networks, Data Structures, programming, etc.), give a helpful educational answer with examples if useful. Keep answers focused and not too long. You can respond in Telugu-English mix (Tenglish) if the question is asked that way, otherwise respond in clear English.

Student's question: ${message}`;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const reply = result.response.text();
      return res.json({ reply });
    } catch (err) {
      lastError = err;
      console.log(`Chat attempt ${attempt} failed:`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error("Chat error after retries:", lastError);
  res.status(500).json({ reply: "Sorry, I'm having trouble connecting right now. Please try asking again in a moment!" });
});

app.get("/api/notices", async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
});
app.post("/api/notices", adminMiddleware, async (req, res) => {
  const notice = new Notice(req.body);
  await notice.save();
  try {
    const tokens = await FCMToken.find();
    if (tokens.length > 0) {
      const message = { notification: { title: "📢 New Notice!", body: notice.title }, tokens: tokens.map(t => t.token) };
      getMessaging().sendEachForMulticast(message).catch(err => console.log("FCM Error:", err));
    }
  } catch (e) {}
  res.json(notice);
});
app.delete("/api/notices/:id", adminMiddleware, async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

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