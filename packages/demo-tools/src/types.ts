export type Awaitable<T> = T | Promise<T>;

export interface DemoStrategyContext {
  id: string;
  strategyDirectory: string;
  artifactsDirectory: string;
  moduleUrl?: string;
  [key: string]: unknown;
}

export interface DemoStrategy<T = unknown> {
  name: string;
  description?: string;
  tags?: readonly string[];
  run(context: DemoStrategyContext): Awaitable<T>;
}

export interface DemoStrategyEntry<T = unknown> {
  id: string;
  description: string;
  directory: string;
  modulePath: string;
  relativePath: string;
  strategy: DemoStrategy<T>;
}

export interface CDPSession {
  send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
  on<T = unknown>(event: string, listener: (payload: T) => void): unknown;
  detach(): Promise<void>;
}

export interface BrowserPage {
  evaluate<TArgument, TResult>(
    pageFunction: (argument: TArgument) => TResult | Promise<TResult>,
    argument: TArgument,
  ): Promise<TResult>;
  goto(url: string): Promise<unknown>;
  locator(selector: string): { waitFor(options?: { timeout?: number }): Promise<void> };
  context(): BrowserContext;
  once(event: string, listener: () => void): unknown;
  url(): string;
  bringToFront?(): Promise<void>;
  setViewportSize?(viewport: { width: number; height: number }): Promise<void>;
}

export interface BrowserContext {
  newPage(options?: Record<string, unknown>): Promise<BrowserPage>;
  newCDPSession(page: BrowserPage): Promise<CDPSession>;
  serviceWorkers?(): Array<{ url(): string }>;
  waitForEvent?(event: string): Promise<{ url(): string }>;
  close?(): Promise<void>;
}

export interface Browser {
  newContext(options?: Record<string, unknown>): Promise<BrowserContext>;
  close(): Promise<void>;
}

export interface Chromium {
  launch(options?: Record<string, unknown>): Promise<Browser>;
  launchPersistentContext?(
    userDataDirectory: string,
    options?: Record<string, unknown>,
  ): Promise<BrowserContext>;
  connectOverCDP?(endpoint: string): Promise<Browser>;
}
