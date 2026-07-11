import express from "express";

import {
  getNotes,
  createNote,
  deleteNote,
  testNotes,
} from "../controllers/notesController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getNotes);

router.post(
  "/",
  authMiddleware,
  allowRoles("hod", "faculty", "cr"),
  createNote
);

router.delete(
  "/:id",
  authMiddleware,
  allowRoles("hod"),
  deleteNote
);

router.get("/test", testNotes);

export default router;