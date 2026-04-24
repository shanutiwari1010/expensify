import { PrismaClient } from "@prisma/client";

// Re-use a single PrismaClient across hot-reloads in development and across
// warm serverless invocations in production. Creating a new client per
// request exhausts connections on Postgres (especially via Supabase pooler).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
