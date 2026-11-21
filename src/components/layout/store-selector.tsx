"use client";

import { ChevronDownIcon, StoreIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StoreSelector({ storeName }: { storeName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden max-w-[15rem] justify-start gap-2 sm:flex"
        >
          <StoreIcon
            aria-hidden="true"
            className="text-muted-foreground"
          />
          <span className="truncate">{storeName}</span>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary"
          >
            Demo
          </Badge>
          <ChevronDownIcon
            aria-hidden="true"
            className="text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Store</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value="active-store">
          <DropdownMenuRadioItem value="active-store">
            <StoreIcon aria-hidden="true" />
            {storeName}
            <span className="ml-auto text-xs text-muted-foreground">USD</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-1.5 py-1.5 text-xs leading-5 text-muted-foreground">
          Additional stores are not switchable yet.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
