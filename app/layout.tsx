import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { CurrencyPreferenceProvider } from "@/components/providers/currency-preference-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Expensify",
  description: "A small, production-minded personal finance tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <CurrencyPreferenceProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>{children}</SidebarInset>
            <CommandPalette />
          </SidebarProvider>
        </CurrencyPreferenceProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
