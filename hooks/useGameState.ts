import { useState, useEffect, useCallback } from 'react';
import { GameState } from '../game/types';
// FIX: import gameTick to be used in the game loop.
import { initialGameState, gameTick } from '../game/engine';
import { loadAllBlueprints } from '../game/blueprints';
import { Company } from '../game/models/Company';

const SAVE_LIST_KEY = 'weedbreed-save-list';
const LAST_PLAYED_KEY = 'weedbreed-last-played';
const SAVE_PREFIX = 'weedbreed-save-';
const TICK_INTERVAL = 5000; // 5 seconds

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimRunning, setIsSimRunning] = useState(false);

  const getSaveGames = useCallback((): string[] => {
    const listJSON = localStorage.getItem(SAVE_LIST_KEY);
    return listJSON ? JSON.parse(listJSON) : [];
  }, []);

  const loadGame = useCallback((saveName: string) => {
    setIsSimRunning(false);
    try {
      const savedStateJSON = localStorage.getItem(`${SAVE_PREFIX}${saveName}`);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        const company = new Company(savedState.company);
        setGameState({ ...savedState, company });
        localStorage.setItem(LAST_PLAYED_KEY, saveName);
      } else {
        console.error(`Save game "${saveName}" not found.`);
      }
    } catch (error) {
      console.error(`Failed to load game state "${saveName}":`, error);
      alert(`Error loading game: ${saveName}. The save file might be corrupted.`);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await loadAllBlueprints();
        const lastPlayed = localStorage.getItem(LAST_PLAYED_KEY);
        if (lastPlayed && getSaveGames().includes(lastPlayed)) {
          loadGame(lastPlayed);
        } else {
          // No valid last played game, so we wait for user to start or load.
          setGameState(null);
        }
      } catch (error) {
        console.error("Failed to initialize game:", error);
        // If blueprints fail, we can't start a game.
        setGameState(null); 
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [loadGame, getSaveGames]);
  
  useEffect(() => {
    if (isSimRunning) {
        const timer = setInterval(() => {
            setGameState(prevState => {
                if (!prevState) return null;
                return gameTick(prevState);
            });
        }, TICK_INTERVAL);
        return () => clearInterval(timer);
    }
  }, [isSimRunning]);

  const updateGameState = useCallback(() => {
    setGameState(gs => gs ? { ...gs } : null);
  }, []);

  const saveGame = useCallback((saveName: string, stateToSaveOverride?: GameState) => {
    const state = stateToSaveOverride || gameState;
    if (!state) return;
    try {
      const stateToSave = {
        ...state,
        company: state.company.toJSON(),
      };
      localStorage.setItem(`${SAVE_PREFIX}${saveName}`, JSON.stringify(stateToSave));
      
      const saves = getSaveGames();
      if (!saves.includes(saveName)) {
        saves.push(saveName);
        localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));
      }
      localStorage.setItem(LAST_PLAYED_KEY, saveName);

      // Only show alert on manual saves, not on new game creation
      if (!stateToSaveOverride) {
          alert(`Game saved as "${saveName}"`);
      }
    } catch (error) {
      console.error("Failed to save game state:", error);
      alert("Error saving game.");
    }
  }, [gameState, getSaveGames]);

  const deleteGame = useCallback((saveName: string) => {
    localStorage.removeItem(`${SAVE_PREFIX}${saveName}`);
    const saves = getSaveGames().filter(s => s !== saveName);
    localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));

    if (localStorage.getItem(LAST_PLAYED_KEY) === saveName) {
        localStorage.removeItem(LAST_PLAYED_KEY);
    }
  }, [getSaveGames]);

  const startNewGame = useCallback((companyName: string) => {
    const newState = initialGameState(companyName);
    setGameState(newState);
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const saveName = `${companyName} - ${timestamp}`;
    saveGame(saveName, newState);
  }, [saveGame]);

  const resetGame = useCallback(() => {
    setIsSimRunning(false);
    const saves = getSaveGames();
    saves.forEach(saveName => {
        localStorage.removeItem(`${SAVE_PREFIX}${saveName}`);
    });
    localStorage.removeItem(SAVE_LIST_KEY);
    localStorage.removeItem(LAST_PLAYED_KEY);
    setGameState(null); // Go back to start screen
  }, [getSaveGames]);
  
  return {
    gameState,
    isLoading,
    isSimRunning,
    setIsSimRunning,
    updateGameState,
    resetGame,
    saveGame,
    loadGame,
    deleteGame,
    startNewGame,
    getSaveGames,
  };
};