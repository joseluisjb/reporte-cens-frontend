import { afterEach, describe, expect, it, vi } from 'vitest'
import { ahoraBogotaISO, hoyLocalISO } from '../mocks/utilidades'

const pad = (n) => String(n).padStart(2, '0')

describe('utilidades de fecha del backend simulado', () => {
  afterEach(() => vi.useRealTimers())

  it('hoyLocalISO devuelve la fecha LOCAL como YYYY-MM-DD', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-11T03:30:00Z')) // cerca de la medianoche UTC
    const d = new Date()
    const hoy = hoyLocalISO()
    expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(hoy).toBe(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  })

  it('ahoraBogotaISO devuelve la hora de Bogotá con desfase -05:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-11T03:30:00Z'))
    expect(ahoraBogotaISO()).toBe('2026-10-10T22:30:00-05:00')
  })
})
