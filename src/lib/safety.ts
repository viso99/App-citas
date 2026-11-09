// Bloquear y denunciar (D-14). Los motivos coinciden con el tipo report_reason de la base.
export const REPORT_REASONS = [
  { value: "perfil_falso", label: "Perfil falso o se hace pasar por otra persona" },
  { value: "fotos_inapropiadas", label: "Fotos inapropiadas" },
  { value: "acoso", label: "Acoso o mensajes ofensivos" },
  { value: "menor_de_edad", label: "Parece menor de edad" },
  { value: "spam", label: "Spam, estafa o publicidad" },
  { value: "otro", label: "Otro motivo" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_DETAILS_MAX = 500;

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.some((r) => r.value === value);
}

// Texto opcional de la denuncia: recortado, o null si está vacío. Si es demasiado largo, no vale.
export function cleanDetails(value: unknown): string | null | undefined {
  if (value == null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text.length === 0) return null;
  return text.length <= REPORT_DETAILS_MAX ? text : undefined;
}
