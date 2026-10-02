import { Marked, type Tokens } from 'marked'

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Only allow http(s) links in chat bubbles. */
function safeHref(href: string | null | undefined): string | null {
  if (!href) {
    return null
  }
  const trimmed = href.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return null
  }
  return trimmed
}

const marked = new Marked({
  gfm: true,
  breaks: true
})

marked.use({
  renderer: {
    // Drop raw HTML from model／user text (XSS).
    html() {
      return ''
    },
    image() {
      return ''
    },
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens)
      const safe = safeHref(href)
      if (!safe) {
        return text
      }
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : ''
      return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`
    }
  }
})

/** Collapse empty blocks and stacked thematic breaks from model markdown. */
export function normalizeChatHtml(html: string): string {
  let out = html
  // Empty paragraphs (with optional soft break) between sections.
  out = out.replace(/<p>(?:\s|<br\s*\/?>)*<\/p>/gi, '')
  // Stacked <hr> → one.
  out = out.replace(/(?:<hr\s*\/?>\s*){2,}/gi, '<hr>')
  // Leading / trailing thematic breaks (leave section content breathing room to CTA).
  out = out.replace(/^(?:\s*<hr\s*\/?>)+/i, '')
  out = out.replace(/(?:<hr\s*\/?>\s*)+$/i, '')
  return out.trim()
}

/** Render chat markdown to safe HTML for bubble display (no DOMPurify). */
export function renderChatMarkdown(text: string): string {
  if (!text) {
    return ''
  }

  const raw = marked.parse(text, { async: false })
  if (typeof raw !== 'string') {
    return ''
  }

  return normalizeChatHtml(raw)
}
