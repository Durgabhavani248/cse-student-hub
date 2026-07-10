import mongoose from "mongoose";

const TimetableSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    unique: true
  },

  timings: [
    {
      label: String,
      start: String,
      end: String,
      type: String
    }
  ],

  schedule: {
    type: Object,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Timetable", TimetableSchema);