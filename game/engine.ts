import { GameState } from './types';
import { getBlueprints } from './blueprints';

const TICKS_PER_MONTH = 30;

export function initialGameState(): GameState {
  return {
    ticks: 0,
    company: {
      id: 'company-1',
      name: 'Weedbreed',
      capital: 5000,
      structures: {},
      employees: {},
      inventory: {},
      history: [],
    },
  };
}

export function gameTick(currentState: GameState): GameState {
  const newState = { ...currentState, ticks: currentState.ticks + 1 };
  let totalExpenses = 0;

  const structureBlueprints = getBlueprints().structures;

  // Calculate rental costs from blueprints
  for (const structureId in newState.company.structures) {
    const structure = newState.company.structures[structureId];
    const blueprint = structureBlueprints[structure.blueprintId];
    
    if (blueprint) {
        const monthlyCost = structure.area_m2 * blueprint.rentalCostPerSqmPerMonth;
        const costPerTick = monthlyCost / TICKS_PER_MONTH;
        totalExpenses += costPerTick;
    }
  }

  // Deduct expenses from capital
  newState.company.capital -= totalExpenses;

  return newState;
}