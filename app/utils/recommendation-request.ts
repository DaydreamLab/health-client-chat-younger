/** Build POST /recommendations body from journey state (avoid report_id vs conversation mismatch). */
export function recommendationRequestFromJourney(input: {
  conversationId: string | null
  reportId: string | null
  /** LY4: v2 context — never sent as conversation_id. */
  agentV2ConversationId?: string | null
  enrich?: 'template' | 'llm'
  limit?: number
}): {
  enrich: 'template' | 'llm'
  limit: number
  conversation_id?: string
  report_id?: string
  agent_v2_conversation_id?: string
} {
  const body: {
    enrich: 'template' | 'llm'
    limit: number
    conversation_id?: string
    report_id?: string
    agent_v2_conversation_id?: string
  } = {
    enrich: input.enrich ?? 'template',
    limit: input.limit ?? 30
  }

  const agentV2Id = input.agentV2ConversationId?.trim() ?? ''
  const conversationId = input.conversationId?.trim() ?? ''
  const reportId = input.reportId?.trim() ?? ''

  // Agent v2: never reuse the v2 id as a v1 conversation_id. Prefer report_id
  // (+ optional agent_v2_conversation_id for core LC5).
  if (agentV2Id !== '') {
    body.agent_v2_conversation_id = agentV2Id
    if (reportId !== '') {
      body.report_id = reportId
    }
    return body
  }

  if (conversationId !== '') {
    body.conversation_id = conversationId
    return body
  }

  if (reportId !== '') {
    body.report_id = reportId
  }

  return body
}
