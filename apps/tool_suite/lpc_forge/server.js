import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The game's merged LPC library, read-only, at the same relative paths the
// game serves under public/lpc (Forge v2 renders from it).
const LPC_ROOT = join(__dirname, '../../amo/ressources/lpc_merged/spritesheets')

export function createServer() {
  const db = new Database(join(__dirname, 'saves.db'))

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

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status === 403 ? 404 : (err.status || 500)
    res.status(status).end()
  })

  return app
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.API_PORT || 3001
  createServer().listen(PORT, () => console.log(`API server on http://localhost:${PORT}`))
}
