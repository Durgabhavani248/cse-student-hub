import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

const admin = await import("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});


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
  fcmToken: String,
  lastNotificationTime: Date,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const NoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const NoteSchema = new mongoose.Schema({
  section: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const AssignmentSchema = new mongoose.Schema({
  section: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: String,
  createdAt: { type: Date, default: Date.now }
});

const PaperSchema = new mongoose.Schema({
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
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});
const TimetableSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    unique: true
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

// ============== MODELS ==============
const User = mongoose.model("User", UserSchema);
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
    const { rollNo, password } = req.body;

    if (!rollNo || !password) {
      return res.status(400).json({ message: "Roll No and password required" });
    }

    const user = await User.findOne({ rollNo });

    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

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
    console.error("Student login error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/change-password", async (req, res) => {
  try {
    const { rollNo, newPassword } = req.body;

    if (!rollNo || !newPassword) {
      return res.status(400).json({ message: "Roll No and new password required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await User.updateOne(
      { rollNo },
      { password: hashedPassword, isFirstLogin: false }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Password changed successfully" });
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

app.get("/api/notes", async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error("Get notes error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notes", adminMiddleware, upload.single("file"), async (req, res) => {
  try {

    console.log("NOTES BODY:", req.body);

    const { section, subject, title, description } = req.body;

const fileUrl = req.file
  ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
  : "";

   if (!section || !subject || !title || !description) {
  return res.status(400).json({ message: "All fields required" });
}

const note = new Note({
  section,
  subject,
  title,
  description,
  fileUrl,
});

await note.save();

res.json(note);}
 catch (err) {
    console.error("Post note error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notes/:id", adminMiddleware, async (req, res) => {
  try {
    await Note.deleteOne({ _id: req.params.id });
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== ASSIGNMENTS ==============

app.get("/api/assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json({ assignments });
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/assignments", adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { section, subject, title, description } = req.body;
    const fileUrl = req.file
  ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
  : "";

    if (!section || !subject || !title || !description) {
      return res.status(400).json({ message: "All fields required" });
    }

  const assignment = new Assignment({
  section,
  subject,
  title,
  description,
  fileUrl,
});

    await assignment.save();

    res.json(assignment);

  } catch (err) {
    console.error("Post assignment error:", err);
    res.status(500).json({ message: err.message });
  }
});
app.delete("/api/assignments/:id", adminMiddleware, async (req, res) => {
  try {
    await Assignment.deleteOne({ _id: req.params.id });
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ====================== PAPERS ======================

// Get all papers
app.get("/api/papers", async (req, res) => {
  try {
    const papers = await Paper.find().sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    console.error("Get papers error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Add paper
app.post("/api/papers", adminMiddleware, async (req, res) => {
  try {
    console.log("========== PAPERS ==========");
    console.log(req.body);

    const { subject, title, fileUrl } = req.body;

    console.log("subject =", subject);
    console.log("title =", title);
    console.log("fileUrl =", fileUrl);

    if (!subject || !title || !fileUrl) {
      return res.status(400).json({
        message: "Subject, title and fileUrl are required"
      });
    }

    const paper = new Paper({
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
app.delete("/api/papers/:id", adminMiddleware, async (req, res) => {
  try {
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

app.get("/api/materials", async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/materials", adminMiddleware, async (req, res) => {
  try {
    const { subject, title, fileUrl } = req.body;

    if (!subject || !title || !fileUrl) {
      return res.status(400).json({
        message: "Subject, title and fileUrl are required"
      });
    }

    const material = await Material.create({
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

app.delete("/api/materials/:id", adminMiddleware, async (req, res) => {
  try {
    await Material.deleteOne({ _id: req.params.id });
    res.json({ message: "Material deleted" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== TIMETABLE ==============

app.get("/api/timetable/:section", async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ section: req.params.section }).lean();

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json({
      section: timetable.section,
      timings: timetable.timings || [],
      schedule: timetable.schedule || {}
    });

  } catch (err) {
    console.error(err);
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

// ============== PROFILE ==============

app.get("/api/profile/:rollNo", async (req, res) => {
  try {
    const user = await User.findOne({ rollNo: req.params.rollNo }).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============== FILE UPLOAD ==============

app.post("/api/upload", adminMiddleware, async (req, res) => {
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


// ============== HEALTH CHECK ==============

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date()
  });
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