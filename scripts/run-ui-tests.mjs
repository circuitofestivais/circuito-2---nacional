import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const playwright = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
const address = "http://127.0.0.1:5173/circuito-2---nacional/";

const server = spawn(process.execPath, [vite, "--mode", "test"], {
  cwd: root,
  stdio: "inherit",
});

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("O servidor de teste encerrou antes de iniciar.");
    try {
      const response = await fetch(address);
      if (response.ok) return;
    } catch {
      // O servidor ainda está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Tempo esgotado ao iniciar o servidor de teste.");
}

let exitCode = 1;
try {
  await waitForServer();
  exitCode = await new Promise((resolve, reject) => {
    const tests = spawn(process.execPath, [playwright, "test"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1" },
    });
    tests.on("error", reject);
    tests.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  server.kill();
}

process.exitCode = exitCode;
