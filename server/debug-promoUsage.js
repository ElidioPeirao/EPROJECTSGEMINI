const { db } = require("../db");
const { promoUsage } = require("../shared/schema");
const { eq } = require("drizzle-orm");

async function main() {
  try {
    // Exibir todos os registros do promoUsage
    const usage = await db.query.promoUsage.findMany();
    console.log("PromoUsage records:", usage);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();