import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach } from "vitest";

const testRoot =
  process.env.AUTOBLOG_TEST_ROOT ?? fs.mkdtempSync(path.join(os.tmpdir(), "autoblog-agent-tests-"));

process.env.AUTOBLOG_TEST_ROOT = testRoot;
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.DB_PATH = path.join(testRoot, "autoblog-agent.test.db");
process.env.EXPORTS_DIR = path.join(testRoot, "exports");
process.env.BILLING_MODE = "mock";
process.env.GOOGLE_AUTH_MODE = "mock";

fs.mkdirSync(process.env.EXPORTS_DIR, { recursive: true });

beforeEach(async () => {
  const { resetTestState } = await import("./helpers/testEnvironment");
  resetTestState();
});
