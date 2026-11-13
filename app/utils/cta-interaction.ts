/**
 * CTA grey-retain helpers (design B v3 / candor-core #186).
 * Interaction meta on reply_actions drives historical selected／disabled paint.
 */

import { CandorApiError } from './candor-api'
import type { ChatMessage } from './first-order'
import type {
  CtaControlStatus,
  ReplyAction,
  ReplyActions,
  ReplyActionsInteraction,
  ReplyActionsOutcome,
  VitalsField
} from './reply-actions'
import {
  askVitalsPayload,
  chooseOptionPayload,
  hasCtaInteractionMeta,
  parseCtaControlStatus
} from './reply-actions'

export function isStaleCtaError(err: unknown): err is CandorApiError {
  return err instanceof CandorApiError
    && err.statusCode === 409
    && err.errorCode === 'stale_cta'
}

/** Effective chip status for paint／click (compat: missing → current when round live). */
export function resolveOptionControlStatus(
  optionStatus: CtaControlStatus | null | undefined,
  roundStatus: ReplyActionsInteraction['round_status'] | null | undefined,
  opts?: { forceDisabled?: boolean }
): CtaControlStatus {
  if (opts?.forceDisabled) {
    return 'disabled'
  }
  if (optionStatus === 'selected' || optionStatus === 'disabled' || optionStatus === 'current') {
    return optionStatus
  }
  if (roundStatus === 'historical') {
    return 'disabled'
  }
  return 'current'
}

export function resolveConfirmControlStatus(
  confirmStatus: CtaControlStatus | null | undefined,
  roundStatus: ReplyActionsInteraction['round_status'] | null | undefined,
  opts?: { forceDisabled?: boolean }
): CtaControlStatus {
  return resolveOptionControlStatus(confirmStatus, roundStatus, opts)
}

export function isCtaControlInteractive(status: CtaControlStatus): boolean {
  return status === 'current'
}

function asPayload(action: ReplyAction): Record<string, unknown> {
  return action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
    ? { ...action.payload as Record<string, unknown> }
    : {}
}

function stampOptionStatuses(
  options: unknown,
  selectedCodes: ReadonlySet<string>,
  outcome: ReplyActionsOutcome
): unknown {
  if (!Array.isArray(options)) {
    return options
  }
  return options.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item
    }
    const row = { ...(item as Record<string, unknown>) }
    const code = typeof row.code === 'string' ? row.code : ''
    if (outcome === 'free_text') {
      row.status = 'disabled'
    } else if (code && selectedCodes.has(code)) {
      row.status = 'selected'
    } else {
      row.status = 'disabled'
    }
    return row
  })
}

/**
 * After the user answers a CTA round, keep reply_actions on the bubble and
 * stamp historical selected／disabled (design B — do not strip the buttons).
 */
export function resolveReplyActionsAsHistorical(
  message: ChatMessage,
  resolution: {
    outcome: Exclude<ReplyActionsOutcome, null>
    selectedCodes?: readonly string[]
    vitalsStored?: { value: number } | null
  }
): void {
  const ra = message.replyActions
  if (!ra) {
    return
  }
  const selected = new Set(resolution.selectedCodes ?? [])
  const actions = (Array.isArray(ra.actions) ? ra.actions : []).map((action) => {
    if (action.type === 'choose_option') {
      const payload = asPayload(action)
      const options = stampOptionStatuses(payload.options, selected, resolution.outcome)
      const confirmWasOn = payload.confirm === true
        || payload.mode === 'multi'
        || payload.answer_type === 'multi_enum'
        || payload.kind === 'consultation_goals'
      return {
        ...action,
        payload: {
          ...payload,
          options,
          confirm_status: confirmWasOn
            ? (resolution.outcome === 'option_selected' ? 'selected' : 'disabled')
            : (payload.confirm_status ?? undefined),
          selected: resolution.outcome === 'option_selected' ? [...selected] : []
        }
      }
    }
    if (action.type === 'ask_vitals') {
      const payload = asPayload(action)
      const stored = resolution.vitalsStored
      if (resolution.outcome === 'option_selected' && stored && Number.isFinite(stored.value)) {
        return {
          ...action,
          payload: {
            ...payload,
            status: 'selected',
            has_stored_value: true,
            stored_value: stored.value
          }
        }
      }
      if (stored && Number.isFinite(stored.value)) {
        return {
          ...action,
          payload: {
            ...payload,
            status: 'disabled',
            has_stored_value: true,
            stored_value: stored.value
          }
        }
      }
      return {
        ...action,
        payload: {
          ...payload,
          status: 'disabled',
          has_stored_value: false,
          stored_value: null
        }
      }
    }
    // offer_* / ask_report / ask_goal → whole control disabled when round resolves
    const payload = asPayload(action)
    return {
      ...action,
      payload: {
        ...payload,
        status: 'disabled'
      }
    }
  })

  message.replyActions = {
    ...ra,
    interaction: {
      round_status: 'historical',
      outcome: resolution.outcome
    },
    actions
  }
}

