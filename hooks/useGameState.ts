import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameSpeed, StructureBlueprint, RoomPurpose, JobRole, Planting, Plant, Alert, Employee, PlantingPlan, OvertimePolicy } from '../game/types';
import { initialGameState, gameTick } from '../game/engine';
import { getBlueprints, getAvailableStrains, loadAllBlueprints } from '../game/blueprints';
import { Company } from '../game/models/Company';
import { mulberry32 } from '../game/utils';

const SAVE_LIST_KEY = 'weedbreed-save-list';
const LAST_PLAYED_KEY = 'weedbreed-last-played';
const SAVE_PREFIX = 'weedbreed-save-';
const TICK_INTERVAL = 5000;
const SAVEGAME_VERSION = 1;

type SerializedCompany = ReturnType<Company['toJSON']>;
type PersistedGameState = Omit<GameState, 'company'> & { company: SerializedCompany };

interface SaveGameEnvelope {
  version: number;
  createdAt: string;
  seed: number;
  payload: PersistedGameState;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSaveGameEnvelope = (value: unknown): value is SaveGameEnvelope => {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'number') return false;
  if (typeof value.createdAt !== 'string') return false;
  if (typeof value.seed !== 'number') return false;
  if (!('payload' in value)) return false;

  const { payload } = value as { payload: unknown };
  return isRecord(payload);
};

const deserializeSaveGame = (
  value: unknown,
): { state: PersistedGameState; envelope: SaveGameEnvelope | null } => {
  if (isSaveGameEnvelope(value)) {
    if (value.version !== SAVEGAME_VERSION) {
      console.warn(
        `Loading save with unsupported version ${value.version}. Attempting to migrate using payload data.`,
      );
    }
    return { state: value.payload, envelope: value };
  }

  return { state: value as PersistedGameState, envelope: null };
};

const parseSaveGameString = (
  jsonString: string,
): { state: PersistedGameState; envelope: SaveGameEnvelope | null } => {
  const raw = JSON.parse(jsonString);
  return deserializeSaveGame(raw);
};

const serializeGameState = (state: GameState): PersistedGameState => {
  const { company, ...rest } = state;
  return {
    ...rest,
    company: company.toJSON(),
  };
};

const hydrateGameState = (state: PersistedGameState): GameState => {
  const { company: companyData, ...rest } = state;
  return {
    ...rest,
    company: new Company(companyData),
  };
};

