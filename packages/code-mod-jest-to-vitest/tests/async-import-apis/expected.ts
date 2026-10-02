import { vi } from "vitest";
const example = "jest.fn()";

const factory = async () => {
  const actual = await vi.importActual("./module");
  const mocked = await vi.importMock("./module");
  return { actual, mocked };
};
