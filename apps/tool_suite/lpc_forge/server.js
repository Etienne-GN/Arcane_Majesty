import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { listCast, writeCast, deleteCast, writeJsonAtomic, readJson } from './castStore.js'
import { ruleErrors } from '../../amo/src/systems/motionRules.js'
import { flagErrors } from './v2/src/model/gapFlags.js'
import { CAST_ID_RE, castShapeErrors } from './v2/src/model/cast.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The game's merged LPC library, read-only, at the same relative paths the
// game serves under public/lpc (Forge v2 renders from it).
const LPC_ROOT = join(__dirname, '../../amo/ressources/lpc_merged/spritesheets')

export function createServer({
  dbPath = join(__dirname, 'saves.db'),
  castDir = join(__dirname, '../../amo/src/data/cast'),
  rulesPath = join(__dirname, '../../amo/src/data/motion_rules.json'),
  flagsPath = join(__dirname, 'gap_flags.json'),
} = {}) {
  const db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS saves (
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      preview TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (type, name)
    )
  `)

  const app = express()
  // Cast files are small; the 20 MB limit is for scratch saves with previews.
  app.use('/api/cast', express.json({ limit: '1mb' }))
  app.use('/api/motion-rules', express.json({ limit: '1mb' }))
  app.use('/api/gap-flags', express.json({ limit: '2mb' }))
  app.use(express.json({ limit: '20mb' }))

  // express.static refuses ../ traversal; fallthrough:false makes misses errors,
  // turned into a plain 404 by the handler at the bottom.
  app.use('/lpc', express.static(LPC_ROOT, { fallthrough: false, index: false, maxAge: '1h' }))

  app.get('/api/saves/:type', (req, res) => {
    const rows = db.prepare('SELECT name, data, preview FROM saves WHERE type = ? ORDER BY name').all(req.params.type)
    const result = {}
    for (const row of rows) {
      result[row.name] = { data: JSON.parse(row.data), preview: row.preview }
    }
    res.json(result)
  })

  app.post('/api/saves/:type', (req, res) => {
    const { name, data, preview } = req.body
    db.prepare('INSERT OR REPLACE INTO saves (type, name, data, preview, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run(req.params.type, name, JSON.stringify(data), preview ?? null)
    res.json({ ok: true })
  })

  app.delete('/api/saves/:type/:name', (req, res) => {
    db.prepare('DELETE FROM saves WHERE type = ? AND name = ?').run(req.params.type, req.params.name)
    res.json({ ok: true })
  })

  // Cast members: committed game data, one JSON file each (see castStore.js).
  app.get('/api/cast', (req, res) => res.json(listCast(castDir)))

  app.put('/api/cast/:id', (req, res) => {
    const { id } = req.params
    if (!CAST_ID_RE.test(id) || req.body?.id !== id) return res.status(400).json({ error: 'bad or mismatched id' })
    const errors = castShapeErrors(req.body)
    if (errors.length) return res.status(400).json({ error: errors.join('; ') })
    writeCast(castDir, req.body)
    res.json({ ok: true })
  })

  app.delete('/api/cast/:id', (req, res) => {
    const { id } = req.params
    if (!CAST_ID_RE.test(id)) return res.status(400).json({ error: 'bad id' })
    if (!deleteCast(castDir, id)) return res.status(404).json({ error: 'not found' })
    res.json({ ok: true })
  })

  // Motion rules: what a layer does in a motion it has no art for (motionRules.js).
  app.get('/api/motion-rules', (req, res) => res.json(readJson(rulesPath, {})))

  app.put('/api/motion-rules', (req, res) => {
    const errors = ruleErrors(req.body)
    if (errors.length) return res.status(400).json({ error: errors.join('; ') })
    writeJsonAtomic(rulesPath, req.body)
    res.json({ ok: true })
  })

  // Gap flags: review notes on item × motion gaps (Forge-only data, not shipped).
  app.get('/api/gap-flags', (req, res) => res.json(readJson(flagsPath, [])))

  app.put('/api/gap-flags', (req, res) => {
    const errors = flagErrors(req.body)
    if (errors.length) return res.status(400).json({ error: errors.join('; ') })
    writeJsonAtomic(flagsPath, req.body)
    res.json({ ok: true })
  })

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status === 403 ? 404 : (err.status || 500)
    res.status(status).end()
  })

  return app
}

// The API writes game data (cast files) and has no authentication, so it only
// listens on this machine. API_HOST overrides it deliberately.
export function startServer(opts, port = process.env.API_PORT || 3001) {
  const host = process.env.API_HOST || '127.0.0.1'
  return new Promise(resolve => {
    const srv = createServer(opts).listen(port, host, () => {
      console.log(`API server on http://${host}:${srv.address().port}`)
      resolve(srv)
    })
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startServer()
