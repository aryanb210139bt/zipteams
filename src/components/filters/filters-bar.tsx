import { MultiSelectFilter, DateRangeFilter, ResetFiltersLink, type FilterOption } from "./filter-fields";

const LEAD_STAGE_CATEGORY_OPTIONS: FilterOption[] = [
  { id: "converted", label: "Converted" },
  { id: "in_pipeline", label: "In Pipeline" },
  { id: "lost", label: "Lost" },
];

export function FiltersBar({ associates, sources }: { associates: FilterOption[]; sources: FilterOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5 md:px-6">
      <DateRangeFilter />
      <MultiSelectFilter label="Conversation owner" param="owner" options={associates} />
      <MultiSelectFilter label="Conversation source" param="source" options={sources} />
      <MultiSelectFilter label="Status Category" param="stage" options={LEAD_STAGE_CATEGORY_OPTIONS} />
      <ResetFiltersLink className="ml-1" />
    </div>
  );
}
