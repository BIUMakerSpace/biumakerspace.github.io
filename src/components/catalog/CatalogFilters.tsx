import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import {
  CATEGORIES, CATEGORY_LABELS, CATEGORY_TO_GENERAL, GENERAL_CATEGORIES, GENERAL_CATEGORY_LABELS,
  type CatalogCategory, type GeneralCategory,
} from "@/lib/categories";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  generalCategory: GeneralCategory | "all";
  onGeneralCategoryChange: (value: GeneralCategory | "all") => void;
  category: CatalogCategory | "all";
  onCategoryChange: (value: CatalogCategory | "all") => void;
  generalCounts: Record<string, number>;
  detailedCounts: Record<string, number>;
}

const CatalogFilters = ({
  search, onSearchChange, generalCategory, onGeneralCategoryChange,
  category, onCategoryChange, generalCounts, detailedCounts,
}: Props) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const visibleDetailed = generalCategory === "all"
    ? CATEGORIES
    : CATEGORIES.filter((c) => CATEGORY_TO_GENERAL[c] === generalCategory);

  const selectGeneral = (g: GeneralCategory | "all") => {
    onGeneralCategoryChange(g);
    onCategoryChange("all");
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="relative mx-auto max-w-xl">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="חיפוש פריט לפי שם או תיאור..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-9 h-11"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          size="sm"
          variant={generalCategory === "all" ? "default" : "outline"}
          onClick={() => selectGeneral("all")}
          className="rounded-full"
        >
          הכל ({generalCounts.all})
        </Button>
        {GENERAL_CATEGORIES.map((g) => (
          <Button
            key={g}
            size="sm"
            variant={generalCategory === g ? "default" : "outline"}
            onClick={() => selectGeneral(g)}
            className="rounded-full"
          >
            {GENERAL_CATEGORY_LABELS[g]} ({generalCounts[g]})
          </Button>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="sm"
          variant={showAdvanced ? "default" : "secondary"}
          onClick={() => setShowAdvanced((s) => !s)}
          className="rounded-full gap-2 shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showAdvanced ? "הסתר סינון מתקדם" : "סינון מתקדם"}
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant={category === "all" ? "default" : "outline"}
            onClick={() => onCategoryChange("all")}
            className="rounded-full"
          >
            כל תתי-הקטגוריות
          </Button>
          {visibleDetailed.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => onCategoryChange(cat)}
              className="rounded-full"
              disabled={detailedCounts[cat] === 0}
            >
              {CATEGORY_LABELS[cat]} ({detailedCounts[cat]})
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogFilters;
