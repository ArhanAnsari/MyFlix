import { NextResponse } from "next/server";

export type ApiLogContext = {
  route: string;
  requestId: string;
  startedAt: number;
};

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

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  min = 1,
  max = 100,
) {
  const num = Number(value ?? fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

export function createApiLogContext(route: string): ApiLogContext {
  return {
    route,
    requestId: crypto.randomUUID(),
    startedAt: Date.now(),
  };
}

export function logApiStart(ctx: ApiLogContext, details?: string) {
  console.info(
    `[api][${ctx.route}][${ctx.requestId}] start${details ? ` ${details}` : ""}`,
  );
}

export function logApiSuccess(ctx: ApiLogContext, details?: string) {
  console.info(
    `[api][${ctx.route}][${ctx.requestId}] success durationMs=${Date.now() - ctx.startedAt}${details ? ` ${details}` : ""}`,
  );
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
  console.error(
    `[api][unscoped] error status=${status} message=${message}`,
    error,
  );
  return NextResponse.json({ error: message }, { status });
}

export function handleApiErrorWithContext(
  error: unknown,
  fallbackMessage: string,
  ctx: ApiLogContext,
) {
  const { status, message } = mapError(error, fallbackMessage);
  console.error(
    `[api][${ctx.route}][${ctx.requestId}] error status=${status} durationMs=${Date.now() - ctx.startedAt} message=${message}`,
    error,
  );
  return NextResponse.json({ error: message }, { status });
}

export function jsonForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
