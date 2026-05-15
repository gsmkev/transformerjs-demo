const K1 = 1.5
const B  = 0.75

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // Unicode-aware: preserves á, é, ñ, ü, etc.
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

export class BM25Index {
  private readonly tokenized: string[][]
  private readonly df: Map<string, number>
  private readonly avgdl: number
  private readonly N: number

  constructor(documents: string[]) {
    this.N = documents.length
    this.tokenized = documents.map(tokenize)
    this.df = new Map()
    let total = 0

    for (const tokens of this.tokenized) {
      total += tokens.length
      for (const term of new Set(tokens)) {
        this.df.set(term, (this.df.get(term) ?? 0) + 1)
      }
    }
    this.avgdl = this.N > 0 ? total / this.N : 1
  }

  private score(docIdx: number, queryTerms: string[]): number {
    const tokens = this.tokenized[docIdx]
    const dl = tokens.length
    const tf = new Map<string, number>()
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)

    let s = 0
    for (const term of queryTerms) {
      const f = tf.get(term) ?? 0
      if (f === 0) continue
      const df = this.df.get(term) ?? 0
      const idf = Math.log((this.N - df + 0.5) / (df + 0.5) + 1)
      s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * dl / this.avgdl))
    }
    return s
  }

  search(query: string, topK: number): Array<{ idx: number; score: number }> {
    const qTerms = tokenize(query)
    return this.tokenized
      .map((_, i) => ({ idx: i, score: this.score(i, qTerms) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}

// Reciprocal Rank Fusion — merges multiple ranked lists into one
export function reciprocalRankFusion(
  rankings: Array<Array<{ idx: number }>>,
  k = 60,
): Array<{ idx: number; score: number }> {
  const scores = new Map<number, number>()
  for (const ranking of rankings) {
    ranking.forEach(({ idx }, rank) => {
      scores.set(idx, (scores.get(idx) ?? 0) + 1 / (k + rank + 1))
    })
  }
  return [...scores.entries()]
    .map(([idx, score]) => ({ idx, score }))
    .sort((a, b) => b.score - a.score)
}
