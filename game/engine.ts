import { GameState, Company } from './types';

export function initialGameState(): GameState {
  return {
    ticks: 0,
    company: new Company({
      id: 'company-1',
      name: 'Weedbreed',
      capital: 5000,
      structures: {},
      employees: {},
      inventory: {},
      history: [],
    }),
  };
}

export function gameTick(currentState: GameState): GameState {
  // The company object will be mutated, but we create a new top-level object
  // to ensure React detects the state change.
  const newState: GameState = {
      ...currentState,
      ticks: currentState.ticks + 1,
  };
  
  // All the complex logic is now handled inside the company model
  newState.company.update();

  return newState;
}
