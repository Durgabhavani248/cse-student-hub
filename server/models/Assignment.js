import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema({
  section: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Assignment", AssignmentSchema);