/** Build POST /recommendations body from journey state (avoid report_id vs conversation mismatch). */
export function recommendationRequestFromJourney(input: {
  conversationId: string | null
  reportId: string | null
  enrich?: 'template' | 'llm'
  limit?: number
}): {
  enrich: 'template' | 'llm'
  limit: number
  conversation_id?: string
  report_id?: string
} {
  const body: {
    enrich: 'template' | 'llm'
    limit: number
    conversation_id?: string
    report_id?: string
  } = {
    enrich: input.enrich ?? 'template',
    limit: input.limit ?? 30
  }

  const conversationId = input.conversationId?.trim() ?? ''
  const reportId = input.reportId?.trim() ?? ''

  if (conversationId !== '') {
    body.conversation_id = conversationId
    return body
  }

  if (reportId !== '') {
    body.report_id = reportId
  }

  return body
}
