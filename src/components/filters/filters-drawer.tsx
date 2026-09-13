"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { MultiSelectFilter, DateRangeFilter, ResetFiltersLink, type FilterOption } from "./filter-fields";

export function FiltersDrawer({ associates, sources, fieldSubset }: { associates: FilterOption[]; sources: FilterOption[]; fieldSubset?: "full" | "insights" }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="size-3.5" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader className="flex-row items-center justify-between pr-8">
          <SheetTitle>Filters</SheetTitle>
          <ResetFiltersLink />
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Date range</span>
            <DateRangeFilter />
          </div>
          <MultiSelectFilter label="Conversation owner" param="owner" options={associates} />
          <MultiSelectFilter label="Conversation source" param="source" options={sources} />
          {fieldSubset === "full" && (
            <MultiSelectFilter label="Contact owner" param="contactOwner" options={associates} />
          )}
          {fieldSubset !== "insights" && (
            <p className="text-xs text-muted-foreground">
              This drawer shows a working slice of the PRD&apos;s ~26-field registry (§4.3) — the remaining fields
              (Lead Stage, Email/WhatsApp Status, Quality Parameter Groups, Intent Progression, …) follow the same
              pattern and can be added to <code>filters-bar.tsx</code>/<code>filters-drawer.tsx</code> as needed.
            </p>
          )}
        </div>
        <SheetFooter>
          <Button className="w-full" onClick={() => setOpen(false)}>
            Apply Filter
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
