import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const cli = ["--yes", "supabase@3.1.0"];
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const action = process.argv[2] || "dev";
if (!["start", "dev", "stop", "status"].includes(action)) throw new Error("Use start, dev, stop, or status.");
if (!readFileSync("supabase/config.toml", "utf8").includes('project_id = "iserein-discussions-local"')) throw new Error("Expected the isolated local discussions project.");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
try {
  if (action !== "dev") { execFileSync(npx, [...cli, action], { stdio: "inherit" }); process.exit(0); }
  const output = execFileSync(npx, [...cli, "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const vars = {};
  for (const line of output.split("\n")) {
    const match = /^([A-Z_]+)=["']?([^"'\r\n]*)["']?$/.exec(line.trim());
    if (match) vars[match[1]] = match[2];
  }
  const url = vars.API_URL || vars.SUPABASE_URL;
  const key = vars.PUBLISHABLE_KEY || vars.ANON_KEY || vars.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url)) throw new Error("Local Supabase URL/key not found. Run npm run discussions:start first.");
  console.log("Local discussions preview: http://localhost:3000");
  console.log("Test sign-in emails: http://localhost:54324. Live Supabase credentials are not used.");
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    NEXT_PUBLIC_LOCAL_DISCUSSIONS: "true", SUPABASE_SECRET_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "",
    CRON_SECRET: "", VAPID_PRIVATE_KEY: "", VAPID_PUBLIC_KEY: "", NEXT_PUBLIC_VAPID_PUBLIC_KEY: "" };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"], { env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", code => process.exit(code || 0));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local preview could not start.");
  console.error("Open Docker Desktop, then run npm run discussions:start. No hosted database commands were run.");
  process.exit(1);
}
