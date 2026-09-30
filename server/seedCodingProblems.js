// =========================================================
// SEED CODING PROBLEMS INTO MONGODB
// =========================================================

import mongoose from "mongoose";
import dotenv from "dotenv";

import { codingProblems } from "./codingProblems.js";

dotenv.config();


// ---------------------------------------------------------
// CODING PROBLEM SCHEMA
// ---------------------------------------------------------

const CodingProblemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    topic: {
      type: String,
      required: true,
      trim: true
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true
    },

    description: {
      type: String,
      required: true
    },

    inputFormat: {
      type: String,
      default: ""
    },

    outputFormat: {
      type: String,
      default: ""
    },

    constraints: {
      type: String,
      default: ""
    },

    examples: [
      {
        input: String,
        output: String,
        explanation: String
      }
    ],

    // -----------------------------------------------------
    // STARTER CODE
    // -----------------------------------------------------

    starterCode: {
      Python: {
        type: String,
        default: ""
      },

      Cpp: {
        type: String,
        default: ""
      },

      Java: {
        type: String,
        default: ""
      }
    },

    supportedLanguages: {
      type: [String],
      default: [
        "C",
        "C++",
        "Java",
        "Python"
      ]
    },

    marks: {
      type: Number,
      default: 10
    },

    timeLimit: {
      type: Number,
      default: 1
    },

    memoryLimit: {
      type: Number,
      default: 128
    },

    // -----------------------------------------------------
    // HIDDEN TEST CASES
    // -----------------------------------------------------

    testCases: [
      {
        input: String,
        expectedOutput: String
      }
    ],

    active: {
      type: Boolean,
      default: true
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);


// ---------------------------------------------------------
// MODEL
// ---------------------------------------------------------

const CodingProblem =
  mongoose.models.CodingProblem ||
  mongoose.model(
    "CodingProblem",
    CodingProblemSchema
  );


// ---------------------------------------------------------
// MONGODB CONNECTION
// ---------------------------------------------------------

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error(
    "❌ MONGO_URI is not configured."
  );

  process.exit(1);
}

// mongodb+srv DNS is currently failing in Node.js,
// so use the already-resolved Atlas hosts directly.
const directMongoUri = mongoUri.replace(
  /^mongodb\+srv:\/\/([^@]+)@[^/]+\/([^?]+)(\?.*)?$/,
  "mongodb://$1@ac-nnforld-shard-00-00.wvgiihe.mongodb.net:27017,ac-nnforld-shard-00-01.wvgiihe.mongodb.net:27017,ac-nnforld-shard-00-02.wvgiihe.mongodb.net:27017/$2?ssl=true&replicaSet=atlas-14gm3n-shard-0&authSource=admin&retryWrites=true&w=majority"
);


// ---------------------------------------------------------
// SEED FUNCTION
// ---------------------------------------------------------

const seedCodingProblems = async () => {
  try {
    console.log(
      "Connecting to MongoDB..."
    );

  await mongoose.connect(directMongoUri);

    console.log(
      "✅ MongoDB Connected"
    );

    console.log(
      `Preparing ${codingProblems.length} coding problems...`
    );


    // -----------------------------------------------------
    // UPSERT EACH PROBLEM
    // -----------------------------------------------------

    let inserted = 0;
    let updated = 0;

    for (const problem of codingProblems) {

      const existing =
        await CodingProblem.findOne({
          slug: problem.slug
        });

      if (existing) {

        await CodingProblem.updateOne(
          {
            slug: problem.slug
          },
          {
            $set: {
              ...problem,
              updatedAt: new Date()
            }
          }
        );

        updated++;

      } else {

        await CodingProblem.create({
          ...problem,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        inserted++;
      }
    }


    // -----------------------------------------------------
    // RESULT
    // -----------------------------------------------------

    console.log("");
    console.log(
      "========================================"
    );

    console.log(
      "CODING PROBLEM SEED COMPLETED"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Total problems : ${codingProblems.length}`
    );

    console.log(
      `Inserted       : ${inserted}`
    );

    console.log(
      `Updated        : ${updated}`
    );

    console.log(
      "========================================"
    );


  } catch (error) {

    console.error(
      "❌ Coding problem seed failed:"
    );

    console.error(
      error
    );

    process.exitCode = 1;

  } finally {

    await mongoose.disconnect();

    console.log(
      "MongoDB connection closed."
    );
  }
};


// ---------------------------------------------------------
// RUN
// ---------------------------------------------------------

seedCodingProblems();