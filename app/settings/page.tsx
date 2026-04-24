import { SettingsIcon } from "lucide-react";

import { Header } from "@/components/layout/header";
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
            <CardTitle>Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Empty className="py-12">
              <EmptyHeader>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <SettingsIcon className="size-6 text-muted-foreground" />
                </div>
                <EmptyTitle>Coming Soon</EmptyTitle>
                <EmptyDescription>
                  Customize your experience with currency preferences, themes, and more.
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
