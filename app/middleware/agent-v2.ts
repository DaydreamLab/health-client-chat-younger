import { isAgentV2EnabledFlag } from '~/utils/agent-v2'

/**
 * Feature gate for `/app/v2`. When NUXT_PUBLIC_AGENT_V2_ENABLED is off,
 * client navigation gets a branded 404. Server/prerender skips so static
 * shells still emit (same pattern as auth middleware).
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) {
    return
  }

  const config = useRuntimeConfig()
  if (isAgentV2EnabledFlag(config.public.agentV2Enabled)) {
    return
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    fatal: true
  })
})
