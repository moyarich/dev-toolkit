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

export interface BrowserPage {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  screenshot(options?: Record<string, unknown>): Promise<unknown>;
  evaluate<T = unknown>(fn: (...args: any[]) => T | Promise<T>, arg?: any): Promise<T>;
  context(): BrowserContext;
  mouse: { move(x: number, y: number): Promise<void> };
  setViewportSize?(viewport: { width: number; height: number }): Promise<void>;
  bringToFront?(): Promise<void>;
  once?(event: string, listener: (...args: any[]) => void): unknown;
}

export interface BrowserLocator {
  screenshot(options?: Record<string, unknown>): Promise<unknown>;
  boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
}

export interface CDPSession {
  send(method: string, params?: Record<string, unknown>): Promise<any>;
  on(event: string, listener: (payload: any) => void): unknown;
  detach(): Promise<void>;
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
  launchPersistentContext?(userDataDirectory: string, options?: Record<string, unknown>): Promise<BrowserContext>;
  connectOverCDP?(endpoint: string): Promise<Browser>;
}
