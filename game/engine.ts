import { GameState, Company } from './types';
import { mulberry32 } from './utils';

export function initialGameState(companyName: string = 'Weedbreed', seed?: number): GameState {
  const gameSeed = seed ?? Date.now();
  return {
    ticks: 0,
    seed: gameSeed,
    company: new Company({
      id: `company-${Date.now()}`,
      name: companyName,
      capital: 1000000,
      structures: {},
      employees: {},
      inventory: {},
      history: [],
      ledger: {
        revenue: {
          harvests: 0,
          other: 0,
        },
        expenses: {
          rent: 0,
          maintenance: 0,
          power: 0,
          structures: 0,
          devices: 0,
          supplies: 0,
          seeds: 0,
          salaries: 0,
        },
      },
    }),
  };
}

export function gameTick(currentState: GameState): GameState {
  // Create a new deterministic RNG for this specific tick
  const rng = mulberry32(currentState.seed + currentState.ticks);

  // The company object will be mutated, but we create a new top-level object
  // to ensure React detects the state change.
  const newState: GameState = {
      ...currentState,
      ticks: currentState.ticks + 1,
  };
  
  // All the complex logic is now handled inside the company model, passing the RNG and ticks down
  newState.company.update(rng, newState.ticks, currentState.seed);

  return newState;
}