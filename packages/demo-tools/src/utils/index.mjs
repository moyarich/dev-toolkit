export { runProcess } from "./process.mjs";

export function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
