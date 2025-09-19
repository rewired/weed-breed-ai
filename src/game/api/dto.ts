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
