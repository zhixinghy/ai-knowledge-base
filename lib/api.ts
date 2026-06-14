const BASE = "/api";

/** 后端返回非 2xx 时抛出;带上后端的 error 文案和可选 code(如 "QUOTA")。 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Options extends Omit<RequestInit, "body"> {
  /** JSON 请求体:自动 stringify 并设 Content-Type */
  json?: unknown;
  /** 原始请求体(如 FormData,浏览器自带 boundary);与 json 二选一 */
  body?: BodyInit;
}

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { json, body, headers, ...rest } = opts;
  const res = await fetch(BASE + path, {
    ...rest,
    headers:
      json !== undefined
        ? { "Content-Type": "application/json", ...headers }
        : headers,
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  const data = (await res.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error ?? `请求失败(${res.status})`,
      data?.code,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>(path, opts),
  post: <T>(path: string, json?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: "POST", json }),
  del: <T>(path: string, json?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: "DELETE", json }),
  /** 上传 FormData(不设 Content-Type,交给浏览器带 multipart boundary) */
  upload: <T>(path: string, body: BodyInit, opts?: Options) =>
    request<T>(path, { ...opts, method: "POST", body }),
};
