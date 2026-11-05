import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function globalTeardown(): void {
  try {
    execFileSync("docker", ["rm", "-f", "tydee-e2e-postgres"], { stdio: "ignore" });
  } catch {
    // The container is already gone.
  }

  try {
    rmSync(fileURLToPath(new URL("./.e2e-state.json", import.meta.url)), { force: true });
  } catch {
    // The state file is already gone.
  }
}
