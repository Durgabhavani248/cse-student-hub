// ONE-TIME MIGRATION — run this ONCE before deploying the new index.js
// Backfills branch: "CSE" on all existing documents that don't have a branch field.
// Usage:  node migrate-add-branch.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const collections = ["notes", "assignments", "papers", "materials", "timetables", "users"];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  for (const name of collections) {
    const coll = mongoose.connection.collection(name);
    const result = await coll.updateMany(
      { branch: { $exists: false } },
      { $set: { branch: "CSE" } }
    );
    console.log(`${name}: updated ${result.modifiedCount} documents`);
  }

  console.log("✅ Migration complete");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
