import { calculateTripFinancials, DEFAULT_SETTINGS } from "./calculator";

describe("calculateTripFinancials", () => {
  const s = DEFAULT_SETTINGS;

  it("caso del ejemplo: 5M, 20 motos, amarre descontado", () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    expect(r.netFreight).toBe(4_770_000);
    expect(r.advance).toBe(3_339_000);
    expect(r.balance).toBe(1_431_000);
    expect(r.unloadExpense).toBe(70_000);
    // El descargue ahora se persiste como autoExpense
    expect(r.autoExpenses.find((e) => e.code === "UNLOAD")?.amount).toBe(
      70_000,
    );
  });

  it("amarre NO descontado → cargo por moto", () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: false,
    });
    expect(r.netFreight).toBe(4_980_000);
    expect(r.totalCharges).toBe(80_000);
  });

  it("concepto 10% como descuento del flete (base = neto)", () => {
    const s2 = {
      ...s,
      tenPctEnabled: true,
      tenPctKind: "discount" as const,
      tenPctAffects: "freight" as const,
    };
    const r = calculateTripFinancials(s2, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    // 10% de 4_770_000 = 477_000 → neto = 4_770_000 - 477_000 = 4_293_000
    expect(r.netFreight).toBe(4_293_000);
    expect(r.tenPctAmount).toBe(477_000);
    // No se persiste como gasto
    expect(r.autoExpenses.find((e) => e.code === "TEN_PCT")).toBeUndefined();
  });

  it("concepto 10% como descuento del flete (base = bruto)", () => {
    const s2 = {
      ...s,
      tenPctEnabled: true,
      tenPctBase: "gross_freight" as const,
      tenPctKind: "discount" as const,
      tenPctAffects: "freight" as const,
    };
    const r = calculateTripFinancials(s2, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    // 10% de 5_000_000 = 500_000 → neto = 4_770_000 - 500_000 = 4_270_000
    expect(r.netFreight).toBe(4_270_000);
    expect(r.tenPctAmount).toBe(500_000);
  });

  it("concepto 10% como descuento del anticipo (no afecta flete)", () => {
    const s2 = {
      ...s,
      tenPctEnabled: true,
      tenPctKind: "discount" as const,
      tenPctAffects: "advance" as const,
    };
    const r = calculateTripFinancials(s2, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    // Flete neto NO cambia (sigue siendo 4_770_000)
    expect(r.netFreight).toBe(4_770_000);
    expect(r.tenPctAmount).toBe(477_000);
    // Anticipo = 70% de 4_770_000 - 477_000 = 3_339_000 - 477_000 = 2_862_000
    expect(r.advance).toBe(2_862_000);
    expect(r.balance).toBe(1_908_000); // neto - anticipo
  });

  it("concepto 10% como gasto del viaje (kind=expense)", () => {
    const s2 = {
      ...s,
      tenPctEnabled: true,
      tenPctKind: "expense" as const,
      tenPctAffects: "freight" as const,
    };
    const r = calculateTripFinancials(s2, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    // Flete neto NO cambia
    expect(r.netFreight).toBe(4_770_000);
    expect(r.tenPctAmount).toBe(477_000);
    // Se persiste como gasto (autoExpense)
    const tenExpense = r.autoExpenses.find((e) => e.code === "TEN_PCT");
    expect(tenExpense).toBeDefined();
    expect(tenExpense?.amount).toBe(477_000);
    expect(tenExpense?.categoryCode).toBe("OTROS");
  });

  it("anticipo + cumplido suman el neto", () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 1_234_567,
      motoQty: 7,
      tieDeducted: true,
    });
    expect(r.advance + r.balance).toBe(r.netFreight);
  });

  it("descargue se incluye en autoExpenses", () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 15,
      tieDeducted: true,
    });
    const unload = r.autoExpenses.find((e) => e.code === "UNLOAD");
    expect(unload).toBeDefined();
    expect(unload?.amount).toBe(15 * 3500);
    expect(unload?.categoryCode).toBe("DESCARGUE");
  });

  it("sin motos → no genera gasto de descargue", () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 0,
      tieDeducted: true,
    });
    expect(r.autoExpenses.find((e) => e.code === "UNLOAD")).toBeUndefined();
  });

  it("concepto 10% deshabilitado → tenPctAmount = 0", () => {
    const r = calculateTripFinancials(s, {
      grossFreight: 5_000_000,
      motoQty: 20,
      tieDeducted: true,
    });
    expect(r.tenPctAmount).toBe(0);
    expect(r.autoExpenses.find((e) => e.code === "TEN_PCT")).toBeUndefined();
  });
});
