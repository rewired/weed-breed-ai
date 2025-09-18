import { GameState, StructureBlueprint, RoomPurpose, JobRole, Planting, Plant, Alert, Employee, PlantingPlan, OvertimePolicy, GameSpeed } from './types';
import { initialGameState, gameTick } from './engine';
import { getBlueprints, getAvailableStrains, loadAllBlueprints } from './blueprints';
import { Company } from './models/Company';
import { mulberry32 } from './utils';

const SAVE_LIST_KEY = 'weedbreed-save-list';
const LAST_PLAYED_KEY = 'weedbreed-last-played';
const SAVE_PREFIX = 'weedbreed-save-';
const TICK_INTERVAL = 1000;

type GameEvent = 'update' | 'loading' | 'ready';
type Callback = (state: GameState | null) => void;

class EventEmitter {
    private listeners: Record<GameEvent, Callback[]> = {
        update: [],
        loading: [],
        ready: [],
    };

    on(event: GameEvent, callback: Callback) {
        this.listeners[event].push(callback);
    }

    off(event: GameEvent, callback: Callback) {
        this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    }

    emit(event: GameEvent, data: GameState | null) {
        this.listeners[event].forEach(callback => callback(data));
    }
}

class GameAPI extends EventEmitter {
    private gameState: GameState | null = null;
    private animationFrameId: number | null = null;
    private lastTickTime: number = 0;
    private _isSimRunning: boolean = false;
    private _gameSpeed: GameSpeed = 1;
    private isProcessingTick = false;

    constructor() {
        super();
        this.initialize();
    }

    private async initialize() {
        this.emit('loading', null);
        try {
            await loadAllBlueprints();
            const lastPlayed = localStorage.getItem(LAST_PLAYED_KEY);
            if (lastPlayed && this.getSaveGames().includes(lastPlayed)) {
                this.loadGame(lastPlayed, false); // Don't show alert on initial load
            } else {
                this.gameState = null;
            }
        } catch (error) {
            console.error("Failed to initialize game:", error);
            this.gameState = null;
        } finally {
            this.emit('ready', this.gameState);
            this.emitUpdate();
        }
    }

    private emitUpdate() {
        this.emit('update', this.gameState);
    }
    
    // --- State Accessors ---
    public getSnapshot(): GameState | null {
        return this.gameState;
    }

    public isSimRunning(): boolean {
        return this._isSimRunning;
    }
    
    public getGameSpeed(): GameSpeed {
        return this._gameSpeed;
    }
    
    private async processTick() {
        if (!this.gameState) {
            this.isProcessingTick = false;
            return;
        }
        try {
            this.gameState = await gameTick(this.gameState);
            this.emitUpdate();
        } catch (error) {
            console.error("Error during game tick:", error);
            this.pause();
        } finally {
            this.isProcessingTick = false;
        }
    }

    private tickLoop = (timestamp: number) => {
        if (!this._isSimRunning) return;

        // Immediately schedule the next frame to keep the loop running
        this.animationFrameId = requestAnimationFrame(this.tickLoop);

        // If a tick is already being processed, skip this frame
        if (this.isProcessingTick) return;

        const interval = TICK_INTERVAL / this._gameSpeed;
        const deltaTime = timestamp - this.lastTickTime;

        if (deltaTime >= interval) {
            this.isProcessingTick = true;
            this.lastTickTime = timestamp;
            // Run the async tick logic without blocking the animation frame loop
            this.processTick();
        }
    };


    // --- Simulation Control ---
    public start() {
        if (this._isSimRunning || !this.gameState) return;
        this._isSimRunning = true;
        this.lastTickTime = performance.now();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(this.tickLoop);
        this.emitUpdate(); // To update UI immediately
    }

    public pause() {
        if (!this._isSimRunning) return;
        this._isSimRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isProcessingTick = false; // Ensure flag is reset
        this.emitUpdate();
    }
    
    public setGameSpeed(speed: GameSpeed) {
        this._gameSpeed = speed;
        // No need to restart the loop, it will adjust automatically in the next frame
        this.emitUpdate();
    }
    
    // --- Game Lifecycle ---
    public getSaveGames(): string[] {
        const listJSON = localStorage.getItem(SAVE_LIST_KEY);
        return listJSON ? JSON.parse(listJSON) : [];
    }
    
