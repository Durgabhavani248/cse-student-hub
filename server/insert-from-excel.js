import XLSX from 'xlsx';
import mongoose from 'mongoose';

const MONGO_URI = "mongodb://localhost:27017/nri-hub";

const userSchema = new mongoose.Schema({
  rollNo: { type: String, unique: true },
  name: String,
  section: String,
  branch: String,
  year: String,
  password: String
});

const User = mongoose.model('User', userSchema);

async function insertFromExcel() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!");

    console.log("Reading Excel...");
    const workbook = XLSX.readFile('./students.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${data.length} students in Excel`);

    let added = 0;
    let skipped = 0;

    for (const student of data) {
      try {
        const rollNo = String(student.rollNo).trim().toUpperCase();
        const name = String(student.name).trim();
        const section = String(student.section).trim();
        const branch = String(student.branch || 'CSE').trim();
        const year = String(student.year || '2').trim();

        if (!rollNo) {
          skipped++;
          continue;
        }

        const existing = await User.findOne({ rollNo });
        if (!existing) {
          await User.create({
            rollNo,
            name,
            section,
            branch,
            year,
            password: "$2a$10$xyz"
          });
          added++;
          if (added % 50 === 0) console.log(`✅ Added: ${added}/${data.length}`);
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Error:`, err.message);
        skipped++;
      }
    }

    console.log(`\n✅ DONE!`);
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${added + skipped}`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

insertFromExcel();