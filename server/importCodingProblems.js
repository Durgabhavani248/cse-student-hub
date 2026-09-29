import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import dns from "dns";

// Local WiFi lo mongodb+srv DNS lookup fail avvakunda public DNS vadatham
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config({
  path: new URL("./.env", import.meta.url)
});

// =========================
// SCHEMA (index.js lo unna schema ke match)
// =========================

const CodingProblemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  topic: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  description: { type: String, required: true, trim: true },
  inputFormat: { type: String, default: "" },
  outputFormat: { type: String, default: "" },
  constraints: { type: String, default: "" },
  examples: [
    {
      input: { type: String, default: "" },
      output: { type: String, default: "" },
      explanation: { type: String, default: "" }
    }
  ],
  supportedLanguages: { type: [String], default: ["C", "C++", "Java", "Python"] },
  marks: { type: Number, default: 10, min: 0 },
  timeLimit: { type: Number, default: 2, min: 1 },
  memoryLimit: { type: Number, default: 128, min: 1 },
  testCases: [
    {
      input: { type: String, default: "" },
      expectedOutput: { type: String, default: "" }
    }
  ],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CodingProblem =
  mongoose.models.CodingProblem ||
  mongoose.model("CodingProblem", CodingProblemSchema);

// =========================
// SETTINGS
// =========================

// CodingPractice.jsx dropdown lo unna topics ke match avvali
const ALLOWED_TOPICS = [
  "Arrays",
  "Strings",
  "Searching",
  "Sorting",
  "Linked List",
  "Stack",
  "Queue",
  "Recursion",
  "Hashing",
  "Trees",
  "Graphs",
  "Dynamic Programming"
];

const DATA_DIR = new URL("./problems-data/", import.meta.url);
const CHUNK_SIZE = 200;

// =========================
// HELPERS
// =========================

function makeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function normalizeDifficulty(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "easy") return "Easy";
  if (text === "medium") return "Medium";
  if (text === "hard") return "Hard";
  return "";
}

function normalizeTopic(value) {
  const text = String(value || "").trim().toLowerCase();
  return ALLOWED_TOPICS.find((topic) => topic.toLowerCase() === text) || "";
}

// Problem valid aithe { problem }, kaadu aithe { error } return chestundi
function validateProblem(raw) {
  const title = toText(raw.title).trim();
  const description = toText(raw.description).trim();
  const topic = normalizeTopic(raw.topic);
  const difficulty = normalizeDifficulty(raw.difficulty);

  if (!title) return { error: "title missing" };
  if (!description) return { error: "description missing" };

  if (!topic) {
    return {
      error: `topic "${raw.topic}" allowed topics lo ledu`
    };
  }

  if (!difficulty) {
    return {
      error: `difficulty "${raw.difficulty}" Easy/Medium/Hard kaadu`
    };
  }

  const examples = (Array.isArray(raw.examples) ? raw.examples : []).map(
    (item) => ({
      input: toText(item.input),
      output: toText(item.output),
      explanation: toText(item.explanation)
    })
  );

  if (examples.length === 0) {
    return { error: "kaneesam 1 example kavali" };
  }

  const testCases = (Array.isArray(raw.testCases) ? raw.testCases : []).map(
    (item) => ({
      input: toText(item.input),
      expectedOutput: toText(item.expectedOutput)
    })
  );

  if (testCases.length < 2) {
    return { error: "kaneesam 2 testCases kavali" };
  }

  if (testCases.some((item) => !item.expectedOutput.trim())) {
    return { error: "testCase lo expectedOutput empty ga undi" };
  }

  return {
    problem: {
      title,
      slug: makeSlug(raw.slug || title),
      topic,
      difficulty,
      description,
      inputFormat: toText(raw.inputFormat),
      outputFormat: toText(raw.outputFormat),
      constraints: toText(raw.constraints),
      examples,
      testCases
    }
  };
}

// =========================
// IMPORT
// =========================

async function run() {
  if (!process.env.MONGO_URI) {
    console.log("❌ MONGO_URI .env lo ledu");
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    console.log("❌ 'problems-data' folder ledu. server folder lo create chesi JSON files petti.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.log("❌ problems-data lo .json files levu.");
    process.exit(1);
  }

  const valid = [];
  const skipped = [];
  const seenSlugs = new Set();

  for (const fileName of files) {
    let list;

    try {
      const text = fs.readFileSync(new URL(fileName, DATA_DIR), "utf8");
      list = JSON.parse(text);
    } catch (err) {
      skipped.push({ file: fileName, item: "-", reason: `JSON read error: ${err.message}` });
      continue;
    }

    if (!Array.isArray(list)) {
      skipped.push({ file: fileName, item: "-", reason: "file lo array undali [ {...}, {...} ]" });
      continue;
    }

    list.forEach((raw, index) => {
      const label = `#${index + 1} ${toText(raw?.title).slice(0, 40)}`;
      const result = validateProblem(raw || {});

      if (result.error) {
        skipped.push({ file: fileName, item: label, reason: result.error });
        return;
      }

      if (seenSlugs.has(result.problem.slug)) {
        skipped.push({
          file: fileName,
          item: label,
          reason: `duplicate slug "${result.problem.slug}"`
        });
        return;
      }

      seenSlugs.add(result.problem.slug);
      valid.push(result.problem);
    });
  }

  console.log("Files read      :", files.length);
  console.log("Valid problems  :", valid.length);
  console.log("Skipped         :", skipped.length);

  if (skipped.length > 0) {
    console.log("--- Skipped details (first 30) ---");
    console.table(skipped.slice(0, 30));
  }

  if (valid.length === 0) {
    console.log("Import cheyyadaniki valid problems levu.");
    process.exit(0);
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("Host            :", mongoose.connection.host);
  console.log("Database        :", mongoose.connection.name);

  let inserted = 0;
  let updated = 0;

  for (let start = 0; start < valid.length; start += CHUNK_SIZE) {
    const chunk = valid.slice(start, start + CHUNK_SIZE);

    const result = await CodingProblem.bulkWrite(
      chunk.map((problem) => ({
        updateOne: {
          filter: { slug: problem.slug },
          update: {
            $set: {
              ...problem,
              supportedLanguages: ["C", "C++", "Java", "Python"],
              marks: 10,
              timeLimit: 2,
              memoryLimit: 128,
              active: true,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      }))
    );

    inserted += result.upsertedCount;
    updated += result.modifiedCount;

    console.log(`Processed ${Math.min(start + CHUNK_SIZE, valid.length)} / ${valid.length}`);
  }

  const total = await CodingProblem.countDocuments({});
  const active = await CodingProblem.countDocuments({ active: true });

  console.log("-----------------------------");
  console.log("Inserted        :", inserted);
  console.log("Updated         :", updated);
  console.log("Total in DB     :", total);
  console.log("Active in DB    :", active);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Import error:", err.message);
  process.exit(1);
});
