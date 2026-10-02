import { vi } from "vitest";
const config = {
  advanceTimers: vi.advanceTimersByTime.bind(vi),
};

const advance = vi.advanceTimersByTime.bind(vi);
vi.advanceTimersByTime(250);

const note = "jest.advanceTimersByTime";
// jest.advanceTimersByTime

export { advance, config };
