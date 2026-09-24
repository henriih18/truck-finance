export type Settings = {
  sourceRetPct: number;
  icaRetPct: number;
  tieMode: 'deduct' | 'charge_per_moto';
  tieFixed: number;
  tiePerMoto: number;
  advancePct: number;
  unloadPerMoto: number;
  tenPctEnabled: boolean;
  tenPctLabel: string;
  tenPctBase: 'gross_freight' | 'net_freight';
  tenPctKind: 'discount' | 'expense';
  tenPctAffects: 'freight' | 'advance';
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

export type Financials = {
  grossFreight: number;
  discounts: Discount[];
  totalDiscounts: number;
  totalCharges: number;
  netFreight: number;
  advance: number;
  balance: number;
  unloadExpense: number;
};

export const DEFAULT_SETTINGS: Settings = {
  sourceRetPct: 1,
  icaRetPct: 1,
  tieMode: 'deduct',
  tieFixed: 130000,
  tiePerMoto: 4000,
  advancePct: 70,
  unloadPerMoto: 3500,
  tenPctEnabled: false,
  tenPctLabel: 'Concepto 10%',
  tenPctBase: 'net_freight',
  tenPctKind: 'discount',
  tenPctAffects: 'freight',
  tenPctValue: 10,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateTripFinancials(
  s: Settings,
  t: TripInput,
): Financials {
  if (t.grossFreight < 0) throw new Error('grossFreight must be >= 0');
  if (t.motoQty < 0) throw new Error('motoQty must be >= 0');

  const discounts: Discount[] = [];

  const sourceRet = round2(t.grossFreight * s.sourceRetPct / 100);
  discounts.push({ code: 'SOURCE_RET', label: 'Retención fuente', amount: sourceRet });

  const icaRet = round2(t.grossFreight * s.icaRetPct / 100);
  discounts.push({ code: 'ICA_RET', label: 'Retención ICA', amount: icaRet });

  if (t.tieDeducted) {
    discounts.push({ code: 'TIE', label: 'Amarre', amount: s.tieFixed });
  } else {
    discounts.push({
      code: 'TIE_CHARGE',
      label: 'Amarre por moto',
      amount: -s.tiePerMoto * t.motoQty,
    });
  }

  if (s.tenPctEnabled) {
    const base =
      s.tenPctBase === 'gross_freight'
        ? t.grossFreight
        : t.grossFreight - sourceRet - icaRet - (t.tieDeducted ? s.tieFixed : 0);
    const ten = round2(base * s.tenPctValue / 100);
    if (s.tenPctKind === 'discount' && s.tenPctAffects === 'freight') {
      discounts.push({ code: 'TEN_PCT', label: s.tenPctLabel, amount: ten });
    }
  }

  const totalDiscounts = round2(
    discounts.filter((d) => d.amount > 0).reduce((a, b) => a + b.amount, 0),
  );
  const totalCharges = round2(
    Math.abs(discounts.filter((d) => d.amount < 0).reduce((a, b) => a + b.amount, 0)),
  );

  const netFreight = round2(t.grossFreight - totalDiscounts + totalCharges);
  const advance = round2(netFreight * s.advancePct / 100);
  const balance = round2(netFreight - advance);
  const unloadExpense = round2(t.motoQty * s.unloadPerMoto);

  return {
    grossFreight: t.grossFreight,
    discounts,
    totalDiscounts,
    totalCharges,
    netFreight,
    advance,
    balance,
    unloadExpense,
  };
}