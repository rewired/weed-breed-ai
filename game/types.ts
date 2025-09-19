import type { Company } from './models/Company';

export type { RoomPurpose } from './roomPurposes';

export interface StructureBlueprint {
  id: string;
  name: string;
  footprint: {
    length_m: number;
    width_m: number;
    height_m: number;
  };
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

export interface StrainBlueprint {
  id: string;
  slug: string;
  name: string;
  lineage: {
    parents: string[];
  };
  genotype: {
    sativa: number;
    indica: number;
    ruderalis: number;
  };
  generalResilience: number;
  germinationRate?: number;
  chemotype: {
    thcContent: number;
    cbdContent: number;
  };
  morphology: {
    growthRate: number;
    yieldFactor: number;
    leafAreaIndex: number;
  };
  growthModel: {
    maxBiomassDry_g: number;
  };
  noise?: {
    enabled: boolean;
    pct: number;
  };
  environmentalPreferences: {
    idealTemperature: {
      vegetation: [number, number];
      flowering: [number, number];
    };
    lightIntensity: {
      vegetation: [number, number];
      flowering: [number, number];
    };
    idealHumidity: {
      vegetation: [number, number];
      flowering: [number, number];
    };
    lightCycle: {
      vegetation: [number, number];
      flowering: [number, number];
    };
  };
  waterDemand: {
    dailyWaterUsagePerSquareMeter: {
      [stage: string]: number;
    };
  };
  nutrientDemand: {
    dailyNutrientDemand: {
      [stage: string]: {
        [nutrient: string]: number;
      };
    };
  };
  photoperiod: {
    vegetationDays: number;
    floweringDays: number;
    transitionTriggerHours: number;
  };
  harvestWindowInDays: [number, number];
  meta: {
    description: string;
    advantages: string[];
    disadvantages: string[];
    notes: string;
  }
}

export interface DeviceBlueprint {
  id: string;
  name: string;
  kind: string;
  settings?: {
    coverageArea?: number;
    ppfd?: number;
    airflow?: number;
    [key: string]: any;
  };
}

export interface CultivationMethodBlueprint {
  id: string;
  name: string;
  kind: string;
  areaPerPlant: number;
  setupCost: number;
  maxCycles: number;
  strainTraitCompatibility?: {
    preferred?: Record<string, { min?: number; max?: number }>;
    conflicting?: Record<string, { min?: number; max?: number }>;
  }
}

export interface DevicePrice {
    capitalExpenditure: number;
    baseMaintenanceCostPerTick: number;
    costIncreasePer1000Ticks: number;
}

export interface StrainPrice {
    seedPrice: number;
    harvestPricePerGram: number;
}

export interface UtilityPrices {
  pricePerKwh: number;
  pricePerLiterWater: number;
  pricePerGramNutrients: number;
}

export interface PersonnelData {
  firstNames: string[];
  lastNames: string[];
  traits: Trait[];
}

export interface TaskDefinition {
  costModel: {
    basis: 'perAction' | 'perPlant' | 'perSquareMeter';
    laborMinutes: number;
  };
  priority: number;
  requiredRole: JobRole;
  minSkillLevel: number;
  requiredSkill: SkillName;
  description: string;
}

export interface BlueprintDB {
  structures: Record<string, StructureBlueprint>;
  strains: Record<string, StrainBlueprint>;
  devices: Record<string, DeviceBlueprint>;
  cultivationMethods: Record<string, CultivationMethodBlueprint>;
  devicePrices: Record<string, DevicePrice>;
  strainPrices: Record<string, StrainPrice>;
  utilityPrices: UtilityPrices;
  personnelData: PersonnelData;
  taskDefinitions: Record<TaskType, TaskDefinition>;
}

export type ExpenseCategory = 'rent' | 'maintenance' | 'power' | 'structures' | 'devices' | 'supplies' | 'seeds' | 'salaries';
export type RevenueCategory = 'harvests' | 'other';

export interface FinancialLedger {
  revenue: Record<RevenueCategory, number>;
  expenses: Record<ExpenseCategory, number>;
}

export type AlertType = 'low_supply' | 'sick_plant' | 'harvest_ready' | 'plant_stress' | 'raise_request' | 'employee_quit' | 'zone_harvested' | 'zone_ready';

export interface AlertLocation {
    structureId: string;
    roomId: string;
    zoneId: string;
}

export interface Alert {
    id: string;
    type: AlertType;
    message: string;
    location: AlertLocation;
    tickGenerated: number;
    isAcknowledged?: boolean;
    context?: any;
}


export interface GameState {
  ticks: number;
  seed: number;
  company: Company;
}

export type SkillName = 'Gardening' | 'Maintenance' | 'Technical' | 'Botanical' | 'Cleanliness' | 'Negotiation';
export type JobRole = 'Gardener' | 'Technician' | 'Janitor' | 'Botanist' | 'Salesperson' | 'Generalist';


export interface Skill {
  name: SkillName;
  level: number; // 0-10 float
  xp: number;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative';
  effects?: Record<string, any>; // For future programmatic effects
}

export type EmployeeStatus = 'Idle' | 'Working' | 'Resting' | 'OffDuty';
export type OvertimePolicy = 'timeOff' | 'payout';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  salaryPerDay: number;
  role: JobRole;
  skills: Record<SkillName, Skill>;
  traits: Trait[];
  energy: number; // 0-100
  morale: number; // 0-100
  structureId: string | null;
  status: EmployeeStatus;
  currentTask: Task | null;
  lastRaiseTick?: number;
  // For job market
  timeOnMarket?: number;
  leaveHours: number;
  offDutyUntilTick?: number;
}

export type TaskType = 'repair_device' | 'maintain_device' | 'harvest_plants' | 'refill_supplies_water' | 'refill_supplies_nutrients' | 'overhaul_zone' | 'adjust_light_cycle' | 'clean_zone' | 'overhaul_zone_substrate' | 'reset_light_cycle' | 'execute_planting_plan';

export interface TaskLocation {
  structureId: string;
  roomId: string;
  zoneId: string;
  itemId: string; // e.g., deviceId, zoneId for harvest
}

export interface Task {
  id: string;
  type: TaskType;
  location: TaskLocation;
  priority: number;
  requiredRole: JobRole;
  minSkillLevel: number;
  requiredSkill: SkillName;
  description: string;
  durationTicks: number;
  progressTicks: number;
}


export interface Device {
  id: string;
  name: string;
  blueprintId: string;
  status: 'on' | 'off' | 'broken';
  durability: number; // 0 to 1
  maintenanceCostPerTick: number;
}

export type GameSpeed = 0.5 | 1 | 10 | 25 | 50 | 100;

export interface GroupedDeviceInfo {
  blueprintId: string;
  name: string;
  count: number;
  status: 'on' | 'off' | 'mixed' | 'broken';
}

export type ZoneStatus = 'Growing' | 'Harvested' | 'Ready';

export interface PlantingPlan {
  strainId: string;
  quantity: number;
  autoReplant: boolean;
}