import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import webpush from "web-push";

const app = express();
app.use(cors());
app.use(express.json());

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

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "cse-hub-notes", allowed_formats: ["jpg", "jpeg", "png", "pdf"] }
});
const upload = multer({ storage });

// Web Push Config
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Auth Middleware
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

// Schemas
const noticeSchema = new mongoose.Schema({ title: String, description: String, createdAt: { type: Date, default: Date.now } });
const noteSchema = new mongoose.Schema({ title: String, subject: String, semester: String, imageUrl: String, createdAt: { type: Date, default: Date.now } });
const doubtSchema = new mongoose.Schema({ name: String, question: String, answer: { type: String, default: null }, createdAt: { type: Date, default: Date.now } });
const timetableSchema = new mongoose.Schema({ section: String, timings: Array, schedule: Object });
const subscriptionSchema = new mongoose.Schema({ endpoint: String, keys: Object, createdAt: { type: Date, default: Date.now } });

const Notice = mongoose.model("Notice", noticeSchema);
const Note = mongoose.model("Note", noteSchema);
const Doubt = mongoose.model("Doubt", doubtSchema);
const Timetable = mongoose.model("Timetable", timetableSchema);
const Subscription = mongoose.model("Subscription", subscriptionSchema);

// HOME
app.get("/", (req, res) => res.send("Server running 🚀"));

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// VAPID PUBLIC KEY
app.get("/api/vapid-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// SUBSCRIBE
app.post("/api/subscribe", async (req, res) => {
  const { endpoint, keys } = req.body;
  const existing = await Subscription.findOne({ endpoint });
  if (!existing) {
    const sub = new Subscription({ endpoint, keys });
    await sub.save();
  }
  res.json({ message: "Subscribed!" });
});

// NOTICES
app.get("/api/notices", async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
});
app.post("/api/notices", authMiddleware, async (req, res) => {
  const notice = new Notice(req.body);
  await notice.save();

  // Send push notification to all subscribers
  const subscriptions = await Subscription.find();
  const payload = JSON.stringify({
    title: "📢 New Notice!",
    body: notice.title,
    url: "/"
  });

  subscriptions.forEach(sub => {
    webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      .catch(err => console.log("Push error:", err));
  });

  res.json(notice);
});
app.delete("/api/notices/:id", authMiddleware, async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// NOTES
app.get("/api/notes", async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.json(notes);
});
app.post("/api/notes", authMiddleware, upload.single("image"), async (req, res) => {
  const { subject, semester, title } = req.body;
  const note = new Note({ title, subject, semester, imageUrl: req.file.path });
  await note.save();
  res.json(note);
});
app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// DOUBTS
app.get("/api/doubts", async (req, res) => {
  const doubts = await Doubt.find().sort({ createdAt: -1 });
  res.json(doubts);
});
app.post("/api/doubts", async (req, res) => {
  const doubt = new Doubt(req.body);
  await doubt.save();
  res.json(doubt);
});
app.put("/api/doubts/:id/answer", authMiddleware, async (req, res) => {
  const doubt = await Doubt.findByIdAndUpdate(req.params.id, { answer: req.body.answer }, { new: true });
  res.json(doubt);
});
app.delete("/api/doubts/:id", authMiddleware, async (req, res) => {
  await Doubt.findByIdAndDelete(req.params.id);
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
app.post("/api/timetable/:section", authMiddleware, async (req, res) => {
  const { timings, schedule } = req.body;
  await Timetable.findOneAndUpdate(
    { section: req.params.section },
    { section: req.params.section, timings, schedule },
    { upsert: true, new: true }
  );
  res.json({ message: "Saved!" });
});
app.delete("/api/timetable/:section", authMiddleware, async (req, res) => {
  await Timetable.findOneAndDelete({ section: req.params.section });
  res.json({ message: "Deleted" });
});

app.listen(3001, () => console.log("Server running on 3001 🚀"));