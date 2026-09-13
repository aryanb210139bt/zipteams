"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type FilterOption = { id: string; label: string };

/**
 * A pragmatic slice of the PRD's ~28-field shared filter registry (§4):
 * date range + a handful of "searchable checkbox-list" fields. Every field
 * reads/writes a plain URL search param, so filtering is server-renderable
 * and shareable via link. The remaining registry fields (Email/WhatsApp
 * Status, Quality Parameter Groups, Intent Progression, etc.) follow the
 * same `MultiSelectFilter` pattern — add them here as they're needed.
 */
export function MultiSelectFilter({ label, param, options }: { label: string; param: string; options: FilterOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  const selected = new Set((searchParams.get(param) ?? "").split(",").filter(Boolean));
  const filteredOptions = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const params = new URLSearchParams(searchParams.toString());
    if (next.size) params.set(param, [...next].join(","));
    else params.delete(param);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.size > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{selected.size}</span>}
          <ChevronDown className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} className="h-8 pl-7 text-sm" />
        </div>
        <ScrollArea className="h-48">
          <div className="flex flex-col gap-1 pr-2">
            {filteredOptions.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent">
                <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                {o.label}
              </label>
            ))}
            {filteredOptions.length === 0 && <span className="px-1.5 py-1 text-xs text-muted-foreground">No matches.</span>}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs text-muted-foreground">From</Label>
      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-sm" />
      <Label className="text-xs text-muted-foreground">To</Label>
      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-sm" />
      <Button size="sm" onClick={apply}>
        Apply Filter
      </Button>
    </div>
  );
}

export function ResetFiltersLink({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button className={cn("text-sm text-muted-foreground underline-offset-2 hover:underline", className)} onClick={() => router.push(pathname)}>
      Reset All
    </button>
  );
}

export function ActiveFilterCheck({ param }: { param: string }) {
  const searchParams = useSearchParams();
  const active = Boolean(searchParams.get(param));
  return active ? <Check className="size-3.5 text-status-positive" /> : null;
}
