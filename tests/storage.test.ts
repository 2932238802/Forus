import { describe, expect, it } from 'vitest'
import { extractStoragePath } from '../utils/storage'

describe('extractStoragePath', () => {
  it('parses local upload urls', () => {
    expect(extractStoragePath('/uploads/abc.jpg')).toBe('abc.jpg')
    expect(extractStoragePath('/uploads/a%20b.png')).toBe('a b.png')
  })

  it('parses legacy supabase public urls', () => {
    expect(
      extractStoragePath('https://ref.supabase.co/storage/v1/object/public/media/x.png'),
    ).toBe('x.png')
  })

  it('ignores external urls', () => {
    expect(extractStoragePath('https://other.com/uploads/x.jpg')).toBeNull()
    expect(extractStoragePath('https://other.com/x.jpg')).toBeNull()
  })
})
