/** @jest-config-loader ts-node */

import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: { verbatimModuleSyntax: false },
            },
        ],
    },
    setupFiles: ["<rootDir>/tests/setup.ts"],
    testPathIgnorePatterns: ["<rootDir>/dist/"],
};

export default config;
