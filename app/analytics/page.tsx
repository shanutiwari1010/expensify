import { CategorySpendingSummary } from "@/components/analytics/category-spending-summary";
import { Header } from "@/components/layout/header";
import { listCategories } from "@/lib/services/categories";
import { listExpenses } from "@/lib/services/expenses";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let expenses: Awaited<ReturnType<typeof listExpenses>> = {
    data: [],
    total: "0.00",
  };

  try {
    [expenses, categories] = await Promise.all([
      listExpenses({ sort: "date_desc" }),
      listCategories(),
    ]);
  } catch (err) {
    console.error("[analytics] failed to load data", err);
  }

  return (
    <>
      <Header
        title="Analytics"
        description="Category breakdown and how your spending splits across labels"
      />
      <div className="flex-1 space-y-6 p-6">
        <CategorySpendingSummary
          categories={categories}
          expenses={expenses.data}
        />
      </div>
    </>
  );
}
