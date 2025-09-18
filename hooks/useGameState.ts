import { useState, useEffect, useCallback } from 'react';
import { gameApi } from '../game/api';
import { GameState } from '../game/types';

export const useGameState = () => {
  const [snapshot, setSnapshot] = useState<GameState | null>(gameApi.getSnapshot());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleUpdate = (state: GameState | null) => {
      setSnapshot(state);
    };
    const handleLoading = () => setIsLoading(true);
    const handleReady = (state: GameState | null) => {
      setIsLoading(false);
      setSnapshot(state);
    };

    gameApi.on('update', handleUpdate);
    gameApi.on('loading', handleLoading);
    gameApi.on('ready', handleReady);

    return () => {
      gameApi.off('update', handleUpdate);
      gameApi.off('loading', handleLoading);
      gameApi.off('ready', handleReady);
    };
  }, []);
  
  // --- Create simple pass-through functions for all actions ---
  const rentStructure = useCallback((...args: Parameters<typeof gameApi.rentStructure>) => gameApi.rentStructure(...args), []);
  const addRoom = useCallback((...args: Parameters<typeof gameApi.addRoom>) => gameApi.addRoom(...args), []);
  const addZone = useCallback((...args: Parameters<typeof gameApi.addZone>) => gameApi.addZone(...args), []);
  const purchaseDevicesForZone = useCallback((...args: Parameters<typeof gameApi.purchaseDevicesForZone>) => gameApi.purchaseDevicesForZone(...args), []);
  const purchaseSuppliesForZone = useCallback((...args: Parameters<typeof gameApi.purchaseSuppliesForZone>) => gameApi.purchaseSuppliesForZone(...args), []);
  const purchaseSeedsAndPlant = useCallback((...args: Parameters<typeof gameApi.purchaseSeedsAndPlant>) => gameApi.purchaseSeedsAndPlant(...args), []);
  const breedStrain = useCallback((...args: Parameters<typeof gameApi.breedStrain>) => gameApi.breedStrain(...args), []);
  const hireEmployee = useCallback((...args: Parameters<typeof gameApi.hireEmployee>) => gameApi.hireEmployee(...args), []);
  const assignEmployeeRole = useCallback((...args: Parameters<typeof gameApi.assignEmployeeRole>) => gameApi.assignEmployeeRole(...args), []);
  const acceptRaise = useCallback((...args: Parameters<typeof gameApi.acceptRaise>) => gameApi.acceptRaise(...args), []);
  const offerBonus = useCallback((...args: Parameters<typeof gameApi.offerBonus>) => gameApi.offerBonus(...args), []);
  const declineRaise = useCallback((...args: Parameters<typeof gameApi.declineRaise>) => gameApi.declineRaise(...args), []);
  const setPlantingPlan = useCallback((...args: Parameters<typeof gameApi.setPlantingPlan>) => gameApi.setPlantingPlan(...args), []);
  const setOvertimePolicy = useCallback((...args: Parameters<typeof gameApi.setOvertimePolicy>) => gameApi.setOvertimePolicy(...args), []);
  const renameItem = useCallback((...args: Parameters<typeof gameApi.renameItem>) => gameApi.renameItem(...args), []);
  const editDeviceGroupSettings = useCallback((...args: Parameters<typeof gameApi.editDeviceGroupSettings>) => gameApi.editDeviceGroupSettings(...args), []);
  const editLightCycle = useCallback((...args: Parameters<typeof gameApi.editLightCycle>) => gameApi.editLightCycle(...args), []);
  const deleteItem = useCallback((...args: Parameters<typeof gameApi.deleteItem>) => gameApi.deleteItem(...args), []);
  const toggleDeviceGroupStatus = useCallback((...args: Parameters<typeof gameApi.toggleDeviceGroupStatus>) => gameApi.toggleDeviceGroupStatus(...args), []);
  const harvest = useCallback((...args: Parameters<typeof gameApi.harvest>) => gameApi.harvest(...args), []);
  const duplicateRoom = useCallback((...args: Parameters<typeof gameApi.duplicateRoom>) => gameApi.duplicateRoom(...args), []);
  const duplicateZone = useCallback((...args: Parameters<typeof gameApi.duplicateZone>) => gameApi.duplicateZone(...args), []);
  const acknowledgeAlert = useCallback((...args: Parameters<typeof gameApi.acknowledgeAlert>) => gameApi.acknowledgeAlert(...args), []);
  const toggleAutoReplant = useCallback((...args: Parameters<typeof gameApi.toggleAutoReplant>) => gameApi.toggleAutoReplant(...args), []);
  const deletePlantingPlan = useCallback((...args: Parameters<typeof gameApi.deletePlantingPlan>) => gameApi.deletePlantingPlan(...args), []);
  
  // Game Lifecycle pass-throughs
  const startNewGame = useCallback((...args: Parameters<typeof gameApi.startNewGame>) => gameApi.startNewGame(...args), []);
  const saveGame = useCallback((...args: Parameters<typeof gameApi.saveGame>) => gameApi.saveGame(...args), []);
  const loadGame = useCallback((...args: Parameters<typeof gameApi.loadGame>) => gameApi.loadGame(...args), []);
  const deleteGame = useCallback((...args: Parameters<typeof gameApi.deleteGame>) => gameApi.deleteGame(...args), []);
  const getSaveGames = useCallback(() => gameApi.getSaveGames(), []);
  const resetGame = useCallback(() => gameApi.resetGame(), []);
  const exportGame = useCallback(() => gameApi.exportGame(), []);
  const importGame = useCallback((...args: Parameters<typeof gameApi.importGame>) => gameApi.importGame(...args), []);

  // Simulation Control pass-throughs
  const setIsSimRunning = useCallback((isRunning: boolean) => {
    if (isRunning) gameApi.start();
    else gameApi.pause();
  }, []);
  
  const setGameSpeed = useCallback((speed: any) => gameApi.setGameSpeed(speed), []);

  return {
    snapshot: snapshot,
    isLoading,
    isSimRunning: gameApi.isSimRunning(),
    setIsSimRunning,
    gameSpeed: gameApi.getGameSpeed(),
    setGameSpeed,
    // Game Lifecycle
    startNewGame, saveGame, loadGame, deleteGame, getSaveGames, resetGame, exportGame, importGame,
    // Game Actions
    rentStructure, addRoom, addZone, purchaseDevicesForZone, purchaseSuppliesForZone, purchaseSeedsAndPlant, breedStrain,
    hireEmployee, assignEmployeeRole, acceptRaise, offerBonus, declineRaise, setPlantingPlan, renameItem,
    editDeviceGroupSettings, editLightCycle, deleteItem, toggleDeviceGroupStatus, harvest, duplicateRoom,
    duplicateZone, acknowledgeAlert, toggleAutoReplant, deletePlantingPlan, setOvertimePolicy,
  };
};
