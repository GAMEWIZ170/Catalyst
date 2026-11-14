// Fills daily_stats and stat_summaries from the events collection. Run it once a night (see backend/README.md),
// or by hand: npm run stats. Safe to run again at any time.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { compute } = require("../src/utils/dashboardStats");

(async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
  const { rows, data } = await compute();
  console.log(`daily_stats: ${rows} days written. Today (UTC): ${data.today}`);
  console.log(`Last 7 days:  ${JSON.stringify(data.totals.last7)}`);
  console.log(`Last 30 days: ${JSON.stringify(data.totals.last30)}`);
  console.log(`Activation: ${data.activation.activated} of ${data.activation.eligible} new students (${data.activation.percent ?? "n/a"}%)`);
  await mongoose.disconnect();
})().catch((error) => {
  console.error("compute-stats failed:", error.message);
  process.exit(1);
});
