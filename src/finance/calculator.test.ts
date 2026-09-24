import { calculateTripFinancials, DEFAULT_SETTINGS } from './calculator';

describe('calculateTripFinancials', () => {
  const s = DEFAULT_SETTINGS;

  it('caso del ejemplo: 5M, 20 motos, amarre descontado', () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    expect(r.netFreight).toBe(4_770_000);
    expect(r.advance).toBe(3_339_000);
    expect(r.balance).toBe(1_431_000);
    expect(r.unloadExpense).toBe(70_000);
  });

  it('amarre NO descontado → cargo por moto', () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: false,
    });
    expect(r.netFreight).toBe(4_980_000);
    expect(r.totalCharges).toBe(80_000);
  });

  it('concepto 10% habilitado como descuento del flete neto', () => {
    const s2 = { ...s, tenPctEnabled: true };
    const r = calculateTripFinancials(s2, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    expect(r.netFreight).toBe(4_293_000);
  });

  it('anticipo + cumplido suman el neto', () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 1_234_567,
      motoQty: 7,
      tieDeducted: true,
    });
    expect(r.advance + r.balance).toBe(r.netFreight);
  });
});