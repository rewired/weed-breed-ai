import type { GameSpeed } from '@/game/types';

export interface SimTickEventDTO {
  tick: number;
  timestamp: number;
  speed: GameSpeed;
  seed: number;
  companyCapital: number;
}

export interface FinanceUpdateEventDTO {
  tick: number;
  capital: number;
  ledger: {
    revenue: Record<string, number>;
    expenses: Record<string, number>;
  };
  cumulativeYield_g: number;
}

export interface HealthEventDTO {
  tick: number;
  plantCount: number;
  averageHealth: number;
  averageStress: number;
  minimumHealth: number;
  criticalPlantIds: string[];
}

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
  alerts: Array<{
    id: string;
    type: string;
    message: string;
  }>;
}

export type SimulationEventMap = {
  'sim:tick': SimTickEventDTO;
  'finance:update': FinanceUpdateEventDTO;
  'health:update': HealthEventDTO;
  'world:summary': WorldSummaryDTO;
};

export type SimulationEventName = keyof SimulationEventMap;

export interface SimulationStartOptions {
  companyName?: string;
  seed?: number;
  reset?: boolean;
}

export interface SimulationStepOptions extends SimulationStartOptions {}

export type SimulationSnapshot = WorldSummaryDTO | null;

export interface ApplyTreatmentOptions {
  zoneId?: string;
  plantId?: string;
  treatment:
    | 'water'
    | 'nutrients'
    | 'pesticide'
    | 'prune'
    | 'debug';
  amount?: number;
}

export interface ApplyTreatmentResult {
  success: boolean;
  message?: string;
}
