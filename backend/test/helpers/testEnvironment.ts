import fs from "node:fs";
import { config } from "../../src/config";
import { seedDatabase } from "../../src/db/seed";

export function resetTestState(): void {
  fs.rmSync(config.exportsDir, { recursive: true, force: true });
  fs.mkdirSync(config.exportsDir, { recursive: true });
  seedDatabase(true);
}
