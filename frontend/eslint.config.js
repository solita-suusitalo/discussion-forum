import js from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...svelte.configs["flat/recommended"],
    // Svelte 5 reactive modules (.svelte.ts) must use the TS parser, not the Svelte parser
    {
        files: ["**/*.svelte.ts"],
        languageOptions: {
            parser: tseslint.parser,
        },
    },
    {
        files: ["**/*.ts", "**/*.svelte.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],
            "no-console": "warn",
        },
    },
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],
            "no-console": "warn",
            "svelte/no-navigation-without-resolve": "off",
        },
    },
    {
        ignores: ["dist/**", ".svelte-kit/**", "build/**"],
    }
);
