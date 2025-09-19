import { initialGameState, gameTick } from '@/game/engine';
import type { GameSpeed, GameState } from '@/game/types';
import { createSeededRandom } from '@/game/utils';
import { EventBus } from '../api/eventBus';
import type {
  AlertEventDTO,
  ApplyTreatmentResult,
  FinanceUpdateEventDTO,
  HealthEventDTO,
  PlantTreatmentId,
  SimulationEventMap,
  SimulationSnapshot,
  SimulationStartOptions,
  SimTickEventDTO,
  WorldSummaryDTO,
  ZoneTreatmentId,
} from '../api/dto';
import {
  createEventSnapshot,
  mapAlertEventsFromSnapshot,
  mapFinanceEventsFromSnapshot,
  mapHealthEvent,
  mapSimTickEventFromSnapshot,
  mapWorldSummary,
  type EventSnapshot,
} from '../api/eventMappers';

const DEFAULT_TICK_DURATION_MS = 5000;
const DEFAULT_COMPANY_NAME = 'Weedbreed';
const MIN_TICK_INTERVAL_MS = 100; // 10 Hz maximum

export class EngineAdapter {
  private readonly bus: EventBus<SimulationEventMap>;
  private state: GameState | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private speed: GameSpeed = 1;
  private readonly tickDurationMs: number;
  private lastSummary: WorldSummaryDTO | null = null;
  private lastSnapshot: EventSnapshot | null = null;

  constructor(bus: EventBus<SimulationEventMap>, tickDurationMs: number = DEFAULT_TICK_DURATION_MS) {
    this.bus = bus;
    this.tickDurationMs = tickDurationMs;
  }

  async start(options?: SimulationStartOptions): Promise<WorldSummaryDTO | null> {
    await this.ensureInitialized(options);
    if (!this.state) {
      return null;
    }
    if (!this.isRunning) {
      this.isRunning = true;
      this.scheduleLoop();
    }
    return this.lastSummary;
  }

  pause(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async step(steps: number = 1): Promise<SimTickEventDTO | null> {
    await this.ensureInitialized();
    if (!this.state) {
      return null;
    }

    const normalizedSteps = Number.isFinite(steps) && steps > 0 ? Math.floor(steps) : 1;
    let lastEvent: SimTickEventDTO | null = null;

    for (let i = 0; i < normalizedSteps; i += 1) {
      lastEvent = this.advanceTick();
      if (!lastEvent) {
        break;
      }
    }

    return lastEvent;
  }

  setSpeed(speed: GameSpeed): void {
    this.speed = speed;
    if (this.isRunning) {
      this.scheduleLoop();
    }
  }

  getSnapshot(): SimulationSnapshot {
    return this.lastSummary;
  }

  applyTreatmentToZone(_: string, __: ZoneTreatmentId): ApplyTreatmentResult {
    return {
      success: false,
      message: 'Zone treatment handling is not implemented yet.',
    };
  }

  applyTreatmentToPlant(_: string, __: PlantTreatmentId): ApplyTreatmentResult {
    return {
      success: false,
      message: 'Plant treatment handling is not implemented yet.',
    };
  }

  private async ensureInitialized(options?: SimulationStartOptions): Promise<void> {
    const shouldReset = options?.reset === true;
    if (this.state && !shouldReset) {
      return;
    }

    const companyName = options?.companyName ?? DEFAULT_COMPANY_NAME;
    const seed = options?.seed;
    const initialState = initialGameState(companyName, seed);
    const rng = createSeededRandom(initialState.seed);

    try {
      await initialState.company.updateJobMarket(rng, initialState.ticks, initialState.seed);
    } catch (error) {
      console.warn('Failed to prime job market during simulation start.', error);
    }

    const timestamp = Date.now();
    const summary = mapWorldSummary(initialState);
    const health = mapHealthEvent(initialState, timestamp);

    this.state = initialState;
    this.lastSnapshot = createEventSnapshot(initialState);
    this.emitState(summary, health);
  }

  private scheduleLoop(): void {
    if (!this.state || !this.isRunning) {
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    const interval = Math.max(this.tickDurationMs / this.speed, MIN_TICK_INTERVAL_MS);
    this.timer = setInterval(() => {
      this.advanceTick();
    }, interval);
  }

  private advanceTick(): SimTickEventDTO | null {
    if (!this.state) {
      return null;
    }

    const previousState = this.state;
    const previousSnapshot = this.lastSnapshot ?? createEventSnapshot(previousState);
    const nextState = gameTick(previousState);
    const timestamp = Date.now();
    const summary = mapWorldSummary(nextState);
    const health = mapHealthEvent(nextState, timestamp);
    const nextSnapshot = createEventSnapshot(nextState);

    const tickEvent = mapSimTickEventFromSnapshot(
      nextState,
      this.speed,
      summary,
      health,
      nextSnapshot,
      previousSnapshot,
      timestamp,
    );
    this.bus.emit('sim:tick', tickEvent);

    const financeEvents = mapFinanceEventsFromSnapshot(previousSnapshot, nextSnapshot, timestamp);
    financeEvents.forEach(event => this.bus.emit('finance:update', event));

    const alertEvents = mapAlertEventsFromSnapshot(previousSnapshot, nextState, timestamp);
    alertEvents.forEach(event => this.bus.emit('alert:event', event));

    this.state = nextState;
    this.lastSnapshot = nextSnapshot;
    this.emitState(summary, health);

    return tickEvent;
  }

  private emitState(summary: WorldSummaryDTO, health: HealthEventDTO): void {
    this.lastSummary = summary;
    this.emitHealthEvent(health);
  }

  private emitHealthEvent(health: HealthEventDTO): void {
    this.bus.emit('health:event', health);
  }
}
