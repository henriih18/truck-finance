import { calculateMileageMetrics } from './metrics';

describe('calculateMileageMetrics', () => {
  it('sin kilometraje → todo null', () => {
    const m = calculateMileageMetrics({
      initialMileage: null,
      finalMileage: null,
      fuelExpense: 0,
      totalExpenses: 0,
    });
    expect(m.distance).toBeNull();
    expect(m.costPerKm).toBeNull();
    expect(m.isComplete).toBe(false);
  });

  it('solo inicial → no calcula distancia', () => {
    const m = calculateMileageMetrics({
      initialMileage: 100000,
      finalMileage: null,
      fuelExpense: 0,
      totalExpenses: 0,
    });
    expect(m.distance).toBeNull();
    expect(m.isComplete).toBe(false);
  });

  it('inicial y final → distancia correcta', () => {
    const m = calculateMileageMetrics({
      initialMileage: 100000,
      finalMileage: 100500,
      fuelExpense: 0,
      totalExpenses: 0,
    });
    expect(m.distance).toBe(500);
    expect(m.isComplete).toBe(true);
  });

  it('costo por km = totalExpenses / distancia', () => {
    const m = calculateMileageMetrics({
      initialMileage: 100000,
      finalMileage: 100500,
      fuelExpense: 100000,
      totalExpenses: 250000,
    });
    expect(m.distance).toBe(500);
    expect(m.costPerKm).toBe(500);     // 250000 / 500
    expect(m.fuelCostPerKm).toBe(200);  // 100000 / 500
  });

  it('con fuelUnitPrice → calcula consumo y eficiencia', () => {
    const m = calculateMileageMetrics({
      initialMileage: 100000,
      finalMileage: 100500,
      fuelExpense: 100000,   // $100.000
      totalExpenses: 250000,
      fuelUnitPrice: 15000,  // $15.000/galón
    });
    // Consumo = 100000 / 15000 ≈ 6.67 gal
    expect(m.fuelConsumed).toBeCloseTo(6.67, 1);
    // Eficiencia = 500 / 6.67 ≈ 75 km/gal
    expect(m.fuelEfficiency).toBeGreaterThan(74);
    expect(m.fuelEfficiency).toBeLessThan(76);
  });

  it('final menor que inicial → no calcula distancia', () => {
    const m = calculateMileageMetrics({
      initialMileage: 100500,
      finalMileage: 100000,
      fuelExpense: 0,
      totalExpenses: 0,
    });
    expect(m.distance).toBeNull();
    expect(m.isComplete).toBe(false);
  });

  it('distancia 0 → no divide por cero', () => {
    const m = calculateMileageMetrics({
      initialMileage: 100000,
      finalMileage: 100000,
      fuelExpense: 0,
      totalExpenses: 0,
    });
    expect(m.distance).toBe(0);
    expect(m.costPerKm).toBeNull();
    expect(m.fuelCostPerKm).toBeNull();
  });
});
