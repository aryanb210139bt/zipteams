import type { CallFilters } from "@/lib/db/queries";

/** Parses the URL search params written by components/filters/* into a `CallFilters` for the query layer. */
export function parseCallFilters(searchParams: Record<string, string | string[] | undefined>): CallFilters {
  const get = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const from = get("from");
  const to = get("to");
  const owner = get("owner");
  const source = get("source");
  const stage = get("stage");

  return {
    range: from || to ? { from: from ? new Date(from) : new Date(0), to: to ? new Date(to) : new Date() } : undefined,
    associateIds: owner ? owner.split(",").filter(Boolean) : undefined,
    sources: source ? source.split(",").filter(Boolean) : undefined,
    leadStageCategories: stage ? (stage.split(",").filter(Boolean) as CallFilters["leadStageCategories"]) : undefined,
  };
}

export function parsePage(searchParams: Record<string, string | string[] | undefined>): number {
  const v = searchParams.page;
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
