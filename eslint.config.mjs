import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    ...js.configs.recommended,
  },
];
