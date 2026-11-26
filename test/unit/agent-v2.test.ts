import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AGENT_V2_OFFER_RECOMMEND_KEY,
  AGENT_V2_RECOMMENDATIONS_PATH,
  AGENT_V2_REQUIREMENTS,
  agentV2ActionsToReplyActions,
  agentV2ApiBase,
  agentV2RequirementDone,
  isAgentV2EnabledFlag,
  isOfferRecommendAction,
  normalizeAgentV2Actions,
  normalizeAgentV2Missing
} from '../../app/utils/agent-v2'

describe('agent-v2 helpers', () => {
  it('parses the feature flag as opt-in (default off)', () => {
    expect(isAgentV2EnabledFlag(undefined)).toBe(false)
    expect(isAgentV2EnabledFlag(false)).toBe(false)
    expect(isAgentV2EnabledFlag('0')).toBe(false)
    expect(isAgentV2EnabledFlag('')).toBe(false)
    expect(isAgentV2EnabledFlag(true)).toBe(true)
    expect(isAgentV2EnabledFlag('1')).toBe(true)
    expect(isAgentV2EnabledFlag(1)).toBe(true)
  })

  it('derives /api/v2 from the v1 apiBase', () => {
    expect(agentV2ApiBase('http://localhost:8080/api/v1')).toBe(
      'http://localhost:8080/api/v2'
    )
    expect(agentV2ApiBase('https://api.example.com/api/v1/')).toBe(
      'https://api.example.com/api/v2'
    )
    expect(agentV2ApiBase('https://api.example.com/api/v3')).toBe(
      'https://api.example.com/api/v2'
    )
  })

  it('normalizes missing requirements and action buttons from backend only', () => {
    expect(normalizeAgentV2Missing(['goals', 'profile', 'nope', 'goals']))
      .toEqual(['goals', 'profile'])
    expect(normalizeAgentV2Missing(null)).toEqual([])
    expect(normalizeAgentV2Actions([
      { key: 'offer_recommend', label: '取得專屬保健品方案' },
      { key: ' ', label: 'x' },
      { key: 'ask_more', label: '再聊聊' },
      null
    ])).toEqual([
      { key: 'offer_recommend', label: '取得專屬保健品方案' },
      { key: 'ask_more', label: '再聊聊' }
    ])
  })

  it('tracks three-requirement progress from missing only', () => {
    expect(AGENT_V2_REQUIREMENTS).toEqual(['profile', 'report', 'goals'])
    expect(agentV2RequirementDone('profile', ['report', 'goals'])).toBe(true)
    expect(agentV2RequirementDone('report', ['report', 'goals'])).toBe(false)
    expect(agentV2RequirementDone('goals', [])).toBe(true)
  })

  it('routes offer_recommend to the existing recommendations page', () => {
    expect(AGENT_V2_OFFER_RECOMMEND_KEY).toBe('offer_recommend')
    expect(AGENT_V2_RECOMMENDATIONS_PATH).toBe('/app/recommendations')
    expect(isOfferRecommendAction({ key: 'offer_recommend' })).toBe(true)
    expect(isOfferRecommendAction({ key: 'other' })).toBe(false)
  })

  it('maps offer_recommend actions into reply_actions for ChatPanel／TurnActions', () => {
    expect(agentV2ActionsToReplyActions([])).toBeNull()
    expect(agentV2ActionsToReplyActions([{ key: 'ask_more', label: '再聊聊' }])).toBeNull()
    expect(agentV2ActionsToReplyActions([
      { key: 'offer_recommend', label: '取得專屬保健品方案' }
    ])).toEqual({
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'llm',
      degraded: false,
      error: null,
      actions: [{
        type: 'offer_recommend',
        payload: {
          mode: 'view_recommendations',
          label: '取得專屬保健品方案',
          path: '/app/recommendations'
        }
      }]
    })
  })
})

describe('agent-v2 isolation wiring', () => {
  const nuxtConfig = readFileSync(resolve('nuxt.config.ts'), 'utf8')
  const middleware = readFileSync(resolve('app/middleware/agent-v2.ts'), 'utf8')
  const page = readFileSync(resolve('app/pages/chat/v2.vue'), 'utf8')
  const chatPanel = readFileSync(resolve('app/components/ChatPanel.vue'), 'utf8')
  const appIndex = readFileSync(resolve('app/pages/app/index.vue'), 'utf8')
  const chat = readFileSync(resolve('app/pages/chat/index.vue'), 'utf8')
  const chatAi = readFileSync(resolve('app/pages/chat-ai.vue'), 'utf8')
  const memberNav = readFileSync(resolve('app/composables/useMemberNavExtension.ts'), 'utf8')

  it('exposes runtimeConfig.public.agentV2Enabled from NUXT_PUBLIC_AGENT_V2_ENABLED=1', () => {
    expect(nuxtConfig).toMatch(
      /agentV2Enabled:\s*process\.env\.NUXT_PUBLIC_AGENT_V2_ENABLED\s*===\s*'1'/
    )
    expect(nuxtConfig).toMatch(/'\/chat\/v2'/)
    expect(nuxtConfig).toMatch(/'\/en\/chat\/v2'/)
    expect(nuxtConfig).not.toMatch(/'\/app\/v2'/)
  })

  it('gates /chat/v2 with agent-v2 middleware and reuses ChatPanel mode=v2', () => {
    expect(middleware).toMatch(/isAgentV2EnabledFlag/)
    expect(middleware).toMatch(/statusCode:\s*404/)
    expect(page).toMatch(/middleware:\s*\[['"]chat-layout['"],\s*['"]agent-v2['"]\]/)
    expect(page).toMatch(/mode=["']v2["']/)
    expect(page).toMatch(/ChatPanel/)
    expect(chatPanel).toMatch(/mode\?:\s*['"]v2['"]/)
    expect(chatPanel).toMatch(/useAgentV2Api/)
  })

  it('does not add v2 entry points to existing member home or chat pages', () => {
    expect(appIndex).not.toMatch(/agent-v2|\/chat\/v2|\/app\/v2|AgentV2|mode=["']v2["']/)
    expect(chat).not.toMatch(/agent-v2|\/chat\/v2|\/app\/v2|AgentV2|mode=["']v2["']/)
    expect(chatAi).not.toMatch(/agent-v2|\/chat\/v2|\/app\/v2|AgentV2|mode=["']v2["']/)
    expect(memberNav).not.toMatch(/agent-v2|\/chat\/v2|\/app\/v2|AgentV2/)
  })

  it('removed custom agent-v2 UI components and /app/v2 page', () => {
    expect(() => readFileSync(resolve('app/pages/app/v2.vue'), 'utf8')).toThrow()
    expect(() => readFileSync(resolve('app/components/agent-v2/AgentV2Panel.vue'), 'utf8')).toThrow()
  })
})
