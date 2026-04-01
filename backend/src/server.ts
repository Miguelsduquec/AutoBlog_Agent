import { createApp } from "./app";
import { config } from "./config";

const app = createApp({ seed: config.seedOnBoot });

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Autoblog Agent backend listening on http://localhost:${config.port}`);
  });
}

export { app };
