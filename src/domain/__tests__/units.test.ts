import { describe, expect, it } from 'vitest';
import { blank } from '../../test/fixtures';
import { convertQuantity, round, sumByUnit, toKg } from '../units';

const s = blank();
const productA = s.products.find((p) => p.id === 'pr-a')!; // base UN, 1 CX = 50 UN
const productB = s.products.find((p) => p.id === 'pr-b')!; // base BOB, sem conversão

describe('conversão de unidades', () => {
  it('arredonda de forma estável', () => {
    expect(round(0.1 + 0.2, 3)).toBe(0.3);
    expect(round(1.0005, 3)).toBe(1.001);
    expect(round(-2.5, 0)).toBe(-3);
  });

  it('converte dentro da mesma grandeza com fator fixo', () => {
    expect(convertQuantity(1500, 'u-g', 'u-kg', s.units)).toEqual({ ok: true, value: 1.5 });
    expect(convertQuantity(2, 'u-t', 'u-kg', s.units)).toEqual({ ok: true, value: 2000 });
    expect(toKg(250, 'u-g', s.units)).toEqual({ ok: true, value: 0.25 });
  });

  it('converte embalagem apenas com fator do produto', () => {
    expect(convertQuantity(3, 'u-cx', 'u-un', s.units, productA)).toEqual({ ok: true, value: 150 });
    expect(convertQuantity(100, 'u-un', 'u-cx', s.units, productA)).toEqual({ ok: true, value: 2 });
    expect(convertQuantity(1, 'u-mil', 'u-cx', s.units, productA)).toEqual({ ok: true, value: 20 });
    expect(convertQuantity(3, 'u-cx', 'u-un', s.units).ok).toBe(false);
  });

  it('recusa conversões entre grandezas incompatíveis', () => {
    expect(convertQuantity(10, 'u-bob', 'u-kg', s.units, productB).ok).toBe(false);
    expect(toKg(5, 'u-un', s.units).ok).toBe(false);
  });

  it('soma por unidade sem misturar unidades', () => {
    const r = sumByUnit(
      [{ u: 'u-cx', q: 10 }, { u: 'u-un', q: 5 }, { u: 'u-cx', q: 2.5 }],
      (i) => i.u,
      (i) => i.q,
    );
    expect(r).toEqual({ 'u-cx': 12.5, 'u-un': 5 });
  });
});
