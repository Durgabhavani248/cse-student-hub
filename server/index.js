import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import cloudinary from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS & Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

// Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ============== SCHEMAS ==============

const UserSchema = new mongoose.Schema({
  rollNo: { type: String, unique: true, required: true },
  name: String,
  section: String,
  branch: { type: String, default: "CS-Allied" },
  password: String,
  year: Number,
  isFirstLogin: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const FacultySchema = new mongoose.Schema({
  facultyId: { type: String, unique: true, required: true },
  name: String,
  branch: { type: String, default: "CS-Allied" },
  password: String,
  role: { type: String, enum: ["faculty", "hod"], default: "faculty" },
  assignedSections: [String],
  isFirstLogin: Boolean,
  createdAt: { type: Date, default: Date.now }
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
  dueDate: Date,
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
  section: { type: String, unique: true },
  timings: [{ start: String, end: String, type: String }],
  schedule: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

const AttendanceSchema = new mongoose.Schema({
  rollNo: String,
  studentName: String,
  section: String,
  branch: { type: String, default: "CS-Allied" },
  subject: String,
  date: String,
  status: { type: String, enum: ["present", "absent"], default: "present" },
  markedBy: String,
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model("User", UserSchema);
const Faculty = mongoose.model("Faculty", FacultySchema);
const Notice = mongoose.model("Notice", NoticeSchema);
const Note = mongoose.model("Note", NoteSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Paper = mongoose.model("Paper", PaperSchema);
const Material = mongoose.model("Material", MaterialSchema);
const Timetable = mongoose.model("Timetable", TimetableSchema);
const Attendance = mongoose.model("Attendance", AttendanceSchema);

// ============== MIDDLEWARE ==============

const adminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.username !== process.env.ADMIN_USERNAME) {
      return res.status(403).json({ message: "Admin only" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const facultyMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.facultyId) return res.status(403).json({ message: "Faculty only" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const hodOrAdminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.username === process.env.ADMIN_USERNAME) {
      decoded.role = "admin";
      req.user = decoded;
      return next();
    }
    if (decoded.facultyId && (decoded.role === "hod" || decoded.role === "admin")) {
      req.user = decoded;
      return next();
    }
    res.status(403).json({ message: "HOD/Admin only" });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ============== AUTH ROUTES ==============

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET);
    return res.json({ token });
  }
  
  res.status(401).json({ message: "Invalid credentials" });
});

app.post("/api/student-login", async (req, res) => {
  const { rollNo, name, section, password } = req.body;
  
  try {
    let student = await User.findOne({ rollNo });
    
    if (!student) {
      student = new User({
        rollNo,
        name,
        section: String(section),
        branch: "CS-Allied",
        password: await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10),
        year: 2,
        isFirstLogin: true
      });
      await student.save();
    }
    
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });
    
    const token = jwt.sign({
      rollNo: student.rollNo,
      section: student.section,
      branch: student.branch
    }, process.env.JWT_SECRET);
    
    res.json({ token, student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/faculty-login", async (req, res) => {
  const { facultyId, password } = req.body;
  
  try {
    const faculty = await Faculty.findOne({ facultyId });
    if (!faculty) return res.status(401).json({ message: "Faculty not found" });
    
    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });
    
    const token = jwt.sign({
      facultyId: faculty.facultyId,
      role: faculty.role,
      branch: faculty.branch,
      assignedSections: faculty.assignedSections
    }, process.env.JWT_SECRET);
    
    res.json({ token, faculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/change-password", facultyMiddleware, async (req, res) => {
  const { facultyId, oldPassword, newPassword } = req.body;
  
  try {
    const faculty = await Faculty.findOne({ facultyId });
    const isMatch = await bcrypt.compare(oldPassword, faculty.password);
    
    if (!isMatch) return res.status(401).json({ message: "Old password incorrect" });
    
    faculty.password = await bcrypt.hash(newPassword, 10);
    await faculty.save();
    
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== NOTICES ==============

app.get("/api/notices", async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
});

app.post("/api/notices", adminMiddleware, async (req, res) => {
  const notice = new Notice(req.body);
  await notice.save();
  res.json(notice);
});

app.delete("/api/notices/:id", adminMiddleware, async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ============== NOTES ==============

app.get("/api/notes", async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.json(notes);
});

app.post("/api/notes", adminMiddleware, async (req, res) => {
  try {
    const { section, subject, title, description, fileUrl } = req.body;
    
    if (!section || !subject || !title || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const note = new Note({
      section: String(section),
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim(),
      fileUrl: fileUrl || null
    });
    
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notes/:id", adminMiddleware, async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ============== ASSIGNMENTS ==============

app.get("/api/assignments", async (req, res) => {
  const assignments = await Assignment.find().sort({ createdAt: -1 });
  res.json({ assignments });
});

app.post("/api/assignments", adminMiddleware, async (req, res) => {
  try {
    const { section, subject, title, description, dueDate } = req.body;
    
    if (!section || !subject || !title || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const assignment = new Assignment({
      section: String(section),
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || null
    });
    
    await assignment.save();
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/assignments/:id", adminMiddleware, async (req, res) => {
  await Assignment.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ============== PAPERS ==============

app.get("/api/papers", async (req, res) => {
  const papers = await Paper.find().sort({ createdAt: -1 });
  res.json(papers);
});

app.post("/api/papers", adminMiddleware, async (req, res) => {
  try {
    const { section, subject, title, fileUrl } = req.body;
    
    if (!section || !subject || !title || !fileUrl) {
      return res.status(400).json({ message: "All fields required" });
    }
    
    const paper = new Paper({
      section: String(section),
      subject: subject.trim(),
      title: title.trim(),
      fileUrl: fileUrl.trim()
    });
    
    await paper.save();
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/papers/:id", adminMiddleware, async (req, res) => {
  await Paper.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ============== MATERIALS ==============

app.get("/api/materials", async (req, res) => {
  const materials = await Material.find().sort({ createdAt: -1 });
  res.json(materials);
});

app.post("/api/materials", adminMiddleware, async (req, res) => {
  try {
    const { section, subject, title, fileUrl } = req.body;
    
    if (!section || !subject || !title || !fileUrl) {
      return res.status(400).json({ message: "All fields required" });
    }
    
    const material = new Material({
      section: String(section),
      subject: subject.trim(),
      title: title.trim(),
      fileUrl: fileUrl.trim()
    });
    
    await material.save();
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/materials/:id", adminMiddleware, async (req, res) => {
  await Material.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ============== ATTENDANCE ==============

app.post("/api/attendance/mark", facultyMiddleware, async (req, res) => {
  try {
    const { section, subject, date, rollNos, statuses } = req.body;
    
    if (!section || !subject || !date || !rollNos || !statuses) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const records = [];
    for (let i = 0; i < rollNos.length; i++) {
      const record = new Attendance({
        rollNo: rollNos[i],
        section: String(section),
        branch: req.user.branch || "CS-Allied",
        subject: subject.trim(),
        date: date,
        status: statuses[i],
        markedBy: req.user.facultyId
      });
      records.push(record);
    }
    
    await Attendance.insertMany(records);
    res.json({ message: `✅ Attendance marked for ${records.length} students`, count: records.length });
  } catch (err) {
    console.error("Attendance mark error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/attendance/my", facultyMiddleware, async (req, res) => {
  try {
    const records = await Attendance.find({
      markedBy: req.user.facultyId
    }).sort({ date: -1 });
    
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/attendance/branch-report/:branch", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch } = req.params;
    
    if (req.user.role === "hod" && req.user.branch !== branch) {
      return res.status(403).json({ message: "You can only view your own branch" });
    }
    
    const records = await Attendance.find({ branch }).sort({ date: -1, section: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== ATTENDANCE EXPORT & CLEANUP ==============

app.get("/api/attendance/export/:branch", hodOrAdminMiddleware, async (req, res) => {
  try {
    const { branch } = req.params;
    const { section, subject, startDate, endDate } = req.query;

    if (req.user.role === "hod" && req.user.branch !== branch) {
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

    console.log("📤 Fetching attendance with filter:", JSON.stringify(filter));

    const records = await Attendance.find(filter).sort({ date: -1, section: 1, rollNo: 1 });

    console.log(`📥 Found ${records.length} records`);

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

    if (req.user.role === "hod" && req.user.branch !== branch) {
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

    console.log("🗑️ Deleting attendance with filter:", JSON.stringify(filter));

    const result = await Attendance.deleteMany(filter);

    console.log(`✅ Deleted ${result.deletedCount} records`);

    res.json({
      message: `✅ Deleted ${result.deletedCount} attendance records from database`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Delete attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== TIMETABLE ==============

app.get("/api/timetable/:section", async (req, res) => {
  const timetable = await Timetable.findOne({ section: req.params.section });
  res.json(timetable || {});
});

app.post("/api/timetable", adminMiddleware, async (req, res) => {
  const { section, timings, schedule } = req.body;
  
  let timetable = await Timetable.findOne({ section });
  if (!timetable) timetable = new Timetable({ section });
  
  timetable.timings = timings;
  timetable.schedule = schedule;
  await timetable.save();
  
  res.json(timetable);
});

// ============== FILE UPLOAD ==============

app.post("/api/upload", async (req, res) => {
  try {
    const { file } = req.body;
    
    if (!file) return res.status(400).json({ message: "No file provided" });
    
    const result = await cloudinary.v2.uploader.upload(file, {
      resource_type: "auto",
      folder: "nri-hub"
    });
    
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== CHATBOT ==============

app.post("/api/chat", async (req, res) => {
  try {
    const { message, key } = req.body;
    const apiKey = key || process.env.GEMINI_API_KEY;
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(message);
    const reply = result.response.text();
    
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== ADMIN STATS ==============

app.get("/api/admin/stats", adminMiddleware, async (req, res) => {
  const totalStudents = await User.countDocuments();
  const totalFaculty = await Faculty.countDocuments();
  const totalNotices = await Notice.countDocuments();
  
  res.json({ totalStudents, totalFaculty, totalNotices });
});

// ============== BULK UPLOAD ==============

app.post("/api/admin/upload-students", adminMiddleware, async (req, res) => {
  try {
    const { students } = req.body;
    
    for (const student of students) {
      const existing = await User.findOne({ rollNo: student.rollNo });
      
      if (!existing) {
        const newStudent = new User({
          rollNo: student.rollNo,
          name: student.name,
          section: String(student.section),
          branch: "CS-Allied",
          password: await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10),
          year: student.year || 2
        });
        await newStudent.save();
      }
    }
    
    res.json({ message: `✅ ${students.length} students processed` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/admin/upload-faculty", adminMiddleware, async (req, res) => {
  try {
    const { faculty } = req.body;
    
    for (const fac of faculty) {
      const existing = await Faculty.findOne({ facultyId: fac.facultyId });
      
      if (!existing) {
        const newFaculty = new Faculty({
          facultyId: fac.facultyId,
          name: fac.name,
          branch: fac.branch || "CS-Allied",
          role: fac.role || "faculty",
          assignedSections: fac.sections?.split(",").map(s => s.trim()) || [],
          password: await bcrypt.hash(process.env.DEFAULT_PASSWORD || "nri@2024", 10)
        });
        await newFaculty.save();
      }
    }
    
    res.json({ message: `✅ ${faculty.length} faculty processed` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== HEALTH CHECK ==============

app.get("/api/health", (req, res) => {
  res.json({ status: "✅ Server running", timestamp: new Date() });
});
// Add this to server/index.js (before the PORT section)

// ============== FACULTY ROUTES ==============
app.get("/api/faculty", adminMiddleware, async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============== STUDENTS ROUTES ==============
app.get("/api/students/:branch/:section", async (req, res) => {
  try {
    const { branch, section } = req.params;
    const students = await User.find({ 
      branch: branch === "CS-Allied" ? "CS-Allied" : branch,
      section: String(section)
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ============== SERVER START ==============

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));