import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cse-hub-notes",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"]
  }
});

const upload = multer({ storage });

const file = join(__dirname, "db.json");
const adapter = new JSONFile(file);
const defaultData = { notices: [], notes: [], doubts: [], timetables: {} };
const db = new Low(adapter, defaultData);

await db.read();
if (!db.data.doubts) { db.data.doubts = []; await db.write(); }
if (!db.data.timetables) { db.data.timetables = {}; await db.write(); }

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/", (req, res) => res.send("Server running 🚀"));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
 if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.get("/api/notices", async (req, res) => {
  await db.read();
  res.json(db.data.notices);
});

app.post("/api/notices", authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  const notice = { id: Date.now().toString(), title, description, createdAt: new Date() };
  db.data.notices.unshift(notice);
  await db.write();
  res.json(notice);
});

app.delete("/api/notices/:id", authMiddleware, async (req, res) => {
  db.data.notices = db.data.notices.filter(n => n.id !== req.params.id);
  await db.write();
  res.json({ message: "Deleted" });
});

app.get("/api/notes", async (req, res) => {
  await db.read();
  res.json(db.data.notes);
});

app.post("/api/notes", authMiddleware, upload.single("image"), async (req, res) => {
  const { subject, semester, title } = req.body;
  const note = { id: Date.now().toString(), title, subject, semester, imageUrl: req.file.path, createdAt: new Date() };
  db.data.notes.unshift(note);
  await db.write();
  res.json(note);
});

app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
  db.data.notes = db.data.notes.filter(n => n.id !== req.params.id);
  await db.write();
  res.json({ message: "Deleted" });
});

app.get("/api/doubts", async (req, res) => {
  await db.read();
  res.json(db.data.doubts);
});

app.post("/api/doubts", async (req, res) => {
  const { question, name } = req.body;
  const doubt = { id: Date.now().toString(), name, question, answer: null, createdAt: new Date() };
  db.data.doubts.unshift(doubt);
  await db.write();
  res.json(doubt);
});

app.put("/api/doubts/:id/answer", authMiddleware, async (req, res) => {
  const { answer } = req.body;
  const doubt = db.data.doubts.find(d => d.id === req.params.id);
  if (doubt) { doubt.answer = answer; await db.write(); }
  res.json(doubt);
});

app.delete("/api/doubts/:id", authMiddleware, async (req, res) => {
  db.data.doubts = db.data.doubts.filter(d => d.id !== req.params.id);
  await db.write();
  res.json({ message: "Deleted" });
});

// TIMETABLE APIs
app.get("/api/timetable/:section", async (req, res) => {
  await db.read();
  const timetable = db.data.timetables[req.params.section] || null;
  res.json(timetable);
});

app.get("/api/timetables", async (req, res) => {
  await db.read();
  res.json(Object.keys(db.data.timetables));
});

app.post("/api/timetable/:section", authMiddleware, async (req, res) => {
  const { timings, schedule } = req.body;
  db.data.timetables[req.params.section] = { timings, schedule };
  await db.write();
  res.json({ message: "Timetable saved!" });
});

app.delete("/api/timetable/:section", authMiddleware, async (req, res) => {
  delete db.data.timetables[req.params.section];
  await db.write();
  res.json({ message: "Deleted" });
});

app.listen(3001, () => console.log("Server running on 3001 🚀"));