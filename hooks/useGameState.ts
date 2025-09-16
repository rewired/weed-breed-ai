import { useState, useEffect, useCallback } from 'react';
import { GameState } from '../game/types';
import { initialGameState, gameTick } from '../game/engine';
import { loadAllBlueprints } from '../game/blueprints';
import { Company } from '../game/models/Company';

const SAVE_GAME_KEY = 'growtopia-game-state';
const TICK_INTERVAL = 5000; // 5 seconds

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimRunning, setIsSimRunning] = useState(false);

  // Load blueprints and game state from localStorage on initial render
  useEffect(() => {
    const loadGame = async () => {
      try {
        await loadAllBlueprints();
        const savedStateJSON = localStorage.getItem(SAVE_GAME_KEY);
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          const company = new Company(savedState.company);
          setGameState({ ...savedState, company });
        } else {
          setGameState(initialGameState());
        }
      } catch (error) {
        console.error("Failed to load game state or blueprints:", error);
        setGameState(initialGameState());
      } finally {
        setIsLoading(false);
      }
    };
    loadGame();
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (gameState && !isLoading) {
      try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify({
          ...gameState,
          company: gameState.company.toJSON(),
        }));
      } catch (error) {
        console.error("Failed to save game state:", error);
      }
    }
  }, [gameState, isLoading]);
  
  // Game loop
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

  const resetGame = useCallback(() => {
    setIsSimRunning(false);
    localStorage.removeItem(SAVE_GAME_KEY);
    setGameState(initialGameState());
  }, []);
  
  return {
    gameState,
    isLoading,
    isSimRunning,
    setIsSimRunning,
    updateGameState,
    resetGame,
  };
};
