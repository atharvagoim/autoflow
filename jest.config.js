/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/backend/tests"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "backend/tsconfig.json" }] },
};
