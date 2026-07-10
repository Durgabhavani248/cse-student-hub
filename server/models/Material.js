import mongoose from "mongoose";

const MaterialSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Material", MaterialSchema);