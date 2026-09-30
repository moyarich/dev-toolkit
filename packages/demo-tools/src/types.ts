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

export type Browser = import("playwright").Browser;
export type BrowserContext = import("playwright").BrowserContext;
export type Chromium = import("playwright").BrowserType;
export type CDPSession = import("playwright").CDPSession;
export type BrowserFrame = import("playwright").Frame;
export type BrowserLocator = import("playwright").Locator;
export type BrowserPage = import("playwright").Page;
