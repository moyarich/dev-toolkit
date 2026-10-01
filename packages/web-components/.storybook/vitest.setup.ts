import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/web-components-vite";
import * as previewAnnotations from "./preview.ts";

const annotations = setProjectAnnotations([previewAnnotations]);

beforeAll(annotations.beforeAll);
