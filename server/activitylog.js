import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: String,
      required: true,
      index: true
    },

    actorName: {
      type: String,
      required: true
    },

    role: {
      type: String,
      required: true,
      index: true
    },

    action: {
      type: String,
      required: true,
      index: true
    },

    module: {
      type: String,
      required: true,
      index: true
    },

    description: {
      type: String,
      required: true
    },

    resourceId: {
      type: String,
      default: null
    },

    resourceName: {
      type: String,
      default: null
    },

    branch: {
      type: String,
      default: null,
      index: true
    },

    section: {
      type: String,
      default: null,
      index: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);

export default ActivityLog;