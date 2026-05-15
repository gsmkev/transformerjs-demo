import type { ScannedDocument } from '@/types/document'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function inlineXml(nodes: TiptapNode[] = []): string {
  return nodes.map((n) => {
    if (n.type === 'text') {
      let t = escapeXml(n.text ?? '')
      for (const mark of n.marks ?? []) {
        if (mark.type === 'bold') t = `<text:span text:style-name="Bold">${t}</text:span>`
        else if (mark.type === 'italic') t = `<text:span text:style-name="Italic">${t}</text:span>`
        else if (mark.type === 'strike') t = `<text:span text:style-name="Strikethrough">${t}</text:span>`
        else if (mark.type === 'code') t = `<text:span text:style-name="Source_20_Text">${t}</text:span>`
      }
      return t
    }
    if (n.type === 'hardBreak') return '<text:line-break/>'
    return ''
  }).join('')
}

function blockXml(n: TiptapNode): string {
  switch (n.type) {
    case 'paragraph':
      return `<text:p text:style-name="Text_20_Body">${inlineXml(n.content)}</text:p>`
    case 'heading': {
      const level = (n.attrs?.level as number) ?? 1
      return `<text:h text:style-name="Heading_20_${level}" text:outline-level="${level}">${inlineXml(n.content)}</text:h>`
    }
    case 'blockquote':
      return `<text:p text:style-name="Quotations">${(n.content ?? []).map((c) => inlineXml(c.content)).join('')}</text:p>`
    case 'bulletList':
      return `<text:list text:style-name="List_20_Bullet">${(n.content ?? []).map((li) =>
        `<text:list-item>${(li.content ?? []).map(blockXml).join('')}</text:list-item>`
      ).join('')}</text:list>`
    case 'orderedList':
      return `<text:list text:style-name="List_20_Number">${(n.content ?? []).map((li) =>
        `<text:list-item>${(li.content ?? []).map(blockXml).join('')}</text:list-item>`
      ).join('')}</text:list>`
    case 'codeBlock':
      return `<text:p text:style-name="Preformatted_20_Text">${escapeXml((n.content ?? []).map((t) => t.text ?? '').join(''))}</text:p>`
    default:
      return `<text:p text:style-name="Text_20_Body">${inlineXml(n.content)}</text:p>`
  }
}

export function tiptapToOdtXml(richText: string, rawText: string): string {
  try {
    const doc = JSON.parse(richText) as TiptapNode
    return (doc.content ?? []).map(blockXml).join('\n')
  } catch {
    return `<text:p text:style-name="Text_20_Body">${escapeXml(rawText)}</text:p>`
  }
}

export const ODT_STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
<office:styles>
  <style:style style:name="Text_20_Body" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="6pt"/></style:style>
  <style:style style:name="Heading_20_1" style:family="paragraph"><style:text-properties fo:font-size="18pt" fo:font-weight="bold"/></style:style>
  <style:style style:name="Heading_20_2" style:family="paragraph"><style:text-properties fo:font-size="14pt" fo:font-weight="bold"/></style:style>
  <style:style style:name="Heading_20_3" style:family="paragraph"><style:text-properties fo:font-size="12pt" fo:font-weight="bold"/></style:style>
  <style:style style:name="Quotations" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm"/></style:style>
  <style:style style:name="Preformatted_20_Text" style:family="paragraph"><style:text-properties style:font-name="Courier New"/></style:style>
  <style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
  <style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
  <style:style style:name="Strikethrough" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>
  <style:style style:name="Source_20_Text" style:family="text"><style:text-properties style:font-name="Courier New"/></style:style>
</office:styles>
</office:document-styles>`

export function documentsToOdsXml(docs: ScannedDocument[]): string {
  const headerRow = `<table:table-row>
    <table:table-cell office:value-type="string"><text:p>Título</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Fecha</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Categoría</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Confianza (%)</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Texto</text:p></table:table-cell>
  </table:table-row>`

  const dataRows = docs.map((doc) => {
    const date = new Date(doc.createdAt).toISOString().slice(0, 10)
    const confidence = doc.confidence != null ? String(Math.round(doc.confidence)) : ''
    return `<table:table-row>
      <table:table-cell office:value-type="string"><text:p>${escapeXml(doc.title)}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${date}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${escapeXml(doc.category ?? '')}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${confidence}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${escapeXml(doc.rawText.slice(0, 32767))}</text:p></table:table-cell>
    </table:table-row>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.3">
<office:body><office:spreadsheet>
<table:table table:name="Documentos">
${headerRow}
${dataRows}
</table:table>
</office:spreadsheet></office:body>
</office:document-content>`
}
