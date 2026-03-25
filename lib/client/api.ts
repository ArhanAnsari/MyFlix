export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

type ApiRequestOptions = RequestInit & {
  onUnauthorized?: () => void;
};

export async function apiRequest<T>(input: RequestInfo | URL, options: ApiRequestOptions = {}) {
  const { onUnauthorized, headers, ...rest } = options;

  const response = await fetch(input, {
    credentials: "include",
    ...rest,
    headers: {
      ...(headers ?? {}),
    },
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }

    const message =
      (body && typeof body.error === "string" && body.error) ||
      (body && typeof body.message === "string" && body.message) ||
      "Request failed";

    throw new ApiError(response.status, message);
  }

  return (body ?? {}) as T;
}
