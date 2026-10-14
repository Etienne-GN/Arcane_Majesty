// Custom overlay on disk (apps/amo/public/lpc_custom + src/data/lpc_custom.json):
// sheets authored in the motion workshop, their manifest and their credits.
// Paths are library-relative ("weapon/sword/arming/universal/run/bg.png").
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync, statSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { deflateSync, crc32 } from 'node:zlib'
import { SLOTS, renderType } from '../../amo/src/systems/lpcLayout.js'
import { readJson, writeJsonAtomic } from './castStore.js'

const TYPES = new Set([...SLOTS.map(renderType), 'body', 'head'])
const PATH_RE = /^[a-z0-9_-]+(\/[A-Za-z0-9_.-]+)+\.png$/
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/** Why `p` can't be a custom sheet path (null = fine). */
export function customPathError(p) {
  if (typeof p !== 'string' || !PATH_RE.test(p)) return 'path must look like type/id/…/motion/file.png'
  const parts = p.split('/')
  if (parts.some(s => s === '.' || s === '..' || s.startsWith('.'))) return 'path may not contain . or .. segments'
  if (!TYPES.has(parts[0])) return `unknown layer type "${parts[0]}"`
  return null
}

/** { w, h } from a PNG's IHDR, or null when `buf` isn't a PNG. */
export function pngSize(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return null
  if (buf.subarray(12, 16).toString('latin1') !== 'IHDR') return null
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

/** Minimal RGBA PNG encoder (tests and tools; the browser uploads canvas PNGs). */
export function encodePng(w, h, rgba) {
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'latin1')
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([len, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1)
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

// ── CREDITS.csv (the game's per-file attribution, ~6 MB): parsed once per mtime ──
let csvCache = { path: '', mtime: 0, rows: new Map() }

function parseCsv(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else q = false }
      else field += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(field.trim()); field = '' }
    else if (ch === '\n') { row.push(field.trim()); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row) }
  return rows
}

const list = s => (s ? s.split(',').map(x => x.trim()).filter(Boolean) : [])

/**
 * Attribution of a library file from CREDITS.csv: { authors, licenses, urls, matched } or null.
 * The CSV uses upstream's layout (item/fg/walk.png, item/walk.png per colour
 * folder) where ours is item/walk/fg.png, and has no rows for some newer
 * motions — so it tries the exact path, then those layouts, then the nearest
 * item folder with a credited sheet (same artists). `matched` names the row used.
 */
export function creditsFor(csvPath, libPath) {
  if (!existsSync(csvPath)) return null
  const mtime = statSync(csvPath).mtimeMs
  if (csvCache.path !== csvPath || csvCache.mtime !== mtime) {
    const rows = new Map(), dirs = new Map()
    for (const [file, , authors, licenses, urls] of parseCsv(readFileSync(csvPath, 'utf8')).slice(1)) {
      if (!file) continue
      rows.set(file, { authors: list(authors), licenses: list(licenses), urls: list(urls) })
      const parts = file.split('/')
      for (let n = parts.length - 1; n >= 2; n--) {
        const d = parts.slice(0, n).join('/')
        if (!dirs.has(d)) dirs.set(d, file)
      }
    }
    csvCache = { path: csvPath, mtime, rows, dirs }
  }
  const { rows, dirs } = csvCache
  const parts = libPath.split('/')
  const cands = [libPath]
  if (parts.length >= 3) {
    const [anim, file] = [parts.at(-2), parts.at(-1).slice(0, -4)]
    const item = parts.slice(0, -2).join('/')
    cands.push(`${item}/${file}/${anim}.png`, `${item}/${anim}.png`, `${item}/${file}/walk.png`, `${item}/walk.png`)
  }
  for (const c of cands) if (rows.has(c)) return { ...rows.get(c), matched: c }
  // nearest credited folder: the item itself, then its parents (never a bare type folder)
  for (let n = parts.length - 1; n >= 2; n--) {
    const f = dirs.get(parts.slice(0, n).join('/'))
    if (f) return { ...rows.get(f), matched: f }
  }
  return null
}

/**
 * Write a custom sheet and its manifest entry. derivedFrom = library paths the
 * draft came from; their licences/authors carry over (CC-BY-SA/GPL stay so).
 * `license` adds the author's own licence. Overwriting keeps the original createdAt. Returns the manifest entry.
 */
export function saveCustom({ dir, manifestPath, csvPath }, { path, png, author, derivedFrom = [], license, note }) {
  const manifest = readJson(manifestPath, {})
  const authors = new Set(), licenses = new Set(), urls = new Set()
  let unknown = false
  for (const src of derivedFrom) {
    const c = creditsFor(csvPath, src) ?? (manifest[src] ? { authors: manifest[src].authors ?? [], licenses: manifest[src].licenses, urls: [] } : null)
    if (!c) { unknown = true; continue }
    c.authors.forEach(a => authors.add(a)); c.licenses.forEach(l => licenses.add(l)); c.urls.forEach(u => urls.add(u))
  }
  if (author) authors.add(author)
  if (license) licenses.add(license)   // the author's own licence for original work
  const entry = {
    author: author || 'unknown',
    derivedFrom,
    authors: [...authors],
    licenses: unknown || !licenses.size ? [...licenses, 'unknown'] : [...licenses],
    urls: [...urls],
    createdAt: manifest[path]?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (note) entry.note = note
  const file = join(dir, path)
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, png)
  renameSync(tmp, file)
  writeJsonAtomic(manifestPath, sortKeys({ ...manifest, [path]: entry }))
  return entry
}

export function deleteCustom({ dir, manifestPath }, path) {
  const manifest = readJson(manifestPath, {})
  if (!manifest[path]) return false
  delete manifest[path]
  const file = join(dir, path)
  if (existsSync(file)) unlinkSync(file)
  writeJsonAtomic(manifestPath, manifest)
  return true
}

function sortKeys(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))
}
