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

  it('keeps a trailing thematic break so section rules stay visible', () => {
    const html = renderChatMarkdown('內容\n\n---\n')
    expect(html).toMatch(/<hr\s*\/?>/i)
    expect(html).toContain('內容')
  })

  it('renders the main GFM block types used in chat replies', () => {
    const html = renderChatMarkdown([
      '##### 小標',
      '',
      '正文 *斜體* ~~刪除~~',
      '',
      '> 引用',
      '',
      '- [x] 完成',
      '',
      '| 項目 | 數值 |',
      '| --- | ---: |',
      '| A | 1 |',
      '',
      '```',
      'code',
      '```'
    ].join('\n'))

    expect(html).toContain('<h5>')
    expect(html).toContain('<em>')
    expect(html).toContain('<del>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('<table>')
    expect(html).toContain('align="right"')
    expect(html).toContain('<pre>')
  })
})
