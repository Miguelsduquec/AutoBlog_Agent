import path from "node:path";
import dotenv from "dotenv";

const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

dotenv.config({ path: path.resolve(repoRoot, ".env") });
dotenv.config({ path: path.resolve(backendRoot, ".env") });

function resolveFromRepo(relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }

  return path.resolve(repoRoot, relativeOrAbsolute);
}

export const config = {
  repoRoot,
  backendRoot,
  port: Number(process.env.PORT ?? 3001),
  dbPath: resolveFromRepo(process.env.DB_PATH ?? "./backend/data/autoblog-agent.db"),
  exportsDir: resolveFromRepo(process.env.EXPORTS_DIR ?? "./backend/output"),
  seedOnBoot: process.env.SEED_ON_BOOT === "true",
  openAiApiKey: process.env.OPENAI_API_KEY ?? ""
};
