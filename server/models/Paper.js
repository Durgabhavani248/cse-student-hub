import mongoose from "mongoose";

const PaperSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Paper", PaperSchema);