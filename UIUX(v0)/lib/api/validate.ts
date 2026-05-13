/**
 * @module lib/api/validate
 * @purpose route 입력 검증 헬퍼. 실패 시 ValidationError 를 throw.
 *          ValidationError 는 respond.withInit 의 catch 에서 400 으로 변환되도록
 *          기본 메시지를 한국어로 유지한다.
 * @add-here:
 *   - 도메인 특화 검증 (예: requireDate, requireEnum)
 * @do-not:
 *   - 검증 실패 시 정상 응답 반환하지 말 것 (반드시 throw)
 */

export class ValidationError extends Error {
  status: number
  constructor(msg: string, status = 400) {
    super(msg)
    this.status = status
    this.name = "ValidationError"
  }
}

/** value 가 유한한 number 인지. */
export function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field}는 숫자여야 합니다`)
  }
  return value
}

/** value 가 비어있지 않은 string 인지. trim 후 반환. */
export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field}을(를) 입력하세요`)
  }
  return value.trim()
}

/** value 가 boolean 인지. */
export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${field}는 true/false 여야 합니다`)
  }
  return value
}

/** value 가 allowed 목록 중 하나인지. */
export function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`${field}는 ${allowed.join("/")}여야 합니다`)
  }
  return value as T
}
