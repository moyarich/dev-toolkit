import { vi } from "vitest";
const timeoutMs = 5_000;

vi.setConfig({ testTimeout: 10_000 });
vi.setConfig({ testTimeout: timeoutMs * 2 });

const note = "jest.setTimeout(1234)";
// jest.setTimeout(9999)
