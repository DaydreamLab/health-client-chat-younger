import { describe, expect, it } from 'vitest'
import { consumeAgentV2Sse, isAgentV2StreamingFlag } from '../../app/utils/agent-v2-stream'

function sseResponse(chunks: string[], ok = true): Response {
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })
  return new Response(body, {
    status: ok ? 200 : 404,
    headers: { 'content-type': 'text/event-stream' }
  })
}

describe('agent-v2 stream helpers', () => {
  it('is opt-in only', () => {
    expect(isAgentV2StreamingFlag(undefined)).toBe(false)
    expect(isAgentV2StreamingFlag(false)).toBe(false)
    expect(isAgentV2StreamingFlag('1')).toBe(true)
  })

  it('returns null for non-SSE responses so callers can fall back', async () => {
    const res = new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
    expect(await consumeAgentV2Sse(res, 'conv-1')).toBeNull()
  })

  it('parses delta + done into a turn result', async () => {
    const deltas: string[] = []
    const res = sseResponse([
      'event: delta\ndata: {"text":"你好"}\n\n',
      'event: delta\ndata: {"text":"世界"}\n\n',
      'event: done\ndata: {"conversation_id":"conv-1","state":"cta_offered","missing":[],"reply":{"text":"你好世界"},"actions":[{"key":"offer_recommend","label":"取得專屬保健品方案"}]}\n\n'
    ])
    const turn = await consumeAgentV2Sse(res, 'conv-1', {
      onDelta: chunk => deltas.push(chunk)
    })
    expect(deltas).toEqual(['你好', '世界'])
    expect(turn).toMatchObject({
      conversation_id: 'conv-1',
      state: 'cta_offered',
      reply: { text: '你好世界' },
      actions: [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
    })
  })
})
