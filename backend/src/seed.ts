import { env, DEMO_EMAIL, DEMO_PASSWORD } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { logger } from "./lib/logger";
import { ensureDemoUser } from "./services/auth";
import { loadSampleWorkspace } from "./services/sampleData";

// `npm run seed` — creates the demo account if needed and resets its sample data.
// Other users' data is never touched.
async function main() {
  await connectDB();
  const user = await ensureDemoUser();
  await loadSampleWorkspace(user._id);
  logger.info(`Demo workspace ready. Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}${env.autoSeed ? " or click “Try the demo”." : "."}`);
  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  });
