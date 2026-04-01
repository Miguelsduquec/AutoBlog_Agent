import { HttpError } from "./errors";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function normalizeHttpUrl(input: string, mode: "origin" | "page" = "origin"): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new HttpError(400, "Website URL is required.");
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new HttpError(400, "Enter a valid website URL, including a real domain.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(400, "Only http and https website URLs are supported.");
  }

  if (!parsed.hostname || !parsed.hostname.includes(".") && parsed.hostname !== "localhost" && !/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
    throw new HttpError(400, "Enter a valid website URL, including a real domain.");
  }

  if (mode === "page") {
    parsed.hash = "";
    parsed.search = "";
    return trimTrailingSlash(parsed.toString()) || parsed.origin;
  }

  return parsed.origin;
}

export function isIpHostname(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}
