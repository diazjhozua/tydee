import type { ProblemDetails } from "./types";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ProblemDetails | null,
    method: string,
    path: string,
  ) {
    super(`${method} ${path} failed with ${status}${body?.title ? ` (${body.title})` : ""}`);
    this.name = "HttpError";
  }
}

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
};

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token?: string,
  ) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>({ method: "GET", path });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", path, body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PUT", path, body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PATCH", path, body });
  }

  delete<T = void>(path: string): Promise<T> {
    return this.request<T>({ method: "DELETE", path });
  }

  private async request<T>({ method, path, body }: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
      throw new HttpError(response.status, problem, method, path);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
