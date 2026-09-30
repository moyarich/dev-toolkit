export { runProcess } from "./process.ts";
export { freePort } from "./port.ts";

export function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