    public async startNewGame(companyName: string, seed?: number) {
        this.pause();
        const newState = initialGameState(companyName, seed);
        const rng = mulberry32(newState.seed);
        await newState.company.updateJobMarket(rng, newState.ticks, newState.seed);
        this.gameState = newState;
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const saveName = `${companyName} - ${timestamp}`;
        this.saveGame(saveName, newState);
        this.emitUpdate();
    }
    
    public saveGame(saveName: string, stateToSaveOverride?: GameState) {
        const state = stateToSaveOverride || this.gameState;
        if (!state) return;
        try {
            const stateToSave = { ...state, company: state.company.toJSON() };
            localStorage.setItem(`${SAVE_PREFIX}${saveName}`, JSON.stringify(stateToSave));
            
            const saves = this.getSaveGames();
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
    }
    
    public loadGame(saveName: string, showAlert = true) {
        this.pause();
        try {
            const savedStateJSON = localStorage.getItem(`${SAVE_PREFIX}${saveName}`);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                const company = new Company(savedState.company);
                this.gameState = { ...savedState, company };
                localStorage.setItem(LAST_PLAYED_KEY, saveName);
                if(showAlert) alert(`Game "${saveName}" loaded.`);
            } else {
                console.error(`Save game "${saveName}" not found.`);
            }
        } catch (error) {
            console.error(`Failed to load game state "${saveName}":`, error);
            alert(`Error loading game: ${saveName}. The save file might be corrupted.`);
        }
        this.emitUpdate();
    }
    
