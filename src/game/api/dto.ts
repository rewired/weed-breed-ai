export interface HealthEventDTO {
  tick: number;
  timestamp: number;
  plantCount: number;
  averageHealth: number;
  averageStress: number;
  minimumHealth: number;
  criticalPlantIds: string[];
}

export interface AlertLocationDTO {
  structureId: string;
  roomId: string;
  zoneId: string;
}

export interface AlertSummaryDTO {
  id: string;
  type: string;
  message: string;
  location?: AlertLocationDTO;
  isAcknowledged?: boolean;
  context?: unknown;
}

export type GameSpeed = 0.5 | 1 | 10 | 25 | 50 | 100;

export type ExpenseCategory =
  | 'rent'
  | 'maintenance'
  | 'power'
  | 'structures'
  | 'devices'
  | 'supplies'
  | 'seeds'
  | 'salaries';

export type RevenueCategory = 'harvests' | 'other';

export interface WorldSummaryDTO {
  tick: number;
  company: {
    id: string;
    name: string;
    capital: number;
    cumulativeYield_g: number;
  };
  totals: {
    structures: number;
    rooms: number;
    zones: number;
    plantings: number;
    plants: number;
    devices: number;
  };
  alerts: AlertSummaryDTO[];
}

export interface SimTickEventDTO {
  tick: number;
  timestamp: number;
  speed: GameSpeed;
  seed: number;
  companyCapital: number;
  capitalDelta: number;
  cumulativeYield_g: number;
  totals: WorldSummaryDTO['totals'];
  plantHealth: Pick<
    HealthEventDTO,
    'plantCount' | 'averageHealth' | 'averageStress' | 'minimumHealth'
  >;
  activeAlertCount: number;
}

export interface FinanceUpdateEventDTO {
  tick: number;
  timestamp: number;
  reason: string;
  delta: number;
  newCapital: number;
}

export interface AlertEventDTO {
  tick: number;
  timestamp: number;
  alertId: string;
  type: string;
  message: string;
  location: AlertLocationDTO;
}

export interface StructureSummaryDTO {
  id: string;
  name: string;
}

export interface RoomSummaryDTO {
  id: string;
  name: string;
  structureId: string;
}

export interface ZoneSummaryDTO {
  id: string;
  name: string;
  roomId: string;
}

export type SimulationEventMap = {
  'sim:tick': SimTickEventDTO;
  'finance:update': FinanceUpdateEventDTO;
  'health:event': HealthEventDTO;
  'alert:event': AlertEventDTO;
};

export type SimulationEventName = keyof SimulationEventMap;

export interface SimulationStartOptions {
  companyName?: string;
  seed?: number;
  reset?: boolean;
}

export interface SimulationStepOptions extends SimulationStartOptions {}

export type SimulationSnapshot = WorldSummaryDTO | null;

export type ZoneTreatmentId =
  | 'water'
  | 'nutrients'
  | 'pesticide'
  | 'prune'
  | 'debug';

export type PlantTreatmentId =
  | 'pesticide'
  | 'prune'
  | 'debug';

export interface ApplyTreatmentResult {
  success: boolean;
  message?: string;
}

export interface DashboardStatusDTO {
  capital: number;
  cumulativeYield_g: number;
  tick: number;
}

export interface RevenueBreakdownDTO {
  category: RevenueCategory;
  total: number;
  averagePerDay: number;
}

export interface ExpenseBreakdownDTO {
  category: ExpenseCategory;
  total: number;
  averagePerDay: number;
}

export interface FinanceSummaryDTO {
  netProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  cumulativeYield_g: number;
  revenue: RevenueBreakdownDTO[];
  operatingExpenses: ExpenseBreakdownDTO[];
  capitalExpenses: ExpenseBreakdownDTO[];
  operatingTotal: { total: number; averagePerDay: number };
  capitalTotal: { total: number; averagePerDay: number };
}

export interface ZoneSupplyStatsDTO {
  waterLevel_L: number | null;
  nutrientLevel_g: number | null;
  consumption: {
    waterPerDay: number;
    nutrientsPerDay: number;
  };
}

export interface ZoneLightingStatsDTO {
  coverage: number;
  requiredCoverage: number;
  averagePPFD: number;
  dli: number;
  isSufficient: boolean;
}

export interface ZoneClimateStatsDTO {
  actualAirflow: number;
  requiredAirflow: number;
  isSufficient: boolean;
}

export interface ZoneHumidityStatsDTO {
  actualDehumidification: number;
  requiredDehumidification: number;
  isSufficient: boolean;
}

export interface ZoneCO2StatsDTO {
  actualInjectionRate: number;
  requiredInjectionRate: number;
  isSufficient: boolean;
}

export interface ZoneEnvironmentDTO {
  temperature_C: number | null;
  humidity_rh: number | null;
  co2_ppm: number | null;
}

export interface ZoneInfoDTO {
  id: string;
  name: string;
  area_m2: number;
  plantCapacity: number;
  plantCount: number;
  cultivationMethodName: string | null;
  lightCycle: { on: number; off: number };
  supplies: ZoneSupplyStatsDTO;
  lighting: ZoneLightingStatsDTO;
  climate: ZoneClimateStatsDTO;
  humidity: ZoneHumidityStatsDTO;
  co2: ZoneCO2StatsDTO;
  environment: ZoneEnvironmentDTO;
}
