const spy = jest.spyOn(console, "log");
const typedSpy: jest.SpyInstance = spy;
const note = "jest.SpyInstance";
// jest.SpyInstance

export { typedSpy };
