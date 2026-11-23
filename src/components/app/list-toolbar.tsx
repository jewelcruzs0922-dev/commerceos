"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ToolbarOption = { value: string; label: string };

export type ToolbarSelect = {
  name: string;
  label: string;
  value: string;
  options: ToolbarOption[];
};

export function ListToolbar({
  searchPlaceholder,
  searchValue,
  filters = [],
  sort,
  className,
}: {
  searchPlaceholder: string;
  searchValue: string;
  filters?: ToolbarSelect[];
  sort?: ToolbarSelect;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchValue);

  function push(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const value = params.toString();
    startTransition(() => {
      router.replace(value ? `${pathname}?${value}` : pathname);
    });
  }

  function submitSearch() {
    push((params) => {
      const trimmed = query.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
    });
  }

  function updateSelect(name: string, value: string) {
    push((params) => {
      if (value && value !== "all") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
    });
  }

  const hasFilters =
    Boolean(searchValue) ||
    filters.some((filter) => Boolean(filter.value)) ||
    Boolean(sort && sort.value !== sort.options[0]?.value);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        pending && "opacity-70",
        className
      )}
    >
      <form
        className="relative flex w-full items-center sm:w-64"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        role="search"
      >
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-8 pl-8 pr-8"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              push((params) => params.delete("q"));
            }}
            aria-label="Clear search"
            className="absolute right-2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </form>

      {filters.map((filter) => (
        <Select
          key={filter.name}
          value={filter.value || "all"}
          onValueChange={(value) => updateSelect(filter.name, value)}
        >
          <SelectTrigger
            size="sm"
            aria-label={filter.label}
            className={cn(
              "w-auto min-w-[8.5rem] border-transparent bg-transparent hover:bg-muted/40 hover:text-foreground",
              filter.value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value || "all"}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {sort ? (
        <Select
          value={sort.value}
          onValueChange={(value) => updateSelect(sort.name, value)}
        >
          <SelectTrigger
            size="sm"
            aria-label={sort.label}
            className="w-auto min-w-[9.5rem] border-transparent bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sort.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            startTransition(() => router.replace(pathname));
          }}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
