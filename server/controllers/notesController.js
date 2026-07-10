import Note from "../models/Note.js";

export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createNote = async (req, res) => {
  try {
    const {
      section,
      subject,
      title,
      description,
      fileUrl,
    } = req.body;

    if (!section || !subject || !title || !description) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const note = await Note.create({
      section,
      subject,
      title,
      description,
      fileUrl,
    });

    res.status(201).json(note);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteNote = async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);

    res.json({
      message: "Note deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const testNotes = (req, res) => {
  res.json({
    message: "Notes API Working ✅",
  });
};