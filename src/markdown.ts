/**
 * 极简 Markdown 清洗（够用即可）：
 * - 去掉链接/强调/行内代码等标记
 * - 不追求 100% 还原，只为把 steps 变得干净可读
 */
export function stripMarkdownInline(input: string): string {
  let s = input

  // links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')

  // images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')

  // inline code: `code`
  s = s.replace(/`([^`]+)`/g, '$1')

  // bold/italic: **x** __x__ *x* _x_
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1')
  s = s.replace(/__([^_]+)__/g, '$1')
  s = s.replace(/\*([^*]+)\*/g, '$1')
  s = s.replace(/_([^_]+)_/g, '$1')

  // strikethrough: ~~x~~
  s = s.replace(/~~([^~]+)~~/g, '$1')

  // html tags (rare)
  s = s.replace(/<[^>]+>/g, '')

  // collapse spaces
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

export function stripMarkdownBlock(md: string): string {
  const lines = md.split(/\r?\n/)
  const out: string[] = []
  let inCode = false

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.trim().startsWith('```')) {
      inCode = !inCode
      continue
    }
    if (inCode) continue

    // headings
    if (/^#{1,6}\s+/.test(line.trim())) continue

    // blockquote marker
    const cleaned = stripMarkdownInline(line.replace(/^>\s?/, ''))
    if (cleaned) out.push(cleaned)
  }

  return out.join('\n').trim()
}
