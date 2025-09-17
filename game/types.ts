import { RoomPurpose } from './roomPurposes';
import { Company } from './models/Company';
import { Structure } from './models/Structure';
import { Room } from './models/Room';
import { Zone } from './models/Zone';
import { Planting } from './models/Planting';
import { Plant } from './models/Plant';

export { Company, Structure, Room, Zone, Planting, Plant };

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
  chemotype: {
    thcContent: number;
    cbdContent: number;
  };
  morphology: {
    growthRate: number;
    yieldFactor: number;
    leafAreaIndex: number;
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

export interface BlueprintDB {
  structures: Record<string, StructureBlueprint>;
  strains: Record<string, StrainBlueprint>;
  devices: Record<string, DeviceBlueprint>;
  cultivationMethods: Record<string, CultivationMethodBlueprint>;
  devicePrices: Record<string, DevicePrice>;
  strainPrices: Record<string, StrainPrice>;
}

export interface GameState {
  ticks: number;
  seed: number;
  company: Company;
}

export interface Employee {
  id:string;
  name: string;
  salaryPerTick: number;
  role: string;
  skills: Record<string, any>; // Simplified
}

export interface Device {
  id: string;
  name: string;
  blueprintId: string;
  status: 'on' | 'off' | 'broken';
  durability: number; // 0 to 1
  maintenanceCostPerTick: number;
}

export type GameSpeed = 0.5 | 1 | 4 | 10 | 20;

export interface GroupedDeviceInfo {
  blueprintId: string;
  name: string;
  count: number;
  status: 'on' | 'off' | 'mixed';
}
