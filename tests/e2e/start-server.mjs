import { execFileSync, execSync, spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const clientDir = path.join(root, "src/Web.Client");
const stateFile = path.join(here, ".e2e-state.json");
const container = "tydee-e2e-postgres";
const database = `tydee_e2e_${Date.now()}`;
const user = "tydee";

function runDocker(args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function removeContainer() {
  try {
    execFileSync("docker", ["rm", "-f", container], { stdio: "ignore" });
  } catch {
    // No previous container to remove.
  }
}

function killTree(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // The process already exited.
    }
    return;
  }

  child.kill("SIGTERM");
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitForPostgres(port) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await canConnect(port)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`PostgreSQL did not accept connections on 127.0.0.1:${port}.`);
}

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Not up yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${label} did not become ready at ${url}.`);
}

let api;
let client;

function cleanup() {
  killTree(api);
  killTree(client);
  removeContainer();
  rmSync(stateFile, { force: true });
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

process.on("exit", () => {
  killTree(api);
  killTree(client);
});

removeContainer();
rmSync(stateFile, { force: true });

try {
  runDocker([
    "run",
    "-d",
    "--rm",
    "--name",
    container,
    "-e",
    `POSTGRES_USER=${user}`,
    "-e",
    `POSTGRES_DB=${database}`,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-p",
    "127.0.0.1::5432",
    "postgres:18-alpine",
  ]);
} catch (error) {
  const detail = error.stderr ? String(error.stderr).trim() : error.message;
  throw new Error(`Could not start PostgreSQL for e2e. Is Docker running?\n${detail}`);
}

const portOutput = runDocker(["port", container, "5432/tcp"]).trim();
const port = portOutput.slice(portOutput.lastIndexOf(":") + 1);

await waitForPostgres(port);

writeFileSync(stateFile, JSON.stringify({ port: Number(port), database, user }, null, 2));

const connectionString = `Host=127.0.0.1;Port=${port};Database=${database};Username=${user}`;

api = spawn(
  "dotnet",
  ["run", "--project", path.join(root, "src/Web.Api"), "--no-launch-profile"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: "Testing",
      ASPNETCORE_URLS: "http://localhost:5100",
      ConnectionStrings__Database: connectionString,
    },
  },
);

api.on("exit", (code, signal) => {
  if (code !== 0 && signal === null) {
    console.error(`Tydee API exited with code ${code}.`);
    process.exit(code ?? 1);
  }
});

const clientEnv = {
  ...process.env,
  NEXT_PUBLIC_API_URL: "http://localhost:5100",
  API_URL: "http://localhost:5100",
  NEXT_PUBLIC_APP_URL: "http://localhost:3100",
};

try {
  execSync("npm run build", { cwd: clientDir, stdio: "inherit", env: clientEnv });
} catch (error) {
  cleanup();
  throw error;
}

client = spawn("npm", ["run", "start", "--", "-p", "3100"], {
  cwd: clientDir,
  stdio: "inherit",
  shell: true,
  env: clientEnv,
});

client.on("exit", (code, signal) => {
  if (code !== 0 && signal === null) {
    console.error(`Tydee client exited with code ${code}.`);
    process.exit(code ?? 1);
  }
});

try {
  await waitForUrl("http://localhost:5100/health", "Tydee API");
  await waitForUrl("http://localhost:3100/login", "Tydee client");
} catch (error) {
  cleanup();
  throw error;
}
