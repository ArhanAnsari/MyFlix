import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requireEnv(name: string, value: string | undefined) {
  if (!value || !value.trim()) {
    throw new HttpError(500, `Missing required environment variable: ${name}`);
  }

  return value;
}

export function parsePositiveInt(value: string | null, fallback: number, min = 1, max = 100) {
  const num = Number(value ?? fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function mapError(error: unknown, fallbackMessage: string) {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message };
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "UNAUTHORIZED") {
    return { status: 401, message: "Unauthorized" };
  }

  if (/forbidden/i.test(message)) {
    return { status: 403, message: "Forbidden" };
  }

  if (/not found|could not be found/i.test(message)) {
    return { status: 404, message: "Resource not found" };
  }

  if (/fetch failed|network/i.test(message)) {
    return { status: 503, message: "Unable to reach Appwrite" };
  }

  return { status: 500, message };
}

export function handleApiError(error: unknown, fallbackMessage: string) {
  const { status, message } = mapError(error, fallbackMessage);
  return NextResponse.json({ error: message }, { status });
}

export function jsonForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
