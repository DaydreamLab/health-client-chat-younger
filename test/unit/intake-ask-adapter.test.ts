import { describe, expect, it } from 'vitest'
import {
  INTAKE_ASK_ANSWER_UI_WIRE_KEY,
  isDecisionDrivenIntakeAsk,
  readIntakeAskAnswerUi,
  resolveIntakeAskAnswerUi
} from '../../app/utils/intake-ask-adapter'

describe('readIntakeAskAnswerUi', () => {
  it(`reads provisional ${INTAKE_ASK_ANSWER_UI_WIRE_KEY}`, () => {
    expect(readIntakeAskAnswerUi({ [INTAKE_ASK_ANSWER_UI_WIRE_KEY]: 'number_input' }))
      .toBe('number_input')
    expect(readIntakeAskAnswerUi({ [INTAKE_ASK_ANSWER_UI_WIRE_KEY]: 'Age_Picker' }))
      .toBe('age_picker')
  })

  it('rejects unknown values', () => {
    expect(readIntakeAskAnswerUi({ [INTAKE_ASK_ANSWER_UI_WIRE_KEY]: 'slider' })).toBeNull()
    expect(readIntakeAskAnswerUi({})).toBeNull()
  })
})

describe('resolveIntakeAskAnswerUi', () => {
  it('prefers wire answer_ui over answer_type', () => {
    expect(resolveIntakeAskAnswerUi({
      source: { [INTAKE_ASK_ANSWER_UI_WIRE_KEY]: 'chips' },
      answerType: 'int',
      gapCode: 'height'
    })).toBe('chips')
  })

  it('maps answer_type int + age gap to age_picker', () => {
    expect(resolveIntakeAskAnswerUi({
      answerType: 'int',
      gapCode: 'age'
    })).toBe('age_picker')
  })

  it('maps answer_type int + height to number_input', () => {
    expect(resolveIntakeAskAnswerUi({
      answerType: 'int',
      gapCode: 'height'
    })).toBe('number_input')
  })

  it('maps enum／multi_enum to chips', () => {
    expect(resolveIntakeAskAnswerUi({ answerType: 'enum', gapCode: 'sex' })).toBe('chips')
    expect(resolveIntakeAskAnswerUi({ answerType: 'multi_enum', gapCode: 'diet' })).toBe('chips')
  })

  it('maps ask_vitals without answer_type', () => {
    expect(resolveIntakeAskAnswerUi({
      hasAskVitals: true,
      vitalsField: 'weight',
      gapCode: 'weight'
    })).toBe('number_input')
  })

  it('returns null when no answer method is present', () => {
    expect(resolveIntakeAskAnswerUi({ gapCode: 'height' })).toBeNull()
  })
})

describe('isDecisionDrivenIntakeAsk', () => {
  it('true when gap_code + answer method resolve', () => {
    expect(isDecisionDrivenIntakeAsk({
      gapCode: 'height',
      answerType: 'int'
    })).toBe(true)
    expect(isDecisionDrivenIntakeAsk({
      gapCode: 'height',
      source: { [INTAKE_ASK_ANSWER_UI_WIRE_KEY]: 'number_input' }
    })).toBe(true)
  })

  it('false without gap_code even if answer_ui present', () => {
    expect(isDecisionDrivenIntakeAsk({
      source: { [INTAKE_ASK_ANSWER_UI_WIRE_KEY]: 'number_input' }
    })).toBe(false)
  })

  it('false when gap_code present but no answer method', () => {
    expect(isDecisionDrivenIntakeAsk({ gapCode: 'height' })).toBe(false)
  })
})
