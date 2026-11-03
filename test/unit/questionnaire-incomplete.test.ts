import { describe, expect, it } from 'vitest'
import { CandorApiError } from '../../app/utils/candor-api'
import {
  isQuestionnaireIncompleteError,
  parseQuestionnaireIncompleteData,
  questionnaireMissingFields
} from '../../app/utils/questionnaire-incomplete'

describe('questionnaire_incomplete (core #145 92e7bbc)', () => {
  it('parses error_data.missing_fields and conversation_id', () => {
    const err = new CandorApiError(
      'Basic profile fields are required: sex, age, height, weight.',
      422,
      'questionnaire_incomplete',
      {
        missing_fields: ['sex', 'age', 'height', 'weight'],
        conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      }
    )
    expect(isQuestionnaireIncompleteError(err)).toBe(true)
    expect(parseQuestionnaireIncompleteData(err)).toEqual({
      missingFields: ['sex', 'age', 'height', 'weight'],
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: null
    })
    expect(questionnaireMissingFields(err)).toEqual(['sex', 'age', 'height', 'weight'])
  })

  it('reads optional order_id from retry envelope without requiring it', () => {
    const err = new CandorApiError(
      'questionnaire incomplete',
      422,
      'questionnaire_incomplete',
      {
        missing_fields: ['weight'],
        conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      }
    )
    expect(parseQuestionnaireIncompleteData(err).orderId).toBe(
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )
  })

  it('rejects other 422 codes', () => {
    const err = new CandorApiError('bad', 422, 'invalid_request', null)
    expect(isQuestionnaireIncompleteError(err)).toBe(false)
  })

  it('filters unknown missing_fields and tolerates bad error_data', () => {
    expect(parseQuestionnaireIncompleteData(
      new CandorApiError('x', 422, 'questionnaire_incomplete', null)
    )).toEqual({ missingFields: [], conversationId: null, orderId: null })
    expect(parseQuestionnaireIncompleteData(
      new CandorApiError('x', 422, 'questionnaire_incomplete', {
        missing_fields: ['sex', 'blood_type', 1, '', 'weight'],
        conversation_id: '  '
      })
    )).toEqual({
      missingFields: ['sex', 'weight'],
      conversationId: null,
      orderId: null
    })
  })
})
