import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function loadDotEnv(cwd = process.cwd()) {
  const envPath = path.resolve(cwd, '.env')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

loadDotEnv()

const TOKEN = process.env.REPLICATE_API_TOKEN
const MODEL_VERSION = process.env.REPLICATE_MODEL_VERSION
if (!TOKEN) {
  console.error('Error: REPLICATE_API_TOKEN is not set. Create vite-app/.env with REPLICATE_API_TOKEN=...')
  process.exit(1)
}
if (!MODEL_VERSION) {
  console.error('Error: REPLICATE_MODEL_VERSION is not set. Set a model version ID in vite-app/.env (e.g., a SDXL/FLUX model version).')
  process.exit(1)
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'public/face')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const RANKS = ['j', 'q', 'k']

function promptFor(suit, rank) {
  const rankWord = rank === 'j' ? 'jack' : rank === 'q' ? 'queen' : 'king'
  const colorHint = suit === 'hearts' || suit === 'diamonds' ? 'red color palette' : 'black color palette'
  return `playing card ${rankWord} of ${suit}, centered portrait in classic casino style, vector illustration, ${colorHint}, white background, leave margins so it fits inside a standard card frame, symmetrical composition`
}

async function createPrediction(suit, rank) {
  const body = {
    version: MODEL_VERSION,
    input: {
      prompt: promptFor(suit, rank),
      // Many models accept width/height or aspect. Adjust keys as needed for your chosen model
      width: 1024,
      height: 1408,
    },
  }
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Replicate request failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function waitForPrediction(id) {
  while (true) {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const data = await r.json()
    if (data.status === 'succeeded') return data
    if (data.status === 'failed' || data.status === 'canceled') throw new Error(`Prediction ${id} ${data.status}`)
    await new Promise((s) => setTimeout(s, 2500))
  }
}

async function download(url, outPath) {
  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  fs.writeFileSync(outPath, buf)
}

async function generateOne(suit, rank) {
  const job = await createPrediction(suit, rank)
  const done = await waitForPrediction(job.id)
  const out = done.output
  const url = Array.isArray(out) ? out[0] : typeof out === 'string' ? out : undefined
  if (!url) throw new Error('No output URL returned')
  const outPath = path.join(OUTPUT_DIR, `${suit}_${rank}.png`)
  await download(url, outPath)
  console.log('Saved', path.relative(process.cwd(), outPath))
}

async function main() {
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await generateOne(suit, rank)
      } catch (e) {
        console.error('Failed', suit, rank, e?.message || e)
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })


