import {
  Paragraph, TextRun, HeadingLevel, ImageRun,
  AlignmentType,
} from 'docx'

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function inlineRuns(nodes: TiptapNode[] = []): TextRun[] {
  const runs: TextRun[] = []
  for (const n of nodes) {
    if (n.type === 'text') {
      const marks = n.marks ?? []
      runs.push(new TextRun({
        text: n.text ?? '',
        bold: marks.some((m) => m.type === 'bold'),
        italics: marks.some((m) => m.type === 'italic'),
        strike: marks.some((m) => m.type === 'strike'),
        font: marks.some((m) => m.type === 'code') ? 'Courier New' : undefined,
        size: marks.some((m) => m.type === 'code') ? 18 : undefined,
      }))
    } else if (n.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }))
    }
  }
  return runs
}

function blockToParagraphs(n: TiptapNode): Paragraph[] {
  switch (n.type) {
    case 'paragraph':
      return [new Paragraph({ children: inlineRuns(n.content) })]

    case 'heading': {
      const levelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      }
      const level = levelMap[(n.attrs?.level as number) ?? 1] ?? HeadingLevel.HEADING_1
      return [new Paragraph({ heading: level, children: inlineRuns(n.content) })]
    }

    case 'blockquote':
      return (n.content ?? []).flatMap((child) =>
        blockToParagraphs(child).map(() => new Paragraph({
          indent: { left: 720 },
          children: inlineRuns(child.content),
        }))
      )

    case 'bulletList':
      return (n.content ?? []).flatMap((li) =>
        (li.content ?? []).flatMap((child) => [
          new Paragraph({ bullet: { level: 0 }, children: inlineRuns(child.content) }),
        ])
      )

    case 'orderedList':
      return (n.content ?? []).flatMap((li) =>
        (li.content ?? []).flatMap((child) => [
          new Paragraph({ numbering: { reference: 'ordered-list', level: 0 }, children: inlineRuns(child.content) }),
        ])
      )

    case 'codeBlock':
      return [new Paragraph({
        children: [new TextRun({ text: (n.content ?? []).map((t) => t.text ?? '').join(''), font: 'Courier New', size: 18 })],
      })]

    default:
      return [new Paragraph({ children: inlineRuns(n.content) })]
  }
}

export function tiptapToDocxChildren(
  richTextJson: string,
  imageDataUrl: string | null,
  includeImage: boolean,
): Paragraph[] {
  const paragraphs: Paragraph[] = []

  if (includeImage && imageDataUrl) {
    try {
      const b64 = imageDataUrl.split(',')[1]
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      paragraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: 400, height: 300 },
              type: 'jpg',
            }),
          ],
        }),
        new Paragraph({ children: [] }),
      )
    } catch {
      // Image conversion failed — skip
    }
  }

  try {
    const doc = JSON.parse(richTextJson) as TiptapNode
    paragraphs.push(...(doc.content ?? []).flatMap(blockToParagraphs))
  } catch {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: richTextJson })] }))
  }

  return paragraphs
}
