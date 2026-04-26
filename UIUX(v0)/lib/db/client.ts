import { createClient, type Client } from "@libsql/client"

let _client: Client | null = null

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
  }
  return _client
}

function kstDate(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
}

export function now(): string {
  return kstDate().toISOString().replace("T", " ").slice(0, 19)
}

export function todayKST(): string {
  return kstDate().toISOString().slice(0, 10)
}
