import { afterEach, describe, expect, it, vi } from 'vitest'
import { signToken, verifyToken } from '../server/utils/token'

describe('unlock token', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('verifies a token signed with the same secret', () => {
    const token = signToken('secret-a')
    expect(verifyToken(token, 'secret-a')).toBe(true)
  })

  it('rejects a token signed with a different secret', () => {
    const token = signToken('secret-a')
    expect(verifyToken(token, 'secret-b')).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const token = signToken('secret-a')
    const [payload, signature] = token.split('.')
    const tampered = `${payload}.${signature.slice(0, -1)}x`
    expect(verifyToken(tampered, 'secret-a')).toBe(false)
  })

  it('rejects a malformed token', () => {
    expect(verifyToken('not-a-token', 'secret-a')).toBe(false)
    expect(verifyToken(undefined, 'secret-a')).toBe(false)
    expect(verifyToken('a.b.c', 'secret-a')).toBe(false)
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = signToken('secret-a')

    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'))
    expect(verifyToken(token, 'secret-a', 1000)).toBe(false)
  })

  it('accepts a token within maxAge', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = signToken('secret-a')

    vi.setSystemTime(new Date('2026-01-01T00:00:00.500Z'))
    expect(verifyToken(token, 'secret-a', 1000)).toBe(true)
  })
})
