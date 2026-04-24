import { BarChart3Icon } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function AnalyticsPage() {
  return (
    <>
      <Header
        title="Analytics"
        description="Visualize your spending patterns"
      />
      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Empty className="py-12">
              <EmptyHeader>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <BarChart3Icon className="size-6 text-muted-foreground" />
                </div>
                <EmptyTitle>Coming Soon</EmptyTitle>
                <EmptyDescription>
                  Charts and insights about your spending habits will be available here.
                  Track expenses on the Dashboard to see analytics.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent />
            </Empty>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
