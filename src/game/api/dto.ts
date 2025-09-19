import type { GameSpeed } from '@/game/types';

export interface HealthEventDTO {
  tick: number;
  timestamp: number;
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
    location?: {
      structureId: string;
      roomId: string;
      zoneId: string;
    };
  }>;
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
  location: {
    structureId: string;
    roomId: string;
    zoneId: string;
  };
}

export type SimulationEventMap = {
  'sim:tick': SimTickEventDTO;
  'finance:update': FinanceUpdateEventDTO;
  'health:event': HealthEventDTO;
  'world:summary': WorldSummaryDTO;
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
