import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "./db";

async function run() {
  const dir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    // eslint-disable-next-line no-console
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
  }

  // eslint-disable-next-line no-console
  console.log("Migrations complete.");
  await pool.end();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", err);
  process.exit(1);
});
