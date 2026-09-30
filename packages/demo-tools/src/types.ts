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

export type {
  Browser,
  BrowserContext,
  BrowserType as Chromium,
  CDPSession,
  Frame as BrowserFrame,
  Locator as BrowserLocator,
  Page as BrowserPage,
} from "playwright";

