let notify: (() => void) | null = null

export function bindSessionActivity(fn: () => void) {
  notify = fn
}

export function noteSessionActivity() {
  notify?.()
}
