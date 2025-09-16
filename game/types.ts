import { RoomPurpose } from './roomPurposes';
import { Company } from './models/Company';
import { Structure } from './models/Structure';
import { Room } from './models/Room';
import { Zone } from './models/Zone';

export { Company, Structure, Room, Zone };

export interface StructureBlueprint {
  id: string;
  name: string;
  footprint: {
    length_m: number;
    width_m: number;
  };
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

export interface StrainBlueprint {
  id: string;
  name: string;
}

export interface DeviceBlueprint {
  id: string;
  name: string;
  kind: string;
}

export interface CultivationMethodBlueprint {
  id: string;
  name: string;
  kind: string;
}

export interface DevicePrice {
    capitalExpenditure: number;
    baseMaintenanceCostPerTick: number;
    costIncreasePer1000Ticks: number;
}

export interface BlueprintDB {
  structures: Record<string, StructureBlueprint>;
  strains: Record<string, StrainBlueprint>;
  devices: Record<string, DeviceBlueprint>;
  cultivationMethods: Record<string, CultivationMethodBlueprint>;
  devicePrices: Record<string, DevicePrice>;
}

export interface GameState {
  ticks: number;
  company: Company;
}

export interface Employee {
  id: string;
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

export interface Plant {
    id: string;
    blueprintId: string;
    // ... more properties to come
}