import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");

const env = { ...process.env };
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^"(.*)"$/,  "$1");
    env[key] = value;
  }
});

// Write temp env script
const envScript = Object.entries(env)
  .filter(([k]) => k.startsWith("NEXT_PUBLIC_") || k.startsWith("APPWRITE_"))
  .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
  .join(" ");

exec(`${envScript} node scripts/appwrite-setup.mjs`, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.error("Setup failed:", error.message);
    console.error(stderr);
    process.exit(1);
  }
  console.log(stdout);
  process.exit(0);
});
