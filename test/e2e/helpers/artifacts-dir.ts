import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Screenshot output dir for e2e.
 * Prefer ARTIFACTS or PLAYWRIGHT_ARTIFACTS_DIR; else test-results/<subdir>
 * (gitignored). If mkdir fails (e.g. unwritable /opt/cursor/artifacts), fall
 * back to os.tmpdir(). Call only when taking a screenshot — never at module load.
 */
export function e2eArtifactsDir(subdir = 'artifacts'): string {
  const preferred = process.env.ARTIFACTS?.trim()
    || process.env.PLAYWRIGHT_ARTIFACTS_DIR?.trim()
    || join('test-results', subdir)
  try {
    mkdirSync(preferred, { recursive: true })
    return preferred
  } catch {
    const fallback = join(tmpdir(), subdir)
    mkdirSync(fallback, { recursive: true })
    return fallback
  }
}

export function e2eArtifactPath(filename: string, subdir = 'artifacts'): string {
  return join(e2eArtifactsDir(subdir), filename)
}
