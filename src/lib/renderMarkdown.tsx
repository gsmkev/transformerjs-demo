import type { ReactNode } from 'react'

function parseInline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*(?!\*)|`[^`\n]+?`|\[\d+\])/g
  let last = 0
  let i = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const raw = match[0]
    if (raw.startsWith('**')) {
      nodes.push(<strong key={`${prefix}-${i}`} className="font-semibold text-ink">{raw.slice(2, -2)}</strong>)
    } else if (raw.startsWith('*')) {
      nodes.push(<em key={`${prefix}-${i}`} className="italic text-ink/90">{raw.slice(1, -1)}</em>)
    } else if (raw.startsWith('`')) {
      nodes.push(<code key={`${prefix}-${i}`} className="font-mono text-xs bg-white/8 px-1 py-0.5 rounded text-accent-light">{raw.slice(1, -1)}</code>)
    } else if (/^\[\d+\]$/.test(raw)) {
      nodes.push(<sup key={`${prefix}-${i}`} className="text-accent font-bold text-[10px] ml-0.5">{raw}</sup>)
    }
    last = regex.lastIndex
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function renderMarkdown(text: string): ReactNode[] {
  const blocks: ReactNode[] = []
  const paragraphs = text.split(/\n\n+/)

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi].trim()
    if (!para) continue
    const lines = para.split('\n')

    if (lines[0].startsWith('> ')) {
      const content = lines.map((l) => l.replace(/^>\s?/, '')).join(' ')
      blocks.push(
        <blockquote key={pi} className="border-l-2 border-accent/40 pl-3 text-dim/80 italic my-1">
          {parseInline(content, `bq-${pi}`)}
        </blockquote>
      )
      continue
    }

    if (lines.some((l) => /^[-*]\s/.test(l))) {
      blocks.push(
        <ul key={pi} className="space-y-0.5 list-none">
          {lines.filter((l) => /^[-*]\s/.test(l)).map((l, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-accent flex-shrink-0 select-none">•</span>
              <span>{parseInline(l.replace(/^[-*]\s/, ''), `li-${pi}-${i}`)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    blocks.push(
      <p key={pi} className="mb-2 last:mb-0">
        {parseInline(para, `p-${pi}`)}
      </p>
    )
  }

  return blocks
}
