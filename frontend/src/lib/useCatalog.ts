import { useQuery } from "@tanstack/react-query";
import { get } from "./api";
import type { Catalog } from "./types";

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: () => get<Catalog>("/automations/catalog"), staleTime: Infinity });
}
