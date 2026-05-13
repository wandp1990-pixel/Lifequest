/**
 * @module hooks/useApi
 * @purpose 공통 fetch 래퍼. JSON parse + error normalize.
 *          lib/api/respond.ts 가 항상 `{ error: string }` 형식으로 에러를 반환하므로
 *          그 필드를 throw 로 변환하여 컴포넌트에서 try/catch 또는 .catch() 만 쓰면 됨.
 * @add-here:
 *   - 새 verb (예: apiHead) 추가
 *   - 공통 헤더, abort signal 지원 등 fetcher 자체 확장
 * @do-not:
 *   - 응답 shape 변환 (호출자가 기대하는 JSON 구조 그대로 반환)
 *   - 자동 retry / dedupe (필요 시 SWR 같은 라이브러리 도입을 별도 결정)
 */

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

type Body = unknown

async function request<T>(method: string, url: string, body?: Body): Promise<T> {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" }
    init.body = JSON.stringify(body)
  }
  const res = await fetch(url, init)
  // 204 No Content / 빈 body 에도 대응
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
        ? (data as { error: string }).error
        : res.statusText || "request failed"
    throw new ApiError(res.status, msg)
  }
  return data as T
}

export const apiGet = <T = unknown>(url: string) => request<T>("GET", url)
export const apiPost = <T = unknown>(url: string, body?: Body) => request<T>("POST", url, body)
export const apiPut = <T = unknown>(url: string, body?: Body) => request<T>("PUT", url, body)
export const apiPatch = <T = unknown>(url: string, body?: Body) => request<T>("PATCH", url, body)
export const apiDelete = <T = unknown>(url: string, body?: Body) => request<T>("DELETE", url, body)
