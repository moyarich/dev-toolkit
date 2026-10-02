const timeoutMs = 5_000;

jest.setTimeout(10_000);
jest.setTimeout(timeoutMs * 2);

const note = "jest.setTimeout(1234)";
// jest.setTimeout(9999)