const createEnvelope = (
  state: PersistedGameState,
  previousEnvelope?: SaveGameEnvelope | null,
): SaveGameEnvelope => ({
  version: SAVEGAME_VERSION,
  createdAt: previousEnvelope?.createdAt ?? new Date().toISOString(),
  seed: state.seed,
  payload: state,
});

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(1);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const getSaveGames = useCallback((): string[] => {
    const listJSON = localStorage.getItem(SAVE_LIST_KEY);
    return listJSON ? JSON.parse(listJSON) : [];
  }, []);

  const loadGame = useCallback((saveName: string) => {
    setIsSimRunning(false);
    try {
      const savedStateJSON = localStorage.getItem(`${SAVE_PREFIX}${saveName}`);
      if (savedStateJSON) {
        const { state } = parseSaveGameString(savedStateJSON);
        const hydratedState = hydrateGameState(state);
        setGameState(hydratedState);
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
          setGameState(null);
        }
      } catch (error) {
        console.error("Failed to initialize game:", error);
        setGameState(null); 
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [loadGame, getSaveGames]);
  
  useEffect(() => {
    if (isSimRunning) {
        const interval = TICK_INTERVAL / gameSpeed;
        const timer = setInterval(() => {
            setGameState(prevState => {
                if (!prevState) return null;
                return gameTick(prevState);
            });
        }, interval);
        return () => clearInterval(timer);
    }
  }, [isSimRunning, gameSpeed]);

  const updateGameState = useCallback(() => {
    setGameState(gs => gs ? { ...gs } : null);
  }, []);

  const saveGame = useCallback((saveName: string, stateToSaveOverride?: GameState) => {
    const state = stateToSaveOverride || gameStateRef.current;
    if (!state) return;
    try {
      const stateToSave = serializeGameState(state);
      let previousEnvelope: SaveGameEnvelope | null = null;

      const existingJSON = localStorage.getItem(`${SAVE_PREFIX}${saveName}`);
      if (existingJSON) {
        try {
          const { envelope } = parseSaveGameString(existingJSON);
          previousEnvelope = envelope;
        } catch (parseError) {
          console.warn(
            `Existing save "${saveName}" is not in a recognized format. Overwriting with a new envelope.`,
            parseError,
          );
        }
      }

      const envelope = createEnvelope(stateToSave, previousEnvelope);
      localStorage.setItem(`${SAVE_PREFIX}${saveName}`, JSON.stringify(envelope));

      const saves = getSaveGames();
      if (!saves.includes(saveName)) {
        saves.push(saveName);
        localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));
      }
      localStorage.setItem(LAST_PLAYED_KEY, saveName);
      if (!stateToSaveOverride) alert(`Game saved as "${saveName}"`);
    } catch (error) {
      console.error("Failed to save game state:", error);
      alert("Error saving game.");
    }
  }, [getSaveGames]);

  const deleteGame = useCallback((saveName: string) => {
    localStorage.removeItem(`${SAVE_PREFIX}${saveName}`);
    const saves = getSaveGames().filter(s => s !== saveName);
    localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));
    if (localStorage.getItem(LAST_PLAYED_KEY) === saveName) {
        localStorage.removeItem(LAST_PLAYED_KEY);
    }
  }, [getSaveGames]);

  const startNewGame = useCallback(async (companyName: string, seed?: number) => {
    const newState = initialGameState(companyName, seed);
    const rng = mulberry32(newState.seed);
    await newState.company.updateJobMarket(rng, newState.ticks, newState.seed);
    setGameState(newState);
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const saveName = `${companyName} - ${timestamp}`;
    saveGame(saveName, newState);
  }, [saveGame]);

  const resetGame = useCallback(() => {
    setIsSimRunning(false);
    localStorage.removeItem(LAST_PLAYED_KEY);
    setGameState(null);
  }, []);

  const exportGame = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs) return alert("No active game to export.");
    try {
      const stateToSave = serializeGameState(gs);
      let previousEnvelope: SaveGameEnvelope | null = null;

      const lastPlayed = localStorage.getItem(LAST_PLAYED_KEY);
      if (lastPlayed) {
        const existingJSON = localStorage.getItem(`${SAVE_PREFIX}${lastPlayed}`);
        if (existingJSON) {
          try {
            const { envelope } = parseSaveGameString(existingJSON);
            previousEnvelope = envelope;
          } catch (error) {
            console.warn('Failed to read existing save metadata for export. Generating new envelope.', error);
          }
        }
      }

      const envelope = createEnvelope(stateToSave, previousEnvelope);
      const jsonString = JSON.stringify(envelope, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gs.company.name}-save.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export game state:", error);
      alert("Error exporting game.");
    }
  }, []);
  
  const importGame = useCallback((jsonString: string) => {
    setIsSimRunning(false);
    try {
      const { state } = parseSaveGameString(jsonString);
      const newGameState = hydrateGameState(state);
      const { company } = newGameState;
      setGameState(newGameState);
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const saveName = `(Imported) ${company.name} - ${timestamp}`;
      saveGame(saveName, newGameState);
      alert(`Game "${company.name}" imported and saved as "${saveName}".`);
    } catch (error) {
      console.error("Failed to import game state:", error);
      alert("Error importing game. The file might be invalid or corrupted.");
    }
  }, [saveGame]);

  // --- Game Logic Handlers ---
  const createAction = <T extends any[]>(action: (gs: GameState, ...args: T) => boolean | void) => 
    useCallback((...args: T): boolean => {
      const gs = gameStateRef.current;
      if (!gs) return false;
      const result = action(gs, ...args);
      const success = result !== false;
      if (success) updateGameState();
      return success;
    }, [updateGameState]);

  const rentStructure = createAction((gs, blueprintId: string) => {
    const blueprint = getBlueprints().structures[blueprintId];
    return blueprint ? gs.company.rentStructure(blueprint) : false;
  });

  const addRoom = createAction((gs, structureId: string, name: string, area: number, purpose: RoomPurpose) => {
    const structure = gs.company.structures[structureId];
    return structure ? structure.addRoom(name, area, purpose) : false;
  });

  const addZone = createAction((gs, roomId: string, name: string, area: number, methodId: string) => {
    const room = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.id === roomId);
    return room ? room.addZone(name, area, methodId) : false;
  });

  const purchaseDevicesForZone = createAction((gs, zoneId: string, blueprintId: string, quantity: number) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (!zone) return false;
    const rng = gs.company.getActionRng(gs.seed, gs.ticks);
    return gs.company.purchaseDevicesForZone(blueprintId, zone, quantity, rng);
  });

  const purchaseSuppliesForZone = createAction((gs, zoneId: string, type: 'water' | 'nutrients', quantity: number) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    return zone ? gs.company.purchaseSuppliesForZone(zone, type, quantity) : false;
  });

  const purchaseSeedsAndPlant = useCallback((zoneId: string, strainId: string, quantity: number) => {
    const gs = gameStateRef.current;
    if (!gs) return null;
    if (!gs.company.purchaseSeeds(strainId, quantity)) return null;
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (!zone) return null;
    const rng = mulberry32(gs.seed + gs.ticks);
    const result = zone.plantStrain(strainId, quantity, gs.company, rng);
    if (result.germinatedCount > 0) {
      zone.status = 'Growing';
    }
    updateGameState();
    return result;
  }, [updateGameState]);

  const breedStrain = createAction((gs, parentAId: string, parentBId: string, newName: string) => {
    const allStrains = getAvailableStrains(gs.company);
    const parentA = allStrains[parentAId];
    const parentB = allStrains[parentBId];
    if (!parentA || !parentB) return false;
    const rng = gs.company.getActionRng(gs.seed, gs.ticks);
    return !!gs.company.breedStrain(parentA, parentB, newName, rng);
  });

  const hireEmployee = createAction((gs, employee: Employee, structureId: string) => 
    gs.company.hireEmployee(employee, structureId, gs.ticks)
  );
  
  const assignEmployeeRole = createAction((gs, employeeId: string, role: JobRole) => {
    const employee = gs.company.employees[employeeId];
    if (employee) employee.role = role;
    return !!employee;
  });

  const acceptRaise = createAction((gs, employeeId: string, newSalary: number) => {
    gs.company.acceptRaise(employeeId, newSalary, gs.ticks);
  });
  
  const offerBonus = createAction((gs, employeeId: string, bonus: number) => {
    gs.company.offerBonus(employeeId, bonus, gs.ticks);
  });

  const declineRaise = createAction((gs, employeeId: string) => {
    gs.company.declineRaise(employeeId);
  });

  const setPlantingPlan = createAction((gs, zoneId: string, plan: PlantingPlan | null) => {
    gs.company.setPlantingPlanForZone(zoneId, plan);
  });

  const setOvertimePolicy = createAction((gs, policy: OvertimePolicy) => {
    gs.company.overtimePolicy = policy;
  });

  const renameItem = createAction((gs, type: 'structure' | 'room' | 'zone', id: string, newName: string) => {
    let item: any = null;
    if (type === 'structure') item = gs.company.structures[id];
    else if (type === 'room') item = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.id === id);
    else if (type === 'zone') item = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === id);
    if (item) item.name = newName;
    return !!item;
  });

  const editDeviceGroupSettings = createAction((gs, zoneId: string, blueprintId: string, settings: any) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (!zone || !zone.deviceGroupSettings[blueprintId]) return false;
    const groupSettings = zone.deviceGroupSettings[blueprintId];
    if (settings.targetTemperature !== null) groupSettings.targetTemperature = settings.targetTemperature;
    if (settings.targetHumidity !== null) groupSettings.targetHumidity = settings.targetHumidity;
    if (settings.targetCO2 !== null) groupSettings.targetCO2 = settings.targetCO2;
    return true;
  });
  
  const editLightCycle = createAction((gs, zoneId: string, cycle: { on: number, off: number }) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (zone) zone.lightCycle = cycle;
    return !!zone;
  });

  const deleteItem = createAction((gs, item: { type: string, id: string, context?: any }) => {
    const { type, id, context } = item;
    if (type === 'structure') gs.company.deleteStructure(id);
    else if (type === 'room') Object.values(gs.company.structures).forEach(s => s.deleteRoom(id));
    else if (type === 'zone') Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).forEach(r => r.deleteZone(id));
    else if (type === 'device' && context?.zoneId) {
      const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === context.zoneId);
      if (zone) zone.removeDevice(id);
    } else if ((type === 'plant' || type === 'planting') && context?.zoneId) {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === context.zoneId);
        if (zone) {
            if (type === 'planting') zone.removePlanting(id);
            else if (type === 'plant' && context.plantingId) {
                const planting = zone.plantings[context.plantingId];
                if (planting) {
                    planting.removePlant(id);
                    if (planting.quantity === 0) zone.removePlanting(context.plantingId);
                }
            }
        }
    } else if (type === 'employee') return !!gs.company.fireEmployee(id);
    return true;
  });

  const toggleDeviceGroupStatus = createAction((gs, zoneId: string, blueprintId: string) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (zone) zone.toggleDeviceGroupStatus(blueprintId);
    return !!zone;
  });

  const harvest = createAction((gs, zoneId: string, plantId?: string) => {
    const structure = Object.values(gs.company.structures).find(s => Object.values(s.rooms).some(r => r.zones[zoneId]));
    const zone = structure?.rooms[Object.keys(structure.rooms).find(rId => structure.rooms[rId].zones[zoneId]) || '']?.zones[zoneId];
    if (!zone || !structure) return false;
    
    let plantsToHarvest: {plant: Plant, planting: Planting}[] = plantId 
      ? Object.values(zone.plantings).flatMap(p => p.plants.map(plt => ({ plant: plt, planting: p }))).filter(({ plant }) => plant.id === plantId)
      : zone.getHarvestablePlants();

    if (plantsToHarvest.length === 0) return false;

    const negotiationSkill = structure.getMaxSkill(gs.company, 'Negotiation', 'Salesperson');
    const negotiationBonus = (negotiationSkill / 10) * 0.10;
    const result = gs.company.harvestPlants(plantsToHarvest, negotiationBonus);
    zone.cleanupEmptyPlantings();
    
    if (zone.getTotalPlantedCount() === 0) {
        zone.cyclesUsed = (zone.cyclesUsed || 0) + 1;
        zone.status = 'Harvested';
        const room = Object.values(structure.rooms).find(r => r.zones[zoneId]);
        if(room) {
            gs.company.alerts.push({
                id: `alert-${zone.id}-harvested-${gs.ticks}`, type: 'zone_harvested', message: `Zone '${zone.name}' is harvested and needs cleaning.`,
                location: { structureId: structure.id, roomId: room.id, zoneId: zone.id }, tickGenerated: gs.ticks
            });
        }
    }
    
    if (result.count > 0) {
      let alertMessage = `Harvested ${result.count} plant(s) for ${result.totalYield.toFixed(2)}g, earning ${result.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
      if (negotiationBonus > 0) alertMessage += ` (including a ${(negotiationBonus * 100).toFixed(1)}% sales bonus).`;
      else alertMessage += '.';
      alert(alertMessage);
    }
    return true;
  });

  const duplicateRoom = createAction((gs, structureId: string, roomId: string) => {
    const structure = gs.company.structures[structureId];
    if (!structure) return false;
    const rng = gs.company.getActionRng(gs.seed, gs.ticks);
    return !!structure.duplicateRoom(roomId, gs.company, rng);
  });

  const duplicateZone = createAction((gs, roomId: string, zoneId: string) => {
    const room = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.id === roomId);
    if (!room) return false;
    const rng = gs.company.getActionRng(gs.seed, gs.ticks);
    return !!room.duplicateZone(zoneId, gs.company, rng);
  });

  const acknowledgeAlert = createAction((gs, alertId: string) => {
    const alert = gs.company.alerts.find((a: Alert) => a.id === alertId);
    if (alert) alert.isAcknowledged = true;
    return !!alert;
  });

  const toggleAutoReplant = createAction((gs, zoneId: string) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (zone?.plantingPlan) {
      zone.plantingPlan.autoReplant = !zone.plantingPlan.autoReplant;
      return true;
    }
    return false;
  });

  const deletePlantingPlan = createAction((gs, zoneId: string) => {
    const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
    if (zone) {
      zone.plantingPlan = null;
      return true;
    }
    return false;
  });

  return {
    gameState, isLoading, isSimRunning, setIsSimRunning, updateGameState, gameSpeed, setGameSpeed,
    // Game Lifecycle
    startNewGame, saveGame, loadGame, deleteGame, getSaveGames, resetGame, exportGame, importGame,
    // Game Actions
    rentStructure, addRoom, addZone, purchaseDevicesForZone, purchaseSuppliesForZone, purchaseSeedsAndPlant, breedStrain,
    hireEmployee, assignEmployeeRole, acceptRaise, offerBonus, declineRaise, setPlantingPlan, renameItem,
    editDeviceGroupSettings, editLightCycle, deleteItem, toggleDeviceGroupStatus, harvest, duplicateRoom,
    duplicateZone, acknowledgeAlert, toggleAutoReplant, deletePlantingPlan, setOvertimePolicy,
  };
};