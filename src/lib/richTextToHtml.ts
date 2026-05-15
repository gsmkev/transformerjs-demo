interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function inlineNodes(nodes: TiptapNode[] = []): string {
  return nodes.map((n) => {
    if (n.type === 'text') {
      let t = n.text ?? ''
      t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      for (const mark of n.marks ?? []) {
        if (mark.type === 'bold') t = `<strong>${t}</strong>`
        else if (mark.type === 'italic') t = `<em>${t}</em>`
        else if (mark.type === 'strike') t = `<s>${t}</s>`
        else if (mark.type === 'code') t = `<code>${t}</code>`
      }
      return t
    }
    if (n.type === 'hardBreak') return '<br>'
    return ''
  }).join('')
}

function blockNode(n: TiptapNode): string {
  const inner = inlineNodes(n.content)
  switch (n.type) {
    case 'paragraph': return `<p>${inner || '&nbsp;'}</p>`
    case 'heading': {
      const level = (n.attrs?.level as number) ?? 1
      return `<h${level}>${inner}</h${level}>`
    }
    case 'blockquote': return `<blockquote>${(n.content ?? []).map(blockNode).join('')}</blockquote>`
    case 'codeBlock': return `<pre><code>${inlineNodes(n.content)}</code></pre>`
    case 'bulletList':
      return `<ul>${(n.content ?? []).map((li) => `<li>${(li.content ?? []).map(blockNode).join('')}</li>`).join('')}</ul>`
    case 'orderedList':
      return `<ol>${(n.content ?? []).map((li) => `<li>${(li.content ?? []).map(blockNode).join('')}</li>`).join('')}</ol>`
    default: return inner ? `<p>${inner}</p>` : ''
  }
}

export function richTextToHtml(richText: string): string {
  try {
    const doc = JSON.parse(richText) as TiptapNode
    return (doc.content ?? []).map(blockNode).join('\n')
  } catch {
    return `<p>${richText}</p>`
  }
}
