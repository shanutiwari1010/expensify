import type { Category } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CategoryDto = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isDefault: boolean;
};

const DEFAULT_CATEGORIES: Omit<CategoryDto, "id">[] = [
  { name: "Food", color: "#F97316", icon: "utensils", isDefault: true },
  { name: "Transport", color: "#3B82F6", icon: "car", isDefault: true },
  { name: "Shopping", color: "#EC4899", icon: "shopping-bag", isDefault: true },
  { name: "Bills", color: "#EAB308", icon: "file-text", isDefault: true },
  { name: "Entertainment", color: "#8B5CF6", icon: "gamepad-2", isDefault: true },
  { name: "Health", color: "#22C55E", icon: "heart-pulse", isDefault: true },
  { name: "Other", color: "#6B7280", icon: "more-horizontal", isDefault: true },
];

function toDto(cat: Category): CategoryDto {
  return {
    id: cat.id,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
    isDefault: cat.isDefault,
  };
}

export async function ensureDefaultCategories(): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        isDefault: cat.isDefault,
      },
    });
  }
}

export async function listCategories(): Promise<CategoryDto[]> {
  // Ensure defaults exist
  const existingCount = await prisma.category.count();
  if (existingCount === 0) {
    await ensureDefaultCategories();
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return categories.map(toDto);
}

export async function createCategory(input: {
  name: string;
  color: string;
  icon?: string;
}): Promise<CategoryDto> {
  const existing = await prisma.category.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw new Error(`Category "${input.name}" already exists`);
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      color: input.color,
      icon: input.icon ?? null,
      isDefault: false,
    },
  });
  return toDto(category);
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new Error("Category not found");
  }
  if (category.isDefault) {
    throw new Error("Cannot delete default categories");
  }

  // Check if any expenses use this category
  const expenseCount = await prisma.expense.count({
    where: { category: category.name },
  });
  if (expenseCount > 0) {
    throw new Error(
      `Cannot delete category "${category.name}" — ${expenseCount} expense(s) use it`
    );
  }

  await prisma.category.delete({ where: { id } });
}
