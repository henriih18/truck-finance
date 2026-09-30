/**
 * Métricas de kilometraje y rendimiento para un viaje.
 *
 * Servicio independiente (requisito #26) — no depende de la BD ni de la UI,
 * solo recibe números y devuelve cálculos. Fácil de testear.
 */
export type MileageInput = {
  initialMileage: number | null;
  finalMileage: number | null;
  fuelExpense: number;       // total gastado en combustible en este viaje
  totalExpenses: number;     // total de gastos del viaje (incluye combustible)
  fuelUnitPrice?: number;    // precio por galón/litro (opcional, para calcular galones)
};

export type MileageMetrics = {
  initial: number | null;
  final: number | null;
  distance: number | null;        // km recorridos = final - inicial
  fuelConsumed: number | null;    // galones estimados (si se conoce fuelUnitPrice)
  fuelEfficiency: number | null;  // km por galón (distance / fuelConsumed)
  costPerKm: number | null;       // $/km (totalExpenses / distance)
  fuelCostPerKm: number | null;   // $/km solo combustible
  isComplete: boolean;            // true si initial y final están seteados
};

export function calculateMileageMetrics(
  input: MileageInput,
): MileageMetrics {
  const { initialMileage, finalMileage, fuelExpense, totalExpenses, fuelUnitPrice } = input;

  const hasBoth = initialMileage != null && finalMileage != null && finalMileage >= initialMileage;
  const distance = hasBoth ? finalMileage! - initialMileage! : null;

  let fuelConsumed: number | null = null;
  if (fuelUnitPrice && fuelUnitPrice > 0 && fuelExpense > 0) {
    fuelConsumed = round2(fuelExpense / fuelUnitPrice);
  }

  let fuelEfficiency: number | null = null;
  if (distance && distance > 0 && fuelConsumed && fuelConsumed > 0) {
    fuelEfficiency = round2(distance / fuelConsumed);
  }

  let costPerKm: number | null = null;
  if (distance && distance > 0 && totalExpenses > 0) {
    costPerKm = round2(totalExpenses / distance);
  }

  let fuelCostPerKm: number | null = null;
  if (distance && distance > 0 && fuelExpense > 0) {
    fuelCostPerKm = round2(fuelExpense / distance);
  }

  return {
    initial: initialMileage,
    final: finalMileage,
    distance,
    fuelConsumed,
    fuelEfficiency,
    costPerKm,
    fuelCostPerKm,
    isComplete: hasBoth,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
