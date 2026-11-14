import { describe, expect, it } from 'vitest'
import {
  BLOCK_MS,
  MAX_FAILURES,
  WINDOW_MS,
  clearFailures,
  isBlocked,
  recordFailure,
} from '../server/utils/rate-limit'

describe('unlock rate limit', () => {
  it('blocks after the configured number of failures', () => {
    const key = `test-block-${Math.random()}`
    const now = 1_000_000

    for (let i = 0; i < MAX_FAILURES; i++) {
      expect(isBlocked(key, now).blocked).toBe(false)
      recordFailure(key, now)
    }

    const gate = isBlocked(key, now)
    expect(gate.blocked).toBe(true)
    expect(gate.retryAfter).toBeGreaterThan(0)
  })

  it('clears failures after a successful unlock', () => {
    const key = `test-clear-${Math.random()}`
    const now = 2_000_000

    for (let i = 0; i < MAX_FAILURES; i++) recordFailure(key, now)
    expect(isBlocked(key, now).blocked).toBe(true)

    clearFailures(key)
    expect(isBlocked(key, now).blocked).toBe(false)
  })

  it('unblocks after the block window passes', () => {
    const key = `test-expire-${Math.random()}`
    const now = 3_000_000

    for (let i = 0; i < MAX_FAILURES; i++) recordFailure(key, now)
    expect(isBlocked(key, now).blocked).toBe(true)
    expect(isBlocked(key, now + BLOCK_MS + 1).blocked).toBe(false)
  })

  it('resets the failure window after it elapses', () => {
    const key = `test-window-${Math.random()}`
    const now = 4_000_000

    recordFailure(key, now)
    recordFailure(key, now + WINDOW_MS + 1)
    expect(isBlocked(key, now + WINDOW_MS + 1).blocked).toBe(false)
  })
})
