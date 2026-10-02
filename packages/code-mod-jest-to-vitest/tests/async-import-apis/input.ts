const example = "jest.fn()";

const factory = () => {
  const actual = jest.requireActual("./module");
  const mocked = jest.createMockFromModule("./module");
  return { actual, mocked };
};
