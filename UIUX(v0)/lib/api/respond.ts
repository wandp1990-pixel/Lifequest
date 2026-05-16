/**
 * @module lib/api/respond
 * @purpose route handler 응답 표준화 + initDb + try/catch 래핑
 * @add-here:
 *   - 새 표준 응답 헬퍼 (예: created, noContent)
 *   - 글로벌 에러 변환 룰
 * @do-not:
 *   - 응답 shape 변경 (기존 클라이언트가 의존: { error: string } / data 직렬화)
 *   - status code 변경 (기존 route 와 동일하게 500/400/404)
 */

import { NextResponse } from "next/server"
import { initDb } from "@/lib/db"

/** 정상 응답. data 를 그대로 JSON 으로 반환 (status 200). */
export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data)
}

/** 에러 응답: { error: string, code? }. 기본 status 500. code 는 클라이언트 분기용 식별자. */
export function err(msg: string, status = 500, code?: string): NextResponse {
  return NextResponse.json(code ? { error: msg, code } : { error: msg }, { status })
}

/** 400 Bad Request. code 는 클라이언트가 케이스를 구분하기 위한 식별자. */
export function badRequest(msg: string, code?: string): NextResponse {
  return err(msg, 400, code)
}

/** 404 Not Found. */
export function notFound(msg: string): NextResponse {
  return err(msg, 404)
}

/**
 * route handler 래퍼.
 * - initDb() 자동 호출
 * - 핸들러 throw 시 { error: String(e) } / 500 표준화
 * - NextResponse 가 반환되면 그대로 통과
 *
 * 기존 패턴:
 *   try { await initDb(); ...; return NextResponse.json(data) }
 *   catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
 *
 * → 래퍼 적용:
 *   export const GET = withInit(async () => { ...; return ok(data) })
 */
export function withInit<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse> | NextResponse,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      await initDb()
      return await handler(...args)
    } catch (e) {
      return err(String(e), 500)
    }
  }
}
