import type { Mesa } from "../types";

export const mesas: Mesa[] = Array.from({ length: 12 }, (_, i) => ({
  id: `m${i + 1}`,
  numero: i + 1,
  status: "libero" as const,
  pedidoId: null,
  aberturaEm: null,
}));
