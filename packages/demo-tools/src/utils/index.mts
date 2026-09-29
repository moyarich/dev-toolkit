export { runProcess } from "./process.mts";
export { freePort } from "./port.mts";

export function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
