export type Settings = {
  sourceRetPct: number;
  icaRetPct: number;
  tieMode: "deduct" | "charge_per_moto";
  tieFixed: number;
  tiePerMoto: number;
  advancePct: number;
  unloadPerMoto: number;
  tenPctEnabled: boolean;
  tenPctLabel: string;
  tenPctBase: "gross_freight" | "net_freight";
  tenPctKind: "discount" | "expense";
  tenPctAffects: "freight" | "advance";
  tenPctValue: number;
};

export type TripInput = {
  grossFreight: number;
  motoQty: number;
  tieDeducted: boolean;
};

export type Discount = {
  code: string;
  label: string;
  amount: number;
};

/**
 * Gasto automático generado por el calculador (p.ej. descargue, concepto 10%
 * cuando es 'expense'). El llamador debe persistir estos como local_expenses.
 */
export type AutoExpense = {
  code: string;
  categoryCode: string;
  description: string;
  amount: number;
};

export type Financials = {
  grossFreight: number;
  discounts: Discount[]; // descuentos/cargos que afectan el flete
  totalDiscounts: number;
  totalCharges: number;
  netFreight: number;
  advance: number; // anticipo después de descuentos sobre anticipo
  balance: number; // cumplido (neto - anticipo)
  unloadExpense: number; // descargue (gasto del viaje)
  autoExpenses: AutoExpense[]; // gastos automáticos a persistir
  tenPctAmount: number; // valor calculado del concepto 10% (0 si deshabilitado)
};

export const DEFAULT_SETTINGS: Settings = {
  sourceRetPct: 1,
  icaRetPct: 1,
  tieMode: "deduct",
  tieFixed: 130000,
  tiePerMoto: 4000,
  advancePct: 70,
  unloadPerMoto: 3500,
  tenPctEnabled: false,
  tenPctLabel: "Concepto 10%",
  tenPctBase: "net_freight",
  tenPctKind: "discount",
  tenPctAffects: "freight",
  tenPctValue: 10,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateTripFinancials(s: Settings, t: TripInput): Financials {
  if (t.grossFreight < 0) throw new Error("grossFreight must be >= 0");
  if (t.motoQty < 0) throw new Error("motoQty must be >= 0");

  const discounts: Discount[] = [];
  const autoExpenses: AutoExpense[] = [];
  let tenPctAmount = 0;

  // 1. Retención en la fuente
  const sourceRet = round2((t.grossFreight * s.sourceRetPct) / 100);
  discounts.push({
    code: "SOURCE_RET",
    label: "Retención fuente",
    amount: sourceRet,
  });

  // 2. Retención ICA
  const icaRet = round2((t.grossFreight * s.icaRetPct) / 100);
  discounts.push({ code: "ICA_RET", label: "Retención ICA", amount: icaRet });

  // 3. Amarre (descuento fijo o cargo por moto)
  if (t.tieDeducted) {
    discounts.push({ code: "TIE", label: "Amarre", amount: s.tieFixed });
  } else {
    discounts.push({
      code: "TIE_CHARGE",
      label: "Amarre por moto",
      amount: -s.tiePerMoto * t.motoQty,
    });
  }

  // 4. Subtotales para calcular el flete neto (sin concepto 10% todavía,
  //    porque el 10% puede afectar al flete o al anticipo)
  const totalDiscountsSoFar = round2(
    discounts.filter((d) => d.amount > 0).reduce((a, b) => a + b.amount, 0),
  );
  const totalChargesSoFar = round2(
    Math.abs(
      discounts.filter((d) => d.amount < 0).reduce((a, b) => a + b.amount, 0),
    ),
  );
  const netFreightBase = round2(
    t.grossFreight - totalDiscountsSoFar + totalChargesSoFar,
  );

  // 5. Concepto del 10% — 4 combinaciones posibles:
  //    kind=discount + affects=freight  → descuento del flete (resta del netFreight)
  //    kind=discount + affects=advance  → descuento del anticipo (no del flete)
  //    kind=expense  + affects=freight  → gasto del viaje que se paga con anticipo
  //    kind=expense  + affects=advance  → gasto del viaje que se paga con anticipo
  //    (expense no afecta directamente al flete; si afecta=advance, el gasto
  //     se descuenta del anticipo disponible en vez de venir como "gasto")
  let netFreight = netFreightBase;

  if (s.tenPctEnabled) {
    const base =
      s.tenPctBase === "gross_freight" ? t.grossFreight : netFreightBase;
    tenPctAmount = round2((base * s.tenPctValue) / 100);

    if (s.tenPctKind === "discount" && s.tenPctAffects === "freight") {
      // Descuento del flete → añadir a la lista de descuentos
      discounts.push({
        code: "TEN_PCT",
        label: s.tenPctLabel,
        amount: tenPctAmount,
      });
      netFreight = round2(netFreightBase - tenPctAmount);
    } else if (s.tenPctKind === "discount" && s.tenPctAffects === "advance") {
      // Descuento del anticipo → no afecta netFreight, se descuenta del anticipo
      // Lo guardamos como un descuento pero con code distinto para identificarlo.
      // No va a la lista `discounts` (que afectan flete); se maneja aparte abajo.
      // (No se persiste en local_trip_discounts; se aplica al calcular el anticipo.)
    } else if (s.tenPctKind === "expense") {
      // Gasto del viaje → se persiste como local_expense (manualmente por el repo)
      autoExpenses.push({
        code: "TEN_PCT",
        categoryCode: "OTROS",
        description: s.tenPctLabel,
        amount: tenPctAmount,
      });
    }
  }

  // 6. Recalcular totales de descuentos/cargos del flete (por si añadió 10%)
  const totalDiscounts = round2(
    discounts.filter((d) => d.amount > 0).reduce((a, b) => a + b.amount, 0),
  );
  const totalCharges = round2(
    Math.abs(
      discounts.filter((d) => d.amount < 0).reduce((a, b) => a + b.amount, 0),
    ),
  );

  // 7. Anticipo: % del flete neto, menos descuentos sobre anticipo (si los hay)
  let advance = round2((netFreight * s.advancePct) / 100);
  if (
    s.tenPctEnabled &&
    s.tenPctKind === "discount" &&
    s.tenPctAffects === "advance"
  ) {
    advance = round2(advance - tenPctAmount);
  }

  // 8. Cumplido = flete neto - anticipo
  const balance = round2(netFreight - advance);

  // 9. Descargue: gasto del viaje = $/moto × motos
  const unloadExpense = round2(t.motoQty * s.unloadPerMoto);
  autoExpenses.push({
    code: "UNLOAD",
    categoryCode: "DESCARGUE",
    description: `Descargue (${t.motoQty} motos × $${s.unloadPerMoto.toLocaleString("es-CO")})`,
    amount: unloadExpense,
  });

  return {
    grossFreight: t.grossFreight,
    discounts,
    totalDiscounts,
    totalCharges,
    netFreight,
    advance,
    balance,
    unloadExpense,
    autoExpenses,
    tenPctAmount,
  };
}
