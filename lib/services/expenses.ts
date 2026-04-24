import { Prisma, type Expense } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/errors";
import { sumDecimals, toDecimal } from "@/lib/money";
import { ensureDefaultCategories } from "@/lib/services/categories";
import type {
  CreateExpenseInput,
  ExpenseDto,
  ListExpensesQuery,
  ListExpensesResponse,
} from "@/lib/schemas/expense";

function toDto(e: Expense): ExpenseDto {
  return {
    id: e.id,
    amount: e.amount.toFixed(2),
    category: e.category,
    description: e.description,
    date: e.date.toISOString().slice(0, 10),
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * Resolves a category name to a row and returns the canonical `Category.name`
 * (case-insensitive). Shared by create + update.
 */
export async function resolveCanonicalCategoryName(raw: string): Promise<string> {
  let row = await prisma.category.findFirst({
    where: { name: { equals: raw, mode: "insensitive" } },
  });
  if (!row) {
    const count = await prisma.category.count();
    if (count === 0) {
      await ensureDefaultCategories();
      row = await prisma.category.findFirst({
        where: { name: { equals: raw, mode: "insensitive" } },
      });
    }
  }
  if (!row) {
    throw ApiError.badRequest(
      `Category "${raw}" doesn't exist. Add it from Categories first.`
    );
  }
  return row.name;
}

export async function createExpense(
  input: CreateExpenseInput,
  idempotencyKey?: string
): Promise<ExpenseDto> {
  const categoryName = await resolveCanonicalCategoryName(input.category);

  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
      include: { expense: true },
    });
    if (existing) return toDto(existing.expense);
  }

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          amount: toDecimal(input.amount),
          category: categoryName,
          description: input.description,
          date: new Date(input.date + "T00:00:00Z"),
        },
      });

      if (idempotencyKey) {
        await tx.idempotencyKey.create({
          data: { key: idempotencyKey, resourceId: created.id },
        });
      }

      return created;
    });

    return toDto(expense);
  } catch (err) {
    if (
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const winner = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
        include: { expense: true },
      });
      if (winner) return toDto(winner.expense);
    }
    throw err;
  }
}

export async function updateExpense(
  id: string,
  input: CreateExpenseInput
): Promise<ExpenseDto> {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound("Expense not found.");
  }
  const categoryName = await resolveCanonicalCategoryName(input.category);
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      amount: toDecimal(input.amount),
      category: categoryName,
      description: input.description,
      date: new Date(input.date + "T00:00:00Z"),
    },
  });
  return toDto(updated);
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    await prisma.expense.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw ApiError.notFound("Expense not found.");
    }
    throw err;
  }
}

export async function listExpenses(
  query: ListExpensesQuery
): Promise<ListExpensesResponse> {
  const where: Prisma.ExpenseWhereInput = {};
  if (query.category) where.category = query.category;

  type OrderByInput = Prisma.ExpenseOrderByWithRelationInput;
  let orderBy: OrderByInput[];

  switch (query.sort) {
    case "date_asc":
      orderBy = [{ date: "asc" }, { createdAt: "asc" }];
      break;
    case "amount_desc":
      orderBy = [{ amount: "desc" }, { createdAt: "desc" }];
      break;
    case "amount_asc":
      orderBy = [{ amount: "asc" }, { createdAt: "asc" }];
      break;
    case "date_desc":
    default:
      orderBy = [{ date: "desc" }, { createdAt: "desc" }];
  }

  const rows = await prisma.expense.findMany({ where, orderBy });
  const total = sumDecimals(rows.map((r) => r.amount)).toFixed(2);
  return { data: rows.map(toDto), total };
}