/** Selected chip codes from hydrated option.status (history reload). */
export function selectedCodesFromReplyActions(ra: ReplyActions | null | undefined): string[] {
  if (!ra || !Array.isArray(ra.actions)) {
    return []
  }
  const out: string[] = []
  for (const action of ra.actions) {
    if (action.type !== 'choose_option') {
      continue
    }
    const payload = chooseOptionPayload(action)
    for (const option of payload.options ?? []) {
      if (option.status === 'selected') {
        out.push(option.code)
      }
    }
    // Fallback: payload.selected when status missing (partial hydrate)
    if (out.length === 0 && payload.selected?.length) {
      out.push(...payload.selected)
    }
  }
  return out
}

export function vitalsDisplayFromReplyActions(ra: ReplyActions | null | undefined): {
  fields: VitalsField[]
  status: CtaControlStatus | null
  hasStoredValue: boolean
  storedValue: number | null
  gapCode: string | null
} | null {
  if (!ra) {
    return null
  }
  const action = ra.actions.find(item => item.type === 'ask_vitals')
  if (!action) {
    return null
  }
  const payload = askVitalsPayload(action)
  return {
    fields: payload.fields ?? [],
    status: payload.status ?? (hasCtaInteractionMeta(ra) && ra.interaction?.round_status === 'historical'
      ? 'disabled'
      : null),
    hasStoredValue: payload.has_stored_value === true,
    storedValue: payload.stored_value ?? null,
    gapCode: payload.gap_code ?? null
  }
}

/**
 * Entry path_switch settle resolution (design B v3).
 * Chip tap → selected code + others grey; free-typed entry → all grey.
 */
export function resolveEntryPathSwitchResolution(
  pathCode: string,
  entryOutcome: 'option_selected' | 'free_text' = 'option_selected'
): {
  outcome: Exclude<ReplyActionsOutcome, null>
  selectedCodes?: readonly string[]
} {
  if (entryOutcome === 'free_text') {
    return { outcome: 'free_text' }
  }
  return {
    outcome: 'option_selected',
    selectedCodes: [pathCode]
  }
}

export function ensureCurrentInteraction(ra: ReplyActions): ReplyActions {
  if (hasCtaInteractionMeta(ra)) {
    return ra
  }
  // Optimistic stamp for live turns when core omitted interaction (still paint as current).
  return {
    ...ra,
    interaction: {
      round_status: 'current',
      outcome: null
    },
    actions: ra.actions.map((action) => {
      if (action.type === 'choose_option') {
        const payload = asPayload(action)
        const options = Array.isArray(payload.options)
          ? payload.options.map((item) => {
              if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return item
              }
              const row = { ...(item as Record<string, unknown>) }
              if (!parseCtaControlStatus(row.status)) {
                row.status = 'current'
              }
              return row
            })
          : payload.options
        return {
          ...action,
          payload: {
            ...payload,
            options,
            confirm_status: parseCtaControlStatus(payload.confirm_status) ?? 'current'
          }
        }
      }
      if (action.type === 'ask_vitals') {
        const payload = asPayload(action)
        return {
          ...action,
          payload: {
            ...payload,
            status: parseCtaControlStatus(payload.status) ?? 'current'
          }
        }
      }
      const payload = asPayload(action)
      return {
        ...action,
        payload: {
          ...payload,
          status: parseCtaControlStatus(payload.status) ?? 'current'
        }
      }
    })
  }
}
