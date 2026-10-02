import { vi, type MockInstance } from "vitest";
const spy = vi.spyOn(console, "log");
const typedSpy: MockInstance = spy;
const note = "jest.SpyInstance";
// jest.SpyInstance

export { typedSpy };
