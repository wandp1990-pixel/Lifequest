/**
 * @module lib/admin/token
 * @purpose 관리자 토큰(localStorage) 저장/조회 + admin-protected 라우트 호출용 fetch 래퍼.
 *          `/api/skill-db` (POST/PUT/DELETE) 및 `/api/battle-config` (PUT) 가 fail-closed 정책으로
 *          `Authorization: Bearer <ADMIN_SECRET>` 헤더를 강제하므로, UI 가 토큰을 자동 부착해야 함.
 *          토큰은 사용자가 SettingsDrawer 에서 입력 → 브라우저 localStorage 에만 보관.
 *
 * @add-here:
 *   - 새 admin-protected 라우트 호출 시 adminFetch 를 그대로 재사용
 * @do-not:
 *   - 토큰을 서버로 부수 전송 (오직 Authorization 헤더에만 사용)
 *   - cookie / sessionStorage 로 변경 (SSR 안전성, 명시적 입력 의도와 어긋남)
 */

const STORAGE_KEY = "lq.adminToken"

/** SSR 안전. 브라우저 환경이 아니면 빈 문자열. */
export function getAdminToken(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

/** 빈 문자열이면 키 삭제. 공백은 trim 하지 않고 그대로 저장(토큰에 패딩이 있을 수 있어). */
export function setAdminToken(value: string): void {
  if (typeof window === "undefined") return
  try {
    if (value === "") {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  } catch {
    /* localStorage 접근 불가 환경(시크릿 모드 일부 등) → 무시 */
  }
}

/**
 * fetch 래퍼. 토큰이 있으면 `Authorization: Bearer <token>` 자동 부착.
 * 응답 처리 / 에러 변환은 호출자가 담당 (useApi 의 request 와 동일한 책임 분리).
 *
 * 사용 예:
 *   const res = await adminFetch("/api/skill-db", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   })
 */
export function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken()
  if (!token) return fetch(input, init)

  // 기존 headers 가 Headers / array / object 어떤 형태든 안전하게 병합
  const headers = new Headers(init.headers)
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return fetch(input, { ...init, headers })
}

/**
 * adminFetch + JSON parse + 표준 에러 처리.
 * - `lib/api/respond.ts` 가 항상 `{ error: string }` 으로 응답하므로 그 메시지를 throw 한다.
 * - 401 (토큰 불일치) / 503 (env 미설정) 은 호출자가 catch 해서 사용자에게 안내.
 * - 204 / 빈 body 도 안전 처리.
 */
export class AdminFetchError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "AdminFetchError"
  }
}

export async function adminRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" }
    init.body = JSON.stringify(body)
  }
  const res = await adminFetch(url, init)
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : res.statusText || "request failed"
    throw new AdminFetchError(res.status, msg)
  }
  return data as T
}

/** 401/503 표준 메시지. 패널 측 toast/alert 표시에 사용. */
export function adminErrorMessage(err: unknown): string | null {
  if (!(err instanceof AdminFetchError)) return null
  if (err.status === 401) return "관리자 토큰을 확인하세요 (Settings → 관리자)"
  if (err.status === 503) return "ADMIN_SECRET 환경변수 미설정 — 배포 환경 설정이 필요합니다"
  return null
}
