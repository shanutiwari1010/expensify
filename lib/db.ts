import { PrismaClient } from "@prisma/client";

// Re-use a single PrismaClient across hot-reloads in development and across
// warm serverless invocations in production. Creating a new client per
// request exhausts connections on Postgres (especially via Supabase pooler).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// In dev, PrismaClient is cached on `globalThis` to avoid exhausting Postgres
// connections during Fast Refresh. One sharp edge: if Prisma Client is
// regenerated while the dev server is running (e.g. after adding models),
// the old cached client may be missing new model delegates (like `category`),
// causing runtime crashes. We detect that case and recreate the client once.
const cached = globalForPrisma.prisma ?? createClient();
export const prisma =
  process.env.NODE_ENV !== "production" && !cached?.category
    ? createClient()
    : cached;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
