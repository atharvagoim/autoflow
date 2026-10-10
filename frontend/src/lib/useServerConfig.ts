import { useQuery } from "@tanstack/react-query";
import { get } from "./api";
import type { ServerConfig } from "./types";

export function useServerConfig() {
  return useQuery({ queryKey: ["server-config"], queryFn: () => get<ServerConfig>("/auth/config"), staleTime: 5 * 60_000 });
}
