import { initialGameState, gameTick } from '@/game/engine';
import type { GameSpeed, GameState } from '@/game/types';
import { mulberry32 } from '@/game/utils';
import { EventBus } from '../api/eventBus';
import type {
  ApplyTreatmentOptions,
  ApplyTreatmentResult,
  FinanceUpdateEventDTO,
  HealthEventDTO,
  SimulationEventMap,
  SimulationSnapshot,
  SimulationStartOptions,
  SimTickEventDTO,
  WorldSummaryDTO,
} from '../api/dto';

const DEFAULT_TICK_DURATION_MS = 5000;
const DEFAULT_COMPANY_NAME = 'Weedbreed';

function mapSimTickEvent(state: GameState, speed: GameSpeed): SimTickEventDTO {
  return {
    tick: state.ticks,
    timestamp: Date.now(),
    speed,
    seed: state.seed,
    companyCapital: state.company.capital,
  };
}

function mapFinanceUpdateEvent(state: GameState): FinanceUpdateEventDTO {
  return {
    tick: state.ticks,
    capital: state.company.capital,
    ledger: {
      revenue: { ...state.company.ledger.revenue },
      expenses: { ...state.company.ledger.expenses },
    },
    cumulativeYield_g: state.company.cumulativeYield_g ?? 0,
  };
}

function mapHealthEvent(state: GameState): HealthEventDTO {
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
    plantCount: allPlants.length,
    averageHealth: totalHealth / allPlants.length,
    averageStress: totalStress / allPlants.length,
    minimumHealth,
    criticalPlantIds,
  };
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
    return mapWorldSummary(this.state);
  }

  pause(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async step(options?: SimulationStartOptions): Promise<SimTickEventDTO | null> {
    await this.ensureInitialized(options);
    if (!this.state) {
      return null;
    }
    return this.advanceTick();
  }

  setSpeed(speed: GameSpeed): void {
    this.speed = speed;
    if (this.isRunning) {
      this.scheduleLoop();
    }
  }

  getSnapshot(): SimulationSnapshot {
    return this.state ? mapWorldSummary(this.state) : null;
  }

  applyTreatment(_: ApplyTreatmentOptions): ApplyTreatmentResult {
    return {
      success: false,
      message: 'Treatment handling is not implemented yet.',
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
    const rng = mulberry32(initialState.seed);

    try {
      await initialState.company.updateJobMarket(rng, initialState.ticks, initialState.seed);
    } catch (error) {
      console.warn('Failed to prime job market during simulation start.', error);
    }

    this.state = initialState;
    this.emitState(initialState);
  }

  private scheduleLoop(): void {
    if (!this.state || !this.isRunning) {
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    const interval = this.tickDurationMs / this.speed;
    this.timer = setInterval(() => {
      this.advanceTick();
    }, interval);
  }

  private advanceTick(): SimTickEventDTO | null {
    if (!this.state) {
      return null;
    }

    const nextState = gameTick(this.state);
    this.state = nextState;

    const tickEvent = mapSimTickEvent(nextState, this.speed);
    this.bus.emit('sim:tick', tickEvent);
    this.emitState(nextState);

    return tickEvent;
  }

  private emitState(state: GameState): void {
    const finance = mapFinanceUpdateEvent(state);
    const health = mapHealthEvent(state);
    const summary = mapWorldSummary(state);

    this.bus.emit('finance:update', finance);
    this.bus.emit('health:update', health);
    this.bus.emit('world:summary', summary);
  }
}
