import { describe, expect, it } from 'vitest'
import {
  daysSince,
  daysUntil,
  nextAnniversary,
  togetherDuration,
  todayCelebration,
} from '../utils/date'

const START = '2026-06-22'

describe('date helpers', () => {
  it('counts the start day as day 1', () => {
    expect(daysSince(START, new Date(2026, 5, 22, 12, 0, 0))).toBe(1)
    expect(daysSince(START, new Date(2026, 5, 23, 0, 0, 0))).toBe(2)
  })

  it('uses the same day count for togetherDuration', () => {
    expect(togetherDuration(START, new Date(2026, 5, 22, 0, 0, 0)).days).toBe(1)
    expect(togetherDuration(START, new Date(2026, 5, 22, 12, 0, 0)).days).toBe(1)
    expect(togetherDuration(START, new Date(2026, 5, 23, 0, 0, 0)).days).toBe(2)
  })

  it('computes days until a future date', () => {
    expect(daysUntil('2026-06-25', new Date(2026, 5, 22, 12, 0, 0))).toBe(3)
  })

  it('rolls the next anniversary to the following year after the date', () => {
    const anniv = nextAnniversary(START, new Date(2026, 5, 23, 12, 0, 0))
    expect(anniv.date).toBe('2027-06-22')
    expect(anniv.yearsCount).toBe(1)
    expect(anniv.label).toBe('1 周年')
    expect(anniv.daysLeft).toBe(364)
  })

  it('detects an anniversary', () => {
    const celebration = todayCelebration(new Date(2027, 5, 22, 12, 0, 0))
    expect(celebration?.kind).toBe('anniversary')
    expect(celebration?.title).toContain('1 周年')
  })

  it('detects a hundred-day milestone', () => {
    const celebration = todayCelebration(new Date(2026, 8, 29, 12, 0, 0))
    expect(celebration?.kind).toBe('hundred')
    expect(celebration?.title).toContain('100')
  })
})
