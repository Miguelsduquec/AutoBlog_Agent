import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 1,
    minWorkers: 1
  }
});
