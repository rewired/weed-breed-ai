import type { GameSpeed, GameState } from '@/game/types';
import type {
  AlertEventDTO,
  FinanceUpdateEventDTO,
  HealthEventDTO,
  SimTickEventDTO,
  WorldSummaryDTO,
} from './dto';

export interface EventSnapshot {
  tick: number;
  capital: number;
  cumulativeYield_g: number;
  ledger: {
    revenue: Record<string, number>;
    expenses: Record<string, number>;
  };
  alertIds: Set<string>;
}

const cloneLedgerSection = (section: Record<string, number> | undefined): Record<string, number> => {
  const clone: Record<string, number> = {};
  if (!section) {
    return clone;
  }
  for (const [key, value] of Object.entries(section)) {
    clone[key] = value;
  }
  return clone;
};

export const createEventSnapshot = (state: GameState): EventSnapshot => ({
  tick: state.ticks,
  capital: state.company.capital,
  cumulativeYield_g: state.company.cumulativeYield_g ?? 0,
  ledger: {
    revenue: cloneLedgerSection(state.company.ledger?.revenue),
    expenses: cloneLedgerSection(state.company.ledger?.expenses),
  },
  alertIds: new Set(state.company.alerts.map(alert => alert.id)),
});

export function mapWorldSummary(state: GameState): WorldSummaryDTO {
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

export function mapHealthEvent(state: GameState, timestamp: number): HealthEventDTO {
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

export function mapSimTickEventFromSnapshot(
  state: GameState,
  speed: GameSpeed,
  summary: WorldSummaryDTO,
  health: HealthEventDTO,
  snapshot: EventSnapshot,
  previousSnapshot: EventSnapshot | null,
  timestamp: number,
): SimTickEventDTO {
  const capitalDelta = previousSnapshot ? snapshot.capital - previousSnapshot.capital : 0;

  return {
    tick: state.ticks,
    timestamp,
    speed,
    seed: state.seed,
    companyCapital: snapshot.capital,
    capitalDelta,
    cumulativeYield_g: snapshot.cumulativeYield_g,
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

export function mapFinanceEventsFromSnapshot(
  previousSnapshot: EventSnapshot | null,
  nextSnapshot: EventSnapshot,
  timestamp: number,
): FinanceUpdateEventDTO[] {
  if (!previousSnapshot) {
    return [];
  }

  const events: FinanceUpdateEventDTO[] = [];
  const revenueCategories = new Set([
    ...Object.keys(previousSnapshot.ledger.revenue ?? {}),
    ...Object.keys(nextSnapshot.ledger.revenue ?? {}),
  ]);
  const expenseCategories = new Set([
    ...Object.keys(previousSnapshot.ledger.expenses ?? {}),
    ...Object.keys(nextSnapshot.ledger.expenses ?? {}),
  ]);

  let runningCapital = previousSnapshot.capital;

  revenueCategories.forEach(category => {
    const previousValue = previousSnapshot.ledger.revenue?.[category] ?? 0;
    const nextValue = nextSnapshot.ledger.revenue?.[category] ?? 0;
    const delta = nextValue - previousValue;
    if (delta !== 0) {
      runningCapital += delta;
      events.push({
        tick: nextSnapshot.tick,
        timestamp,
        reason: `revenue:${category}`,
        delta,
        newCapital: runningCapital,
      });
    }
  });

  expenseCategories.forEach(category => {
    const previousValue = previousSnapshot.ledger.expenses?.[category] ?? 0;
    const nextValue = nextSnapshot.ledger.expenses?.[category] ?? 0;
    const delta = nextValue - previousValue;
    if (delta !== 0) {
      runningCapital -= delta;
      events.push({
        tick: nextSnapshot.tick,
        timestamp,
        reason: `expense:${category}`,
        delta: -delta,
        newCapital: runningCapital,
      });
    }
  });

  const adjustment = nextSnapshot.capital - runningCapital;
  if (Math.abs(adjustment) > 1e-6) {
    const newCapital = runningCapital + adjustment;
    events.push({
      tick: nextSnapshot.tick,
      timestamp,
      reason: 'capital:adjustment',
      delta: adjustment,
      newCapital,
    });
  }

  return events;
}

export function mapAlertEventsFromSnapshot(
  previousSnapshot: EventSnapshot | null,
  state: GameState,
  timestamp: number,
): AlertEventDTO[] {
  if (!previousSnapshot) {
    return [];
  }

  const previousAlertIds = previousSnapshot.alertIds;

  return state.company.alerts
    .filter(alert => !previousAlertIds.has(alert.id))
    .map(alert => ({
      tick: state.ticks,
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
