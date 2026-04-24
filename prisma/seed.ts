import "./load-env";
import { Prisma } from "@prisma/client";
import { ensureDefaultCategories } from "@/lib/services/categories";
import { prisma } from "@/lib/db";

/**
 * Re-running the seed is safe: it removes only rows with this marker, then
 * recreates the same sample set.
 */
const DESCRIPTION_SAMPLE_MARKER = " [sample-seed]";

const samples: Array<{
  amount: string;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
}> = [
  { amount: "18.50", category: "Food", description: "Cafe breakfast", date: "2026-04-24" },
  { amount: "64.00", category: "Food", description: "Weekly groceries", date: "2026-04-22" },
  { amount: "95.00", category: "Food", description: "Team dinner", date: "2026-04-18" },
  { amount: "24.00", category: "Transport", description: "City transit pass top-up", date: "2026-04-20" },
  { amount: "32.50", category: "Transport", description: "Ride share to airport", date: "2026-04-15" },
  { amount: "48.00", category: "Transport", description: "Fuel", date: "2026-04-10" },
  { amount: "119.00", category: "Shopping", description: "Headphones (sale)", date: "2026-04-19" },
  { amount: "27.25", category: "Shopping", description: "Bookstore", date: "2026-04-12" },
  { amount: "89.99", category: "Bills", description: "Internet service", date: "2026-04-01" },
  { amount: "45.00", category: "Bills", description: "Mobile plan", date: "2026-04-01" },
  { amount: "16.00", category: "Entertainment", description: "Streaming subscription", date: "2026-04-05" },
  { amount: "42.00", category: "Entertainment", description: "Concert tickets", date: "2026-04-14" },
  { amount: "33.00", category: "Health", description: "Pharmacy", date: "2026-04-11" },
  { amount: "20.00", category: "Other", description: "Charity contribution", date: "2026-04-08" },
];

async function main(): Promise<void> {
  await ensureDefaultCategories();

  await prisma.expense.deleteMany({
    where: { description: { contains: DESCRIPTION_SAMPLE_MARKER } },
  });

  for (const row of samples) {
    await prisma.expense.create({
      data: {
        amount: new Prisma.Decimal(row.amount),
        category: row.category,
        description: `${row.description}${DESCRIPTION_SAMPLE_MARKER}`,
        date: new Date(`${row.date}T00:00:00.000Z`),
      },
    });
  }

  console.log(`Seeded ${samples.length} sample expenses.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
