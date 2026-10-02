const fn = jest.fn();

const mock = fn as jest.Mock;
type ServiceMock = jest.Mocked<{ run(): void }>;
type HandlerMock = jest.MockedFunction<(value: string) => boolean>;

export { fn, mock };
export type { ServiceMock, HandlerMock };
