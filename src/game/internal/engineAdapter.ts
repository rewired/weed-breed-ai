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

const DEFAULT_TICK_DURATION_MS = 5000;
const DEFAULT_COMPANY_NAME = 'Weedbreed';
const MIN_TICK_INTERVAL_MS = 100; // 10 Hz maximum

function mapSimTickEvent(
  state: GameState,
  speed: GameSpeed,
  previousState: GameState | null,
  summary: WorldSummaryDTO,
  health: HealthEventDTO,
  timestamp: number
): SimTickEventDTO {
  const capitalDelta = previousState
    ? state.company.capital - previousState.company.capital
    : 0;

  return {
    tick: state.ticks,
    timestamp,
    speed,
    seed: state.seed,
    companyCapital: state.company.capital,
    capitalDelta,
    cumulativeYield_g: state.company.cumulativeYield_g ?? 0,
    totals: summary.totals,
    plantHealth: {
      plantCount: health.plantCount,
      averageHealth: health.averageHealth,
      averageStress: health.averageStress,
      minimumHealth: health.minimumHealth,
    },
    activeAlertCount: summary.alerts.length,
  };
}

function mapFinanceEvents(
  previousState: GameState | null,
  nextState: GameState,
  timestamp: number
): FinanceUpdateEventDTO[] {
  if (!previousState) {
    return [];
  }

  const events: FinanceUpdateEventDTO[] = [];
  const prevLedger = previousState.company.ledger;
  const nextLedger = nextState.company.ledger;
  const revenueCategories = new Set([
    ...Object.keys(prevLedger.revenue ?? {}),
    ...Object.keys(nextLedger.revenue ?? {}),
  ]);
  const expenseCategories = new Set([
    ...Object.keys(prevLedger.expenses ?? {}),
    ...Object.keys(nextLedger.expenses ?? {}),
  ]);

  let runningCapital = previousState.company.capital;

  revenueCategories.forEach(category => {
    const previousValue = prevLedger.revenue?.[category] ?? 0;
    const nextValue = nextLedger.revenue?.[category] ?? 0;
    const delta = nextValue - previousValue;
    if (delta !== 0) {
      runningCapital += delta;
      events.push({
        tick: nextState.ticks,
        timestamp,
        reason: `revenue:${category}`,
        delta,
        newCapital: runningCapital,
      });
    }
  });

  expenseCategories.forEach(category => {
    const previousValue = prevLedger.expenses?.[category] ?? 0;
    const nextValue = nextLedger.expenses?.[category] ?? 0;
    const delta = nextValue - previousValue;
    if (delta !== 0) {
      runningCapital -= delta;
      events.push({
        tick: nextState.ticks,
        timestamp,
        reason: `expense:${category}`,
        delta: -delta,
        newCapital: runningCapital,
      });
    }
  });

  const adjustment = nextState.company.capital - runningCapital;
  if (Math.abs(adjustment) > 1e-6) {
    const newCapital = runningCapital + adjustment;
    events.push({
      tick: nextState.ticks,
      timestamp,
      reason: 'capital:adjustment',
      delta: adjustment,
      newCapital,
    });
  }

  return events;
}

function mapHealthEvent(state: GameState, timestamp: number): HealthEventDTO {
  const structures = Object.values(state.company.structures);
  const allPlants = structures.flatMap(structure =>
    Object.values(structure.rooms).flatMap(room =>
      Object.values(room.zones).flatMap(zone =>
        Object.values(zone.plantings).flatMap(planting => planting.plants)
      )
    )
  );

  if (allPlants.length === 0) {
    return {
      tick: state.ticks,
      timestamp,
      plantCount: 0,
      averageHealth: 0,
      averageStress: 0,
      minimumHealth: 0,
      criticalPlantIds: [],
    };
  }

  const totalHealth = allPlants.reduce((sum, plant) => sum + plant.health, 0);
  const totalStress = allPlants.reduce((sum, plant) => sum + plant.stress, 0);
  const minimumHealth = allPlants.reduce((min, plant) => Math.min(min, plant.health), 1);
  const criticalPlantIds = allPlants.filter(plant => plant.health < 0.25).map(plant => plant.id);

  return {
    tick: state.ticks,
    timestamp,
    plantCount: allPlants.length,
    averageHealth: totalHealth / allPlants.length,
    averageStress: totalStress / allPlants.length,
    minimumHealth,
    criticalPlantIds,
  };
}

function mapAlertEvents(
  previousState: GameState | null,
  nextState: GameState,
  timestamp: number
): AlertEventDTO[] {
  if (!previousState) {
    return [];
  }

  const previousAlertIds = new Set(
    previousState.company.alerts.map(alert => alert.id)
  );

  return nextState.company.alerts
    .filter(alert => !previousAlertIds.has(alert.id))
    .map(alert => ({
      tick: nextState.ticks,
      timestamp,
      alertId: alert.id,
      type: alert.type,
      message: alert.message,
      location: {
        structureId: alert.location?.structureId ?? '',
        roomId: alert.location?.roomId ?? '',
        zoneId: alert.location?.zoneId ?? '',
      },
    }));
}

function mapWorldSummary(state: GameState): WorldSummaryDTO {
  const structures = Object.values(state.company.structures);
  let roomCount = 0;
  let zoneCount = 0;
  let plantingCount = 0;
  let plantCount = 0;
  let deviceCount = 0;

  structures.forEach(structure => {
    const rooms = Object.values(structure.rooms);
    roomCount += rooms.length;
    rooms.forEach(room => {
      const zones = Object.values(room.zones);
      zoneCount += zones.length;
      zones.forEach(zone => {
        deviceCount += Object.keys(zone.devices).length;
        const plantings = Object.values(zone.plantings);
        plantingCount += plantings.length;
        plantings.forEach(planting => {
          plantCount += planting.plants.length;
        });
      });
    });
  });

  return {
    tick: state.ticks,
    company: {
      id: state.company.id,
      name: state.company.name,
      capital: state.company.capital,
      cumulativeYield_g: state.company.cumulativeYield_g ?? 0,
    },
    totals: {
      structures: structures.length,
      rooms: roomCount,
      zones: zoneCount,
      plantings: plantingCount,
      plants: plantCount,
      devices: deviceCount,
    },
    alerts: state.company.alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      message: alert.message,
      location: alert.location
        ? {
            structureId: alert.location.structureId,
            roomId: alert.location.roomId,
            zoneId: alert.location.zoneId,
          }
        : undefined,
      isAcknowledged: alert.isAcknowledged,
      context: alert.context,
    })),
  };
}

export class EngineAdapter {
  private readonly bus: EventBus<SimulationEventMap>;
  private state: GameState | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private speed: GameSpeed = 1;
  private readonly tickDurationMs: number;
  private lastSummary: WorldSummaryDTO | null = null;

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
    const nextState = gameTick(previousState);
    const timestamp = Date.now();
    const summary = mapWorldSummary(nextState);
    const health = mapHealthEvent(nextState, timestamp);

    const tickEvent = mapSimTickEvent(nextState, this.speed, previousState, summary, health, timestamp);
    this.bus.emit('sim:tick', tickEvent);

    const financeEvents = mapFinanceEvents(previousState, nextState, timestamp);
    financeEvents.forEach(event => this.bus.emit('finance:update', event));

    const alertEvents = mapAlertEvents(previousState, nextState, timestamp);
    alertEvents.forEach(event => this.bus.emit('alert:event', event));

    this.state = nextState;
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
