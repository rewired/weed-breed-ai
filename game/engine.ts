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
      capital: 100000,
      structures: {},
      employees: {},
      inventory: {},
      history: [],
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
  
  // All the complex logic is now handled inside the company model, passing the RNG down
  newState.company.update(rng);

  return newState;
}
