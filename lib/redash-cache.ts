/**
 * lib/redash-cache.ts
 * 
 * Persistent Redash CSV cache using /tmp filesystem.
 * 
 * Why: Vercel serverless functions are stateless — module-level variables
 * (like `let cache = null`) reset on every cold start. /tmp persists 
 * for the lifetime of the container (~15 min on warm invocations).
 * This means cache hits work properly on warm containers, and cold
 * starts fetch fresh data automatically.
 * 
 * TTL: 5 minutes. Redash data is refreshed every few hours by StayVista,
 * so 5 minutes is a good balance between freshness and speed.
 */

import fs from 'fs'
import path from 'path'
import { REDASH_REG_URL, REDASH_FEED_URL } from './config'

const CACHE_DIR = '/tmp/sv-redash-cache'
const TTL_MS = 5 * 60 * 1000 // 5 minutes

type CacheEntry = { data: Record<string,string>[]; ts: number }

function getCachePath(key: string) {
  return path.join(CACHE_DIR, `${key}.json`)
}

function readCache(key: string): Record<string,string>[] | null {
  try {
    if (!fs.existsSync(getCachePath(key))) return null
    const raw = fs.readFileSync(getCachePath(key), 'utf-8')
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > TTL_MS) return null // expired
    return entry.data
  } catch {
    return null
  }
}

function writeCache(key: string, data: Record<string,string>[]) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
    const entry: CacheEntry = { data, ts: Date.now() }
    fs.writeFileSync(getCachePath(key), JSON.stringify(entry))
  } catch (e) {
    // Non-fatal — cache write failure just means next request re-fetches
    console.warn('[redash-cache] write failed:', e)
  }
}

export function parseRedashCSV(csv: string): Record<string,string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals: string[] = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    vals.push(cur.trim())
    const obj: Record<string,string> = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim() })
    return obj
  })
}

export async function getRedashData(): Promise<{
  reg: Record<string,string>[]
  feed: Record<string,string>[]
}> {
  // Try cache first
  let reg = readCache('registration')
  let feed = readCache('feedback')

  // Fetch what's missing or expired
  const fetches: Promise<void>[] = []
  if (!reg) {
    fetches.push(
      fetch(REDASH_REG_URL)
        .then(r => r.text())
        .then(csv => { reg = parseRedashCSV(csv); writeCache('registration', reg!) })
    )
  }
  if (!feed) {
    fetches.push(
      fetch(REDASH_FEED_URL)
        .then(r => r.text())
        .then(csv => { feed = parseRedashCSV(csv); writeCache('feedback', feed!) })
    )
  }

  if (fetches.length > 0) await Promise.all(fetches)

  return { reg: reg || [], feed: feed || [] }
}