    public deleteGame(saveName: string) {
        localStorage.removeItem(`${SAVE_PREFIX}${saveName}`);
        const saves = this.getSaveGames().filter(s => s !== saveName);
        localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));
        if (localStorage.getItem(LAST_PLAYED_KEY) === saveName) {
            localStorage.removeItem(LAST_PLAYED_KEY);
        }
    }
    
    public resetGame() {
        this.pause();
        localStorage.removeItem(LAST_PLAYED_KEY);
        this.gameState = null;
        this.emitUpdate();
    }

    public exportGame() {
        if (!this.gameState) return alert("No active game to export.");
        try {
            const stateToSave = { ...this.gameState, company: this.gameState.company.toJSON() };
            const jsonString = JSON.stringify(stateToSave, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.gameState.company.name}-save.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export game state:", error);
            alert("Error exporting game.");
        }
    }
    
    public importGame(jsonString: string) {
        this.pause();
        try {
            const importedState = JSON.parse(jsonString);
            const company = new Company(importedState.company);
            const newGameState = { ...importedState, company };
            this.gameState = newGameState;
            const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
            const saveName = `(Imported) ${company.name} - ${timestamp}`;
            this.saveGame(saveName, newGameState);
            alert(`Game "${company.name}" imported and saved as "${saveName}".`);
            this.emitUpdate();
        } catch (error) {
            console.error("Failed to import game state:", error);
            alert("Error importing game. The file might be invalid or corrupted.");
        }
    }

    // --- Game Actions ---
    private performAction(action: (gs: GameState) => boolean | void): boolean {
        if (!this.gameState) return false;
        const result = action(this.gameState);
        const success = result !== false;
        if (success) this.emitUpdate();
        return success;
    }
    
    public rentStructure = (blueprintId: string) => this.performAction(gs => {
        const blueprint = getBlueprints().structures[blueprintId];
        return blueprint ? gs.company.rentStructure(blueprint) : false;
    });

    public addRoom = (structureId: string, name: string, area: number, purpose: RoomPurpose) => this.performAction(gs => {
        const structure = gs.company.structures[structureId];
        return structure ? structure.addRoom(name, area, purpose) : false;
    });

    public addZone = (roomId: string, name: string, area: number, methodId: string) => this.performAction(gs => {
        const room = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.id === roomId);
        return room ? room.addZone(name, area, methodId) : false;
    });

    public purchaseDevicesForZone = (zoneId: string, blueprintId: string, quantity: number) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        return zone ? gs.company.purchaseDevicesForZone(blueprintId, zone, quantity) : false;
    });

    public purchaseSuppliesForZone = (zoneId: string, type: 'water' | 'nutrients', quantity: number) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        return zone ? gs.company.purchaseSuppliesForZone(zone, type, quantity) : false;
    });

    public purchaseSeedsAndPlant = (zoneId: string, strainId: string, quantity: number) => {
        if (!this.gameState) return null;
        if (!this.gameState.company.purchaseSeeds(strainId, quantity)) return null;
        const zone = Object.values(this.gameState.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        if (!zone) return null;
        const rng = mulberry32(this.gameState.seed + this.gameState.ticks);
        const result = zone.plantStrain(strainId, quantity, this.gameState.company, rng);
        if (result.germinatedCount > 0) {
            zone.status = 'Growing';
        }
        this.emitUpdate();
        return result;
    };

    public breedStrain = (parentAId: string, parentBId: string, newName: string) => this.performAction(gs => {
        const allStrains = getAvailableStrains(gs.company);
        const parentA = allStrains[parentAId];
        const parentB = allStrains[parentBId];
        return parentA && parentB ? !!gs.company.breedStrain(parentA, parentB, newName) : false;
    });

    public hireEmployee = (employee: Employee, structureId: string) => this.performAction(gs => 
        gs.company.hireEmployee(employee, structureId, gs.ticks)
    );
    
    public assignEmployeeRole = (employeeId: string, role: JobRole) => this.performAction(gs => {
        const employee = gs.company.employees[employeeId];
        if (employee) employee.role = role;
        return !!employee;
    });

    public acceptRaise = (employeeId: string, newSalary: number) => this.performAction(gs => {
        gs.company.acceptRaise(employeeId, newSalary, gs.ticks);
    });
    
    public offerBonus = (employeeId: string, bonus: number) => this.performAction(gs => {
        gs.company.offerBonus(employeeId, bonus, gs.ticks);
    });

    public declineRaise = (employeeId: string) => this.performAction(gs => {
        gs.company.declineRaise(employeeId);
    });

    public setPlantingPlan = (zoneId: string, plan: PlantingPlan | null) => this.performAction(gs => {
        gs.company.setPlantingPlanForZone(zoneId, plan);
    });

    public setOvertimePolicy = (policy: OvertimePolicy) => this.performAction(gs => {
        gs.company.overtimePolicy = policy;
    });

    public renameItem = (type: 'structure' | 'room' | 'zone', id: string, newName: string) => this.performAction(gs => {
        let item: any = null;
        if (type === 'structure') item = gs.company.structures[id];
        else if (type === 'room') item = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.id === id);
        else if (type === 'zone') item = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === id);
        if (item) item.name = newName;
        return !!item;
    });

    public editDeviceGroupSettings = (zoneId: string, blueprintId: string, settings: any) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        if (!zone || !zone.deviceGroupSettings[blueprintId]) return false;
        const groupSettings = zone.deviceGroupSettings[blueprintId];
        if (settings.targetTemperature !== null) groupSettings.targetTemperature = settings.targetTemperature;
        if (settings.targetHumidity !== null) groupSettings.targetHumidity = settings.targetHumidity;
        if (settings.targetCO2 !== null) groupSettings.targetCO2 = settings.targetCO2;
        return true;
    });
    
    public editLightCycle = (zoneId: string, cycle: { on: number, off: number }) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        if (zone) zone.lightCycle = cycle;
        return !!zone;
    });

    public deleteItem = (item: { type: string, id: string, context?: any }) => this.performAction(gs => {
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

    public toggleDeviceGroupStatus = (zoneId: string, blueprintId: string) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        if (zone) zone.toggleDeviceGroupStatus(blueprintId);
        return !!zone;
    });

    public harvest = (zoneId: string, plantId?: string) => this.performAction(gs => {
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

    public duplicateRoom = (structureId: string, roomId: string) => this.performAction(gs => {
        const structure = gs.company.structures[structureId];
        return structure ? !!structure.duplicateRoom(roomId, gs.company) : false;
    });

    public duplicateZone = (roomId: string, zoneId: string) => this.performAction(gs => {
        const room = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.id === roomId);
        return room ? !!room.duplicateZone(zoneId, gs.company) : false;
    });

    public acknowledgeAlert = (alertId: string) => this.performAction(gs => {
        const alert = gs.company.alerts.find((a: Alert) => a.id === alertId);
        if (alert) alert.isAcknowledged = true;
        return !!alert;
    });

    public toggleAutoReplant = (zoneId: string) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        if (zone?.plantingPlan) {
            zone.plantingPlan.autoReplant = !zone.plantingPlan.autoReplant;
            return true;
        }
        return false;
    });

    public deletePlantingPlan = (zoneId: string) => this.performAction(gs => {
        const zone = Object.values(gs.company.structures).flatMap(s => Object.values(s.rooms)).flatMap(r => Object.values(r.zones)).find(z => z.id === zoneId);
        if (zone) {
            zone.plantingPlan = null;
            return true;
        }
        return false;
    });
}

export const gameApi = new GameAPI();