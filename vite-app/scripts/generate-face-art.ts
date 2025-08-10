import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// Minimal Replicate API client via fetch
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN
if (!REPLICATE_TOKEN) {
  console.error('Missing REPLICATE_API_TOKEN in env')
  process.exit(1)
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'public/face')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
const RANKS = ['j', 'q', 'k'] as const

type Suit = typeof SUITS[number]
type Rank = typeof RANKS[number]

function promptFor(suit: Suit, rank: Rank): string {
  const suitWord = suit
  const rankWord = rank === 'j' ? 'jack' : rank === 'q' ? 'queen' : 'king'
  const colorHint = suit === 'hearts' || suit === 'diamonds' ? 'red color palette' : 'black color palette'
  return `playing card ${rankWord} of ${suitWord}, centered character portrait in classic casino style, vector art, ${colorHint}, white background, leave margins so it fits inside card frame, symmetrical composition`
}

async function generateOne(suit: Suit, rank: Rank) {
  const body = {
    // Replace with a Replicate image model/version you have access to, e.g. stability-ai/sdxl
    version: 'stability-ai/sdxl',
    input: {
      prompt: promptFor(suit, rank),
      width: 1024,
      height: 1408,
    },
  } as any

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Replicate request failed: ${res.status} ${await res.text()}`)
  }
  const job = await res.json() as any

  // Poll for completion
  let url: string | undefined
  while (true) {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${job.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
    })
    const data = await r.json() as any
    if (data.status === 'succeeded') {
      const out = data.output
      url = Array.isArray(out) ? out[0] : (typeof out === 'string' ? out : undefined)
      break
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Generation failed: ${data.status}`)
    }
    await new Promise((s) => setTimeout(s, 2500))
  }

  if (!url) throw new Error('No output URL found from Replicate response')
  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const outPath = path.join(OUTPUT_DIR, `${suit}_${rank}.png`)
  fs.writeFileSync(outPath, buf)
  console.log('Saved', outPath)
}

async function main() {
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await generateOne(suit, rank)
      } catch (err) {
        console.error('Failed', suit, rank, err)
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })


