import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`))
