import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Search } from "lucide-react";

export interface BankOption {
  code: string;
  name: string;
}

interface BankSearchComboboxProps {
  banks: BankOption[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

// Small local debounce hook -- avoids re-filtering the ~100+ item bank list
// on every keystroke, which is what caused the lag/dropped keystrokes.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 8;
const OVERSCAN = 4;

/**
 * A searchable bank picker that stays responsive with 100+ entries:
 * - the text input is debounced before it re-filters the list
 * - only the rows currently in view (plus a small overscan buffer) are
 *   mounted, instead of the full filtered list
 */
export function BankSearchCombobox({ banks, value, onChange, disabled, loading, placeholder }: BankSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedBank = banks.find((b) => b.code === value);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, debouncedSearch]);

  useEffect(() => {
    if (open) {
      setScrollTop(0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } else {
      setSearch("");
    }
  }, [open]);

  const viewportHeight = ROW_HEIGHT * VISIBLE_ROWS;
  const totalHeight = filtered.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(filtered.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleBanks = filtered.slice(startIndex, endIndex);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between font-normal"
          data-testid="select-bank"
        >
          <span className={cn("truncate", !selectedBank && "text-muted-foreground")}>
            {loading ? "Loading banks..." : selectedBank ? selectedBank.name : placeholder ?? "Select your bank"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banks..."
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            data-testid="input-bank-search"
          />
        </div>
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: viewportHeight }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No bank found.</p>
          ) : (
            <div style={{ height: totalHeight, position: "relative" }}>
              {visibleBanks.map((bank, i) => {
                const index = startIndex + i;
                const isSelected = bank.code === value;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      onChange(bank.code);
                      setOpen(false);
                    }}
                    className={cn(
                      "absolute left-0 right-0 flex items-center gap-2 px-2 text-sm hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50",
                    )}
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                    data-testid={`option-bank-${bank.code}`}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{bank.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
