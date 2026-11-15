import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Screenshot output dir for e2e.
 * Prefer PLAYWRIGHT_ARTIFACTS_DIR; default test-results/artifacts
 * (do not hardcode /opt/cursor/artifacts — missing on local machines).
 */
export function e2eArtifactsDir(): string {
  const dir = process.env.PLAYWRIGHT_ARTIFACTS_DIR?.trim()
    || join('test-results', 'artifacts')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function e2eArtifactPath(filename: string): string {
  return join(e2eArtifactsDir(), filename)
}
