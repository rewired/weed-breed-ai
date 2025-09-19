import type { GameSpeed } from '@/game/types';
import { EventBus } from './eventBus';
import type {
  ApplyTreatmentResult,
  AlertLocationDTO,
  AlertSummaryDTO,
  PlantTreatmentId,
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
} from './dto';
import { EngineAdapter } from '../internal/engineAdapter';

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
  StructureSummaryDTO,
  RoomSummaryDTO,
  ZoneSummaryDTO,
  WorldSummaryDTO,
  ZoneTreatmentId,
  PlantTreatmentId,
};

export type { GameSpeed };

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

export { Company, Structure, Room, Zone, Planting, Plant } from '@/game/types';

export type {
  GameState,
  StructureBlueprint,
  RoomPurpose,
  JobRole,
  Planting,
  Plant,
  PlantingPlan,
  Alert,
  Employee,
  ExpenseCategory,
  RevenueCategory,
  GroupedDeviceInfo,
  StrainBlueprint,
  CultivationMethodBlueprint,
  SkillName,
  Trait,
  OvertimePolicy,
} from '@/game/types';

export { roomPurposes } from '@/game/roomPurposes';
export {
  getBlueprints,
  getAvailableStrains,
  loadAllBlueprints,
} from '@/game/blueprints';
export { initialGameState, gameTick } from '@/game/engine';
export { mulberry32, createSeededRandom, createRandomGenerator } from '@/game/utils';
export type { RandomGenerator } from '@/game/utils';
export { GrowthStage } from '@/game/models/Plant';
