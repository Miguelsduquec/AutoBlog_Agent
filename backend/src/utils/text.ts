function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function sanitizeText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(value: string): string {
  return stripDiacritics(sanitizeText(value)).toLowerCase();
}

export function formatSearchQuery(value: string): string {
  return sanitizeText(value).toLowerCase();
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

export function formatKeywordAsTopic(value: string): string {
  return titleCase(value.trim().replace(/\s+/g, " "));
}
