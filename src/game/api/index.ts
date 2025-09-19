import { EventBus } from './eventBus';
import type {
  ApplyTreatmentResult,
  AlertLocationDTO,
  AlertSummaryDTO,
  DashboardStatusDTO,
  ExpenseBreakdownDTO,
  ExpenseCategory,
  FinanceSummaryDTO,
  PlantTreatmentId,
  RevenueBreakdownDTO,
  RevenueCategory,
  RoomSummaryDTO,
  SimulationEventMap,
  SimulationEventName,
  SimulationSnapshot,
  SimulationStartOptions,
  SimTickEventDTO,
  StructureSummaryDTO,
  WorldSummaryDTO,
  ZoneSummaryDTO,
  ZoneTreatmentId,
  GameSpeed,
  ZoneInfoDTO,
} from './dto';
import { EngineAdapter } from '../internal/engineAdapter';
import { getDashboardStatus, getFinanceSummary, getZoneInfo } from './selectors';

const bus = new EventBus<SimulationEventMap>();
const adapter = new EngineAdapter(bus);

export type {
  ApplyTreatmentResult,
  SimulationEventMap,
  SimulationEventName,
  SimulationSnapshot,
  SimulationStartOptions,
  SimTickEventDTO,
  AlertSummaryDTO,
  AlertLocationDTO,
  DashboardStatusDTO,
  ExpenseBreakdownDTO,
  ExpenseCategory,
  FinanceSummaryDTO,
  StructureSummaryDTO,
  RoomSummaryDTO,
  ZoneSummaryDTO,
  WorldSummaryDTO,
  ZoneTreatmentId,
  PlantTreatmentId,
  RevenueBreakdownDTO,
  RevenueCategory,
  GameSpeed,
  ZoneInfoDTO,
};

export async function start(
  seedOrOptions?: number | SimulationStartOptions,
): Promise<WorldSummaryDTO | null> {
  if (typeof seedOrOptions === 'number') {
    return adapter.start({ seed: seedOrOptions });
  }

  return adapter.start(seedOrOptions);
}

export function pause(): void {
  adapter.pause();
}

export async function step(steps?: number): Promise<SimTickEventDTO | null> {
  return adapter.step(steps);
}

export function setSpeed(speed: GameSpeed): void {
  adapter.setSpeed(speed);
}

export function on<EventName extends SimulationEventName>(
  eventName: EventName,
  listener: (payload: SimulationEventMap[EventName]) => void,
): () => void {
  return bus.on(eventName, listener);
}

export function getSnapshot(): SimulationSnapshot {
  return adapter.getSnapshot();
}

export function applyTreatmentToZone(
  zoneId: string,
  treatmentId: ZoneTreatmentId,
): ApplyTreatmentResult {
  return adapter.applyTreatmentToZone(zoneId, treatmentId);
}

export function applyTreatmentToPlant(
  plantId: string,
  treatmentId: PlantTreatmentId,
): ApplyTreatmentResult {
  return adapter.applyTreatmentToPlant(plantId, treatmentId);
}

export { roomPurposes } from '@/game/roomPurposes';
export { getBlueprints, getAvailableStrains, loadAllBlueprints } from '@/game/blueprints';
export { initialGameState, gameTick } from '@/game/engine';
export { mulberry32, createSeededRandom, createRandomGenerator } from '@/game/utils';

export { getDashboardStatus, getFinanceSummary, getZoneInfo } from './selectors';
