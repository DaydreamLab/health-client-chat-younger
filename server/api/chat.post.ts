type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: ChatMessage[] }>(event)
  const lastUser = [...(body.messages ?? [])]
    .reverse()
    .find(message => message.role === 'user')

  const question = lastUser?.content?.trim() || ''

  return {
    role: 'assistant' as const,
    content: question
      ? `（示範回覆）我收到了：「${question}」。正式模型之後會接在這個 /api/chat。第一版只解釋報告與生活建議，不會指定商品。`
      : '（示範回覆）請先輸入問題。第一版只解釋報告，不會指定商品。'
  }
})
