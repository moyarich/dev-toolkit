import { spawn } from "node:child_process";

export function runProcess(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve({ code, signal });
      reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}
