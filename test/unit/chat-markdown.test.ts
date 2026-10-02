import { describe, expect, it } from 'vitest'
import { renderChatMarkdown } from '../../app/utils/chat-markdown'

describe('renderChatMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(renderChatMarkdown('')).toBe('')
  })

  it('renders bold as strong', () => {
    const html = renderChatMarkdown('請注意 **重點** 即可')
    expect(html).toContain('<strong>重點</strong>')
    expect(html).not.toContain('**')
  })

  it('renders lists', () => {
    const html = renderChatMarkdown('- 甲\n- 乙')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>甲</li>')
    expect(html).toContain('<li>乙</li>')
  })

  it('keeps line breaks with GFM breaks', () => {
    const html = renderChatMarkdown('第一行\n第二行')
    expect(html).toContain('<br')
  })

  it('strips raw HTML tags such as script', () => {
    const html = renderChatMarkdown('你好 <script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('</script')
  })

  it('rejects javascript: links', () => {
    const html = renderChatMarkdown('[x](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('href=')
  })

  it('opens links in a new tab safely', () => {
    const html = renderChatMarkdown('[連結](https://example.com)')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('collapses stacked thematic breaks and empty paragraphs', () => {
    const html = renderChatMarkdown('上段\n\n---\n\n\n---\n\n結尾問句？')
    expect(html.match(/<hr\s*\/?>/gi)?.length ?? 0).toBe(1)
    expect(html).toContain('上段')
    expect(html).toContain('結尾問句？')
  })

  it('drops a trailing thematic break before CTA text ends the bubble', () => {
    const html = renderChatMarkdown('內容\n\n---\n')
    expect(html).not.toMatch(/<hr\s*\/?>/i)
    expect(html).toContain('內容')
  })
})
