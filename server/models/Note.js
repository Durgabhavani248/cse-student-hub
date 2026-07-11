import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  section: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Note", NoteSchema);