/**
 * Dynamic route shells for S3 + CloudFront static hosting.
 *
 * Path params cannot be enumerated at generate time. We emit one CSR shell per
 * dynamic segment at `/…/_/index.html`, and CloudFront (viewer-request) rewrites
 * real IDs to that shell. Browser URL stays `/app/orders/<id>`; client router
 * reads the param and loads data.
 *
 * Reserved sibling segments (static pages next to `[id].vue`) must NOT rewrite.
 * See docs/cloudfront-www-index-rewrite.md.
 */

/** Placeholder param used only as the generated shell path segment. */
export const STATIC_ROUTE_SHELL_PARAM = '_'

export interface DynamicRouteShell {
  /** File under app/pages, e.g. `app/orders/[id].vue` */
  page: string
  /** URL prefix before the dynamic segment (no trailing slash), zh-TW default locale */
  prefix: string
  /** Sibling path segments that keep their own prerendered HTML */
  reserved: string[]
}

/**
 * Every `[param].vue` under app/pages. Keep in sync with the filesystem —
 * `scripts/check-static-pages.mjs` also discovers dynamic pages and compares.
 */
export const DYNAMIC_ROUTE_SHELLS: readonly DynamicRouteShell[] = [
  {
    page: 'app/orders/[id].vue',
    prefix: '/app/orders',
    reserved: ['paid', 'pay-failed']
  },
  {
    page: 'app/expert-cases/[id].vue',
    prefix: '/app/expert-cases',
    reserved: []
  },
  {
    page: 'app/wearables/[deviceId].vue',
    prefix: '/app/wearables',
    reserved: []
  }
] as const

/** Prerender seeds (zh-TW + `/en`) for CSR shells. */
export function dynamicShellPrerenderRoutes(
  enPrefix = '/en'
): string[] {
  const routes: string[] = []
  for (const shell of DYNAMIC_ROUTE_SHELLS) {
    const path = `${shell.prefix}/${STATIC_ROUTE_SHELL_PARAM}`
    routes.push(path, `${enPrefix}${path}`)
  }
  return routes
}

/** routeRules entries: CSR shell, no SSR snapshot for `_`. */
export function dynamicShellRouteRules(): Record<string, { ssr: false }> {
  const rules: Record<string, { ssr: false }> = {}
  for (const path of dynamicShellPrerenderRoutes()) {
    rules[path] = { ssr: false }
  }
  return rules
}
