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

export function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19)
}
