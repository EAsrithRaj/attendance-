import React from "react";
import BottomNav from "@/components/BottomNav";

export default function PageShell({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-3 sm:px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-3 sm:px-4 py-4 animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
