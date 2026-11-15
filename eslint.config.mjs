// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Vendored skill scripts（optional Playwright helpers）must not enter app lint.
  {
    ignores: ['.cursor/skills/**']
  }
)
