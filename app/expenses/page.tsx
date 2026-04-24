import { Header } from "@/components/layout/header";
import { ExpenseTracker } from "@/components/expenses/expense-tracker";
import { listExpenses } from "@/lib/services/expenses";
import { listCategories } from "@/lib/services/categories";
import type { ListExpensesResponse } from "@/lib/schemas/expense";

export const dynamic = "force-dynamic";

async function getInitialData(): Promise<{
  expenses: ListExpensesResponse;
  categories: Awaited<ReturnType<typeof listCategories>>;
}> {
  try {
    const [expenses, categories] = await Promise.all([
      listExpenses({ sort: "date_desc" }),
      listCategories(),
    ]);
    return { expenses, categories };
  } catch (err) {
    console.error("[expenses] failed to seed initial data", err);
    return {
      expenses: { data: [], total: "0.00" },
      categories: [],
    };
  }
}

export default async function ExpensesPage() {
  const { expenses, categories } = await getInitialData();

  return (
    <>
      <Header
        title="Expenses"
        description="Manage and track all your expenses"
      />
      <div className="flex-1 space-y-6 p-6">
        <ExpenseTracker
          initialData={expenses}
          initialCategories={categories}
          showStats={false}
        />
      </div>
    </>
  );
}
