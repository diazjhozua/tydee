"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
};

export function EntrySheet({ open, onOpenChange, title, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="safe-bottom mx-auto w-full max-w-md gap-0 rounded-t-3xl border-x px-5 pb-8 pt-3"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <SheetHeader className="p-0 pb-4">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
