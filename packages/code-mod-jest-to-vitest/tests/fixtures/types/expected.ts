import { vi, type Mock, type Mocked, type MockedFunction } from "vitest";

const fn = vi.fn();

const mock = fn as Mock;
type ServiceMock = Mocked<{ run(): void }>;
type HandlerMock = MockedFunction<(value: string) => boolean>;

export { fn, mock };
export type { ServiceMock, HandlerMock };
