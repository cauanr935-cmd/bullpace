const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  // Test discovery: look under `tests/` for both unit and integration suites
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // Keep ts-jest transform
  transform: {
    ...tsJestTransformCfg,
  },
  // Coverage: collect from the source folder only (keep tests out of coverage)
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.{ts,js}"],
  coverageDirectory: "<rootDir>/coverage",
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"]
};
