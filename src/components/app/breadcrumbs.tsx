"use client";

import { ChevronRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { findNavGroup, findNavItem } from "@/config/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const group = findNavGroup(pathname);
  const item = findNavItem(pathname);

  if (!group || !item) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <li>{group.label}</li>
        <li aria-hidden="true">
          <ChevronRightIcon className="size-3" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          {item.label}
        </li>
      </ol>
    </nav>
  );
}
