import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type E2eState = {
  port: number;
  database: string;
  user: string;
};

export function readState(): E2eState {
  const path = fileURLToPath(new URL("../.e2e-state.json", import.meta.url));

  return JSON.parse(readFileSync(path, "utf8")) as E2eState;
}
