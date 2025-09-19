import type { Company } from '@/game/models/Company';
import type { Structure } from '@/game/models/Structure';
import type { Zone } from '@/game/models/Zone';
import type { GameState } from '@/game/types';

import { getBlueprints } from '@/game/blueprints';
import type { SimTickEventDTO } from './dto';
import {
  type DashboardStatusDTO,
  type ExpenseBreakdownDTO,
  type ExpenseCategory,
  type FinanceSummaryDTO,
  type RevenueBreakdownDTO,
  type RevenueCategory,
  type ZoneInfoDTO,
} from './dto';

const OPERATING_EXPENSE_CATEGORIES: ExpenseCategory[] = ['rent', 'maintenance', 'power', 'salaries'];
const CAPITAL_EXPENSE_CATEGORIES: ExpenseCategory[] = ['structures', 'devices', 'supplies', 'seeds'];

export function getDashboardStatus(
  state: GameState | null,
  latestTick: SimTickEventDTO | null,
): DashboardStatusDTO {
  const capital = latestTick?.companyCapital ?? state?.company.capital ?? 0;
  const cumulativeYield_g = latestTick?.cumulativeYield_g ?? state?.company.cumulativeYield_g ?? 0;
  const tick = latestTick?.tick ?? state?.ticks ?? 0;

  return { capital, cumulativeYield_g, tick };
}

function createRevenueBreakdown(
  revenue: Record<RevenueCategory, number>,
  daysElapsed: number,
): RevenueBreakdownDTO[] {
  return (Object.entries(revenue) as [RevenueCategory, number][])
    .map(([category, total]) => ({
      category,
      total,
      averagePerDay: total / daysElapsed,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function createExpenseBreakdown(
  expenses: Record<ExpenseCategory, number>,
  categories: ExpenseCategory[],
  daysElapsed: number,
): ExpenseBreakdownDTO[] {
  return categories.map(category => {
    const total = expenses[category] ?? 0;
    return {
      category,
      total,
      averagePerDay: total / daysElapsed,
    };
  });
}

function sumExpenseBreakdown(entries: ExpenseBreakdownDTO[]): { total: number; averagePerDay: number } {
  const total = entries.reduce((sum, entry) => sum + entry.total, 0);
  const averagePerDay = entries.reduce((sum, entry) => sum + entry.averagePerDay, 0);
  return { total, averagePerDay };
}

export function getFinanceSummary(state: GameState | null): FinanceSummaryDTO | null {
  if (!state) {
    return null;
  }

  const { company, ticks } = state;
  const ledger = company.ledger;
  const daysElapsed = Math.max(1, ticks / 24);

  const revenueBreakdown = createRevenueBreakdown(ledger.revenue, daysElapsed);
  const operatingBreakdown = createExpenseBreakdown(ledger.expenses, OPERATING_EXPENSE_CATEGORIES, daysElapsed);
  const capitalBreakdown = createExpenseBreakdown(ledger.expenses, CAPITAL_EXPENSE_CATEGORIES, daysElapsed);

  const totalRevenue = revenueBreakdown.reduce((sum, entry) => sum + entry.total, 0);
  const totalExpenses = [...operatingBreakdown, ...capitalBreakdown].reduce((sum, entry) => sum + entry.total, 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    netProfit,
    totalRevenue,
    totalExpenses,
    cumulativeYield_g: company.cumulativeYield_g,
    revenue: revenueBreakdown,
    operatingExpenses: operatingBreakdown,
    capitalExpenses: capitalBreakdown,
    operatingTotal: sumExpenseBreakdown(operatingBreakdown),
    capitalTotal: sumExpenseBreakdown(capitalBreakdown),
  };
}

export function getZoneInfo(
  zone: Zone,
  structure: Structure,
  company: Company,
): ZoneInfoDTO {
  const supplyConsumption = zone.getSupplyConsumptionRates(company);
  const lightingDetails = zone.getLightingDetails();
  const climateDetails = zone.getClimateControlDetails(structure.height_m);
  const humidityDetails = zone.getHumidityControlDetails();
  const co2Details = zone.getCO2Details();
  const cultivationMethod = getBlueprints().cultivationMethods[zone.cultivationMethodId];

  const environment = zone.currentEnvironment ?? {};

  const requiredCoverage = zone.area_m2;
  const isLightingSufficient = Math.round(lightingDetails.coverage * 100) >= Math.round(requiredCoverage * 100);

  return {
    id: zone.id,
    name: zone.name,
    area_m2: zone.area_m2,
    plantCapacity: zone.getPlantCapacity(),
    plantCount: zone.getTotalPlantedCount(),
    cultivationMethodName: cultivationMethod?.name ?? null,
    lightCycle: { ...zone.lightCycle },
    supplies: {
      waterLevel_L: zone.waterLevel_L ?? null,
      nutrientLevel_g: zone.nutrientLevel_g ?? null,
      consumption: {
        waterPerDay: supplyConsumption.waterPerDay,
        nutrientsPerDay: supplyConsumption.nutrientsPerDay,
      },
    },
    lighting: {
      coverage: lightingDetails.coverage,
      requiredCoverage,
      averagePPFD: lightingDetails.averagePPFD,
      dli: lightingDetails.dli,
      isSufficient: isLightingSufficient,
    },
    climate: {
      actualAirflow: climateDetails.actualAirflow,
      requiredAirflow: climateDetails.requiredAirflow,
      isSufficient: climateDetails.isSufficient,
    },
    humidity: {
      actualDehumidification: humidityDetails.actualDehumidification,
      requiredDehumidification: humidityDetails.requiredDehumidification,
      isSufficient: humidityDetails.isSufficient,
    },
    co2: {
      actualInjectionRate: co2Details.actualInjectionRate,
      requiredInjectionRate: co2Details.requiredInjectionRate,
      isSufficient: co2Details.isSufficient,
    },
    environment: {
      temperature_C: environment.temperature_C ?? null,
      humidity_rh: environment.humidity_rh ?? null,
      co2_ppm: environment.co2_ppm ?? null,
    },
  };
}
