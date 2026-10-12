import { describe, expect, it } from 'vitest'
import { recommendationRequestFromJourney } from '../../app/utils/recommendation-request'

describe('recommendationRequestFromJourney', () => {
  it('prefers conversation_id and omits report_id to avoid mismatch', () => {
    expect(recommendationRequestFromJourney({
      conversationId: 'conv-1',
      reportId: 'report-stale'
    })).toEqual({
      enrich: 'template',
      limit: 30,
      conversation_id: 'conv-1'
    })
  })

  it('sends report_id when there is no conversation', () => {
    expect(recommendationRequestFromJourney({
      conversationId: null,
      reportId: 'report-1'
    })).toEqual({
      enrich: 'template',
      limit: 30,
      report_id: 'report-1'
    })
  })
})
