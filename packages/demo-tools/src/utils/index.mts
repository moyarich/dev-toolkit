export { runProcess } from "./process.mts";

export function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
export { freePort } from "./port.mts";
