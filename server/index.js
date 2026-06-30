import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";
import XLSX from "xlsx";
import cloudinary from "cloudinary";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected ✅"))
  .catch(err => console.error("MongoDB Error:", err));

// Cloudinary Config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============== SCHEMAS ==============

const UserSchema = new mongoose.Schema({
  rollNo: { type: String, unique: true },
  name: String,
  section: String,
  branch: String,
  password: String,
  isFirstLogin: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const NoticeSchema = new mongoose.Schema({
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const NoteSchema = new mongoose.Schema({
  section: String,
  subject: String,
  title: String,
  description: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const AssignmentSchema = new mongoose.Schema({
  section: String,
  subject: String,
  title: String,
  description: String,
  dueDate: String,
  createdAt: { type: Date, default: Date.now }
});

const PaperSchema = new mongoose.Schema({
  section: String,
  subject: String,
  title: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const MaterialSchema = new mongoose.Schema({
  section: String,
  subject: String,
  title: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const TimetableSchema = new mongoose.Schema({
  section: String,
  timings: [{ start: String, end: String, type: String }],
  schedule: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model("User", UserSchema);
const Notice = mongoose.model("Notice", NoticeSchema);
const Note = mongoose.model("Note", NoteSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Paper = mongoose.model("Paper", PaperSchema);
const Material = mongoose.model("Material", MaterialSchema);
const Timetable = mongoose.model("Timetable", TimetableSchema);

// ============== MIDDLEWARE ==============

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
// ============== STUDENT LOGIN ==============

app.post("/api/student-login", async (req, res) => {
  try {
    console.log(req.body);
    const { rollNo, password } = req.body;
    const user = await User.findOne({ rollNo });

    if (!user) return res.status(404).json({ message: "Student not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ rollNo, role: "student" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    await User.updateOne({ rollNo }, { lastLogin: new Date() });

    res.json({
      token,
      student: {
        rollNo: user.rollNo,
        name: user.name,
        section: user.section,
        isFirstLogin: user.isFirstLogin
      }
    });
  } catch (err) {
  console.error("LOGIN ERROR:", err);
  res.status(500).json({ message: err.message });
}
});

// ============== AUTH ROUTES ==============

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "24h" });
      res.json({ token, role: "admin" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



app.post("/api/change-password", async (req, res) => {
  try {
    const { rollNo, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { rollNo },
      { password: hashedPassword, isFirstLogin: false }
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.post("/api/student/forgot-password", async (req, res) => {
  try {
    const { rollNo, name, section, newPassword } = req.body;

    const user = await User.findOne({
      rollNo,
      name,
      section
    });

    if (!user) {
      return res.status(404).json({
        message: "Student details not matched!"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.isFirstLogin = false;

    await user.save();

    res.json({
      message: "Password reset successful!"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

// ============== NOTICES ==============

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
    await Notice.deleteOne({ _id: req.params.id });
    res.json({ message: "Notice deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== NOTES ==============

app.get("/api/notes", async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notes", adminMiddleware, async (req, res) => {
  try {
    const note = new Note(req.body);
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notes/:id", adminMiddleware, async (req, res) => {
  try {
    await Note.deleteOne({ _id: req.params.id });
    res.json({ message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== ASSIGNMENTS ==============

app.get("/api/assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/assignments", adminMiddleware, async (req, res) => {
  try {
    const assignment = new Assignment(req.body);
    await assignment.save();
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/assignments/:id", adminMiddleware, async (req, res) => {
  try {
    await Assignment.deleteOne({ _id: req.params.id });
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== PAPERS ==============

app.get("/api/papers", async (req, res) => {
  try {
    const papers = await Paper.find().sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/papers", adminMiddleware, async (req, res) => {
  try {
    const paper = new Paper(req.body);
    await paper.save();
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/papers/:id", adminMiddleware, async (req, res) => {
  try {
    await Paper.deleteOne({ _id: req.params.id });
    res.json({ message: "Paper deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== STUDY MATERIALS ==============

app.get("/api/materials", async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/materials", adminMiddleware, async (req, res) => {
  try {
    const material = new Material(req.body);
    await material.save();
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/materials/:id", adminMiddleware, async (req, res) => {
  try {
    await Material.deleteOne({ _id: req.params.id });
    res.json({ message: "Material deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== TIMETABLE ==============

app.get("/api/timetable/:section", async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ section: req.params.section });
    if (!timetable) return res.status(404).json({ message: "Timetable not found" });
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/timetable", adminMiddleware, async (req, res) => {
  try {
    const existing = await Timetable.findOne({ section: req.body.section });
    if (existing) {
      await Timetable.updateOne({ section: req.body.section }, req.body);
    } else {
      const timetable = new Timetable(req.body);
      await timetable.save();
    }
    res.json({ message: "Timetable saved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== CHATBOT ==============

app.post("/api/chat", async (req, res) => {
  try {
    const { message, language } = req.body;

    const systemPrompt = language === "te"
      ? "You are a helpful NRI Institute student assistant. Respond in Telugu."
      : "You are a helpful NRI Institute student assistant. Respond in English.";

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        contents: [{ parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      },
      {
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY }
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: "Error generating response" });
  }
});

// ============== ADMIN STATS ==============

app.get("/api/admin/stats", adminMiddleware, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const everLoggedIn = await User.countDocuments({ lastLogin: { $exists: true } });
    const activeToday = await User.countDocuments({
      lastLogin: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const activeThisWeek = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const totalNotices = await Notice.countDocuments();
    const totalNotes = await Note.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalPapers = await Paper.countDocuments();
    const totalMaterials = await Material.countDocuments();
    const sectionCounts = await User.aggregate([
      { $group: { _id: "$section", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalStudents,
      everLoggedIn,
      activeToday,
      activeThisWeek,
      totalNotices,
      totalNotes,
      totalAssignments,
      totalPapers,
      totalMaterials,
      sectionCounts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== UPLOAD STUDENTS ==============

app.post("/api/admin/upload-students", adminMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let added = 0, skipped = 0;

    for (const row of data) {
      const existing = await User.findOne({ rollNo: row.rollNo });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD, 10);
        await User.create({
          rollNo: row.rollNo,
          name: row.name,
          section: String(row.section),
          branch: row.branch || "CSE",
          password: hashedPassword
        });
        added++;
      } else {
        skipped++;
      }
    }

    res.json({ message: `✅ Added: ${added} ⏭️ Skipped: ${skipped}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== PROFILE ==============

app.get("/api/profile/:rollNo", async (req, res) => {
  try {
    const user = await User.findOne({ rollNo: req.params.rollNo }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== FILE UPLOAD ==============

const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/upload", adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const result = await cloudinary.v2.uploader.upload_stream(
      { resource_type: "image", folder: "nri-hub" },
      (error, result) => {
        if (error) res.status(500).json({ message: error.message });
        else res.json({ url: result.secure_url });
      }
    );

    result.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== START SERVER ==============

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT} 🚀`));
