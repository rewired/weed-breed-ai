import type { GameSpeed } from '@/game/types';
import { EventBus } from './eventBus';
import type {
  ApplyTreatmentOptions,
  ApplyTreatmentResult,
  SimulationEventMap,
  SimulationEventName,
  SimulationSnapshot,
  SimulationStartOptions,
  SimTickEventDTO,
  WorldSummaryDTO,
} from './dto';
import { EngineAdapter } from '../internal/engineAdapter';

const bus = new EventBus<SimulationEventMap>();
const adapter = new EngineAdapter(bus);

export type {
  ApplyTreatmentOptions,
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
};

export type { GameSpeed };

export async function start(options?: SimulationStartOptions): Promise<WorldSummaryDTO | null> {
  return adapter.start(options);
}

export function pause(): void {
  adapter.pause();
}

export async function step(options?: SimulationStartOptions): Promise<SimTickEventDTO | null> {
  return adapter.step(options);
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

export function applyTreatment(options: ApplyTreatmentOptions): ApplyTreatmentResult {
  return adapter.applyTreatment(options);
}
