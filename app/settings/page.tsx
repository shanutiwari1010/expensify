import { SettingsIcon } from "lucide-react";

import { Header } from "@/components/layout/header";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function SettingsPage() {
  return (
    <>
      <Header
        title="Settings"
        description="Configure your preferences"
      />
      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Amounts & currency</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencySettings />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>More</CardTitle>
          </CardHeader>
          <CardContent>
            <Empty className="py-8">
              <EmptyHeader>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <SettingsIcon className="size-6 text-muted-foreground" />
                </div>
                <EmptyTitle>Coming soon</EmptyTitle>
                <EmptyDescription>
                  Additional options (themes, exports, and more) can live here.
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
