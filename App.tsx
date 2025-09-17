import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useViewManager } from './hooks/useViewManager';
import { useModals } from './hooks/useModals';

import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import MainView from './views/MainView';
import { Modals } from './components/modals';
import { getAvailableStrains, getBlueprints } from './game/blueprints';
import StartScreen from './views/StartScreen';
import { mulberry32 } from './game/utils';
import { Planting, Plant, AlertLocation, Alert, Employee, JobRole } from './game/types';

const App = () => {
  const { 
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
    gameSpeed,
    setGameSpeed,
    exportGame,
    importGame,
  } = useGameState();

  const { 
    selectedStructureId, 
    selectedRoomId, 
    selectedZoneId,
    setSelectedStructureId, 
    setSelectedRoomId, 
    setSelectedZoneId,
    handleBack, 
    goToRoot, 
    goToStructureView,
    goToRoomView,
    currentView,
    setCurrentView,
  } = useViewManager();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousAlertsRef = useRef<Set<string>>(new Set());
  const [isGameMenuOpen, setGameMenuOpen] = useState(false);


  // Auto-pause on new alerts
  useEffect(() => {
    if (!gameState) {
        previousAlertsRef.current = new Set();
        return;
    }

    const currentAlertKeys = new Set(
        gameState.company.alerts.map(a => `${a.location.zoneId}-${a.type}`)
    );

    const previousAlertKeys = previousAlertsRef.current;
    
    let isNewAlertTriggered = false;
    for (const key of currentAlertKeys) {
        if (!previousAlertKeys.has(key)) {
            isNewAlertTriggered = true;
            break;
        }
    }

    if (isNewAlertTriggered && isSimRunning) {
        setIsSimRunning(false);
    }

    // Update the ref for the next tick
    previousAlertsRef.current = currentAlertKeys;
  }, [gameState, isSimRunning, setIsSimRunning]);


  const selectedStructure = selectedStructureId && gameState ? gameState.company.structures[selectedStructureId] : null;
  const selectedRoom = selectedStructure && selectedRoomId ? selectedStructure.rooms[selectedRoomId] : null;
  const selectedZone = selectedRoom && selectedRoomId ? selectedRoom.zones[selectedZoneId] : null;
  
  const { modalState, formState, openModal, closeModal, updateForm, resetForm } = useModals({
    selectedStructure,
    selectedRoom,
    gameState,
    isSimRunning,
    setIsSimRunning,
  });
  
  //--- Action Handlers ---//
  
  const handleFinancesClick = useCallback(() => {
    setCurrentView(prev => prev === 'finances' ? 'structures' : 'finances');
  }, [setCurrentView]);
  
  const handlePersonnelClick = useCallback(() => {
    setCurrentView(prev => prev === 'personnel' ? 'structures' : 'personnel');
  }, [setCurrentView]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        importGame(text);
      }
    };
    reader.onerror = (e) => {
      console.error("Failed to read file:", e);
      alert("Error reading file.");
    };
    reader.readAsText(file);

    // Reset the input value so the same file can be selected again
    event.target.value = '';
  }, [importGame]);


  const handleStartNewGame = useCallback(async () => {
    if (!formState.newCompanyName) {
      alert("Please enter a company name.");
      return;
    }
    const seed = formState.seed ? parseInt(formState.seed, 10) : undefined;
    if (formState.seed && isNaN(seed)) {
      alert("Seed must be a number.");
      return;
    }
    await startNewGame(formState.newCompanyName, seed);
    closeModal('newGame');
  }, [formState.newCompanyName, formState.seed, startNewGame, closeModal]);

  const handleSaveGame = useCallback(() => {
    if (!formState.saveGameName) {
      alert("Please enter a name for your save game.");
      return;
    }
    saveGame(formState.saveGameName);
    closeModal('save');
  }, [formState.saveGameName, saveGame, closeModal]);

  const handleLoadGame = useCallback((saveName: string) => {
    loadGame(saveName);
    closeModal('load');
  }, [loadGame, closeModal]);

  const handleDeleteGame = useCallback((saveName: string) => {
    if (window.confirm(`Are you sure you want to delete the save game "${saveName}"?`)) {
        deleteGame(saveName);
        // We need to re-open the modal with the updated list.
        // A bit of a hack, but necessary with the current modal structure.
        closeModal('load');
        setTimeout(() => openModal('load'), 0);
    }
  }, [deleteGame, closeModal, openModal]);


  const handleRentStructure = useCallback(() => {
    if (!gameState || !formState.selectedStructureBlueprintId) return;
    const blueprint = getBlueprints().structures[formState.selectedStructureBlueprintId];
    if (!blueprint) {
      console.error(`Could not find structure blueprint with ID: ${formState.selectedStructureBlueprintId}`);
      return;
    }
    const success = gameState.company.rentStructure(blueprint);
    if (success) {
      updateGameState();
      closeModal('rent');
    }
  }, [gameState, formState.selectedStructureBlueprintId, updateGameState, closeModal]);

  const handleAddRoom = useCallback(() => {
    if (!selectedStructure) return;
    const { newItemName, newItemArea, newRoomPurpose } = formState;
    const success = selectedStructure.addRoom(newItemName, newItemArea, newRoomPurpose);
    if (success) {
      updateGameState();
      closeModal('addRoom');
    }
  }, [selectedStructure, formState, updateGameState, closeModal]);

  const handleAddZone = useCallback(() => {
    if (!selectedRoom) return;
    const { newItemName, newItemArea, newZoneCultivationMethodId } = formState;
    if(!newZoneCultivationMethodId) return;

    const success = selectedRoom.addZone(newItemName, newItemArea, newZoneCultivationMethodId);
    if (success) {
      updateGameState();
      closeModal('addZone');
    }
  }, [selectedRoom, formState, updateGameState, closeModal]);
  
  const handleAddDevice = useCallback(() => {
    if (!gameState || !modalState.activeZoneId) return;
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[modalState.activeZoneId]);
    const zone = room?.zones[modalState.activeZoneId];
    if (!zone || !formState.selectedDeviceBlueprintId || !formState.deviceQuantity) return;
    
    const success = gameState.company.purchaseDevicesForZone(formState.selectedDeviceBlueprintId, zone, formState.deviceQuantity);
    if (success) {
      updateGameState();
      closeModal('addDevice');
    }
  }, [gameState, modalState.activeZoneId, formState.selectedDeviceBlueprintId, formState.deviceQuantity, updateGameState, closeModal]);

  const handleAddSupply = useCallback(() => {
    if (!gameState || !modalState.activeZoneId) return;
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[modalState.activeZoneId]);
    const zone = room?.zones[modalState.activeZoneId];
    if (!zone || !formState.supplyType || formState.supplyQuantity <= 0) return;
    
    const success = gameState.company.purchaseSuppliesForZone(zone, formState.supplyType, formState.supplyQuantity);
    
    if (success) {
        updateGameState();
        closeModal('addSupply');
    }
  }, [gameState, modalState.activeZoneId, formState.supplyType, formState.supplyQuantity, updateGameState, closeModal]);

  const handlePlantStrain = useCallback(() => {
    if (!gameState || !modalState.activeZoneId || !formState.plantStrainId || formState.plantQuantity <= 0) return;
    
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[modalState.activeZoneId]);
    const zone = room?.zones[modalState.activeZoneId];
    if (!zone) {
        console.error(`Zone with id ${modalState.activeZoneId} not found`);
        return;
    }

    // 1. Handle financial transaction first
    const seedsPurchased = gameState.company.purchaseSeeds(formState.plantStrainId, formState.plantQuantity);
    if (!seedsPurchased) return; // Purchase failed (not enough money), alert already shown

    // 2. Then perform the simulation action
    const rng = mulberry32(gameState.seed + gameState.ticks);
    const result = zone.plantStrain(formState.plantStrainId, formState.plantQuantity, gameState.company, rng);
    
    updateGameState();
    closeModal('plantStrain');
    alert(`Successfully planted. ${result.germinatedCount} of ${formState.plantQuantity} seeds germinated.`);
}, [gameState, modalState.activeZoneId, formState.plantStrainId, formState.plantQuantity, updateGameState, closeModal]);

  const handleBreedStrain = useCallback(() => {
    if (!gameState || !formState.parentAId || !formState.parentBId || !formState.newStrainName) return;

    const allStrains = getAvailableStrains(gameState.company);
    const parentA = allStrains[formState.parentAId];
    const parentB = allStrains[formState.parentBId];
    
    const newStrain = gameState.company.breedStrain(parentA, parentB, formState.newStrainName);
    
    if (newStrain) {
      updateGameState();
      closeModal('breedStrain');
    }
  }, [gameState, formState, updateGameState, closeModal]);

  const handleHireEmployee = useCallback(() => {
    if (!gameState || !modalState.itemToHire || !formState.hireStructureId) return;
    
    const success = gameState.company.hireEmployee(modalState.itemToHire, formState.hireStructureId);
    
    if (success) {
      updateGameState();
      closeModal('hireEmployee');
    }
  }, [gameState, modalState.itemToHire, formState.hireStructureId, updateGameState, closeModal]);

  const handleAssignEmployeeRole = useCallback((employeeId: string, role: JobRole) => {
    if (!gameState) return;
    const employee = gameState.company.employees[employeeId];
    if (employee) {
        employee.role = role;
        updateGameState();
    }
  }, [gameState, updateGameState]);


  const handleRenameItem = useCallback(() => {
    if (!gameState || !modalState.itemToRename) return;
    const { type, id } = modalState.itemToRename;

    if (type === 'structure') {
      gameState.company.structures[id].name = formState.renameValue;
    } else if (type === 'room' && selectedStructure) {
      selectedStructure.rooms[id].name = formState.renameValue;
    } else if (type === 'zone' && selectedRoom) {
      selectedRoom.zones[id].name = formState.renameValue;
    }
    
    updateGameState();
    closeModal('rename');
  }, [gameState, modalState.itemToRename, formState.renameValue, selectedStructure, selectedRoom, updateGameState, closeModal]);

  const handleRenameRoom = useCallback((roomId: string, newName: string) => {
    if (!gameState) return;
    const room = Object.values(gameState.company.structures)
      .flatMap(s => Object.values(s.rooms))
      .find(r => r.id === roomId);
    if (room && newName.trim()) {
      room.name = newName.trim();
      updateGameState();
    }
  }, [gameState, updateGameState]);

  const handleRenameZone = useCallback((zoneId: string, newName: string) => {
    if (!gameState) return;
    const zone = Object.values(gameState.company.structures)
      .flatMap(s => Object.values(s.rooms))
      .flatMap(r => Object.values(r.zones))
      .find(z => z.id === zoneId);
    if (zone && newName.trim()) {
      zone.name = newName.trim();
      updateGameState();
    }
  }, [gameState, updateGameState]);


  const handleEditDeviceSettings = useCallback(() => {
    if (!modalState.itemToEdit || !gameState) return;
    const { blueprintId, context } = modalState.itemToEdit;
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[context.zoneId]);
    const zone = room?.zones[context.zoneId];
    if (!zone) return;

    const groupSettings = zone.deviceGroupSettings[blueprintId];
    if (groupSettings) {
        if (formState.deviceTargetTemp !== null) {
            groupSettings.targetTemperature = formState.deviceTargetTemp;
        }
        if (formState.deviceTargetHumidity !== null) {
            groupSettings.targetHumidity = formState.deviceTargetHumidity / 100;
        }
        if (formState.deviceTargetCO2 !== null) {
            groupSettings.targetCO2 = formState.deviceTargetCO2;
        }
    }
    updateGameState();
    closeModal('editDevice');
  }, [gameState, modalState.itemToEdit, formState, updateGameState, closeModal]);

  const handleEditLightCycle = useCallback(() => {
    if (!modalState.activeZoneId || !gameState) return;
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[modalState.activeZoneId]);
    const zone = room?.zones[modalState.activeZoneId];
    if (!zone) return;

    zone.lightCycle = {
      on: formState.lightCycleOnHours,
      off: 24 - formState.lightCycleOnHours,
    };
    updateGameState();
    closeModal('editLightCycle');
  }, [gameState, modalState.activeZoneId, formState.lightCycleOnHours, updateGameState, closeModal]);


  const handleDeleteItem = useCallback(() => {
    if (!gameState || !modalState.itemToDelete) return;
    const { type, id, context } = modalState.itemToDelete;

    if (type === 'structure') {
      gameState.company.deleteStructure(id);
      if (id === selectedStructureId) {
        goToRoot();
      }
    } else if (type === 'room' && selectedStructure) {
      selectedStructure.deleteRoom(id);
      if (id === selectedRoomId) {
        setSelectedRoomId(null);
      }
    } else if (type === 'zone' && selectedRoom) {
      selectedRoom.deleteZone(id);
      if (id === selectedZoneId) {
        setSelectedZoneId(null);
      }
    } else if (type === 'device' && context?.zoneId) {
      const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[context.zoneId]);
      const zone = room?.zones[context.zoneId];
      if (zone) {
          zone.removeDevice(id);
      }
    } else if (type === 'plant' && context?.zoneId && context?.plantingId) {
      const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[context.zoneId]);
      const zone = room?.zones[context.zoneId];
      const planting = zone?.plantings[context.plantingId];
      if (planting) {
          planting.removePlant(id);
          if (planting.quantity === 0) {
              zone.removePlanting(context.plantingId);
          }
      }
    } else if (type === 'planting' && context?.zoneId) {
      const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[context.zoneId]);
      const zone = room?.zones[context.zoneId];
      if (zone) {
          zone.removePlanting(id);
      }
    }

    updateGameState();
    closeModal('delete');
  }, [gameState, modalState.itemToDelete, selectedStructureId, selectedRoomId, selectedZoneId, selectedStructure, selectedRoom, goToRoot, setSelectedRoomId, setSelectedZoneId, updateGameState, closeModal]);

  const handleToggleDeviceGroupStatus = useCallback((zoneId: string, blueprintId: string) => {
    if (!gameState) return;
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[zoneId]);
    const zone = room?.zones[zoneId];
    if (zone) {
        zone.toggleDeviceGroupStatus(blueprintId);
        updateGameState();
    }
  }, [gameState, updateGameState]);

  const handleHarvest = useCallback((plantId?: string) => {
    if (!gameState || !selectedZone || !selectedStructure) return;

    let plantsToHarvest: {plant: Plant, planting: Planting}[];

    if (plantId) {
        const allPlantsInZone = Object.values(selectedZone.plantings).flatMap(p => p.plants.map(plt => ({ plant: plt, planting: p })));
        plantsToHarvest = allPlantsInZone.filter(({ plant }) => plant.id === plantId);
    } else {
        plantsToHarvest = selectedZone.getHarvestablePlants();
    }

    if (plantsToHarvest.length === 0) {
        console.warn("Attempted to harvest but no harvestable plants were found.");
        return;
    }
    
    // Calculate negotiation bonus
    const negotiationSkill = selectedStructure.getMaxSkill(gameState.company, 'Negotiation', 'Salesperson');
    const negotiationBonus = (negotiationSkill / 10) * 0.10; // Max 10% bonus

    const result = gameState.company.harvestPlants(plantsToHarvest, negotiationBonus);
    selectedZone.cleanupEmptyPlantings();
    updateGameState();

    if (result.count > 0) {
      let alertMessage = `Harvested ${result.count} plant(s) for a total yield of ${result.totalYield.toFixed(2)}g, earning ${result.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
      if (negotiationBonus > 0) {
        alertMessage += ` (including a ${(negotiationBonus * 100).toFixed(1)}% sales bonus).`;
      } else {
        alertMessage += '.';
      }
      alert(alertMessage);
    }
  }, [gameState, selectedZone, selectedStructure, updateGameState]);

  const handleResetConfirm = useCallback(() => {
    resetGame();
    goToRoot();
    closeModal('reset');
  }, [resetGame, goToRoot, closeModal]);

  const handleDuplicateRoom = useCallback((structureId: string, roomId: string) => {
    if (!gameState) return;
    const structure = gameState.company.structures[structureId];
    if (structure) {
      const newRoom = structure.duplicateRoom(roomId, gameState.company);
      if (newRoom) {
        updateGameState();
      }
    }
  }, [gameState, updateGameState]);

  const handleDuplicateZone = useCallback((roomId: string, zoneId: string) => {
    if (!gameState) return;
    const room = Object.values(gameState.company.structures)
      .flatMap(s => Object.values(s.rooms))
      .find(r => r.id === roomId);
    
    if (room) {
      const newZone = room.duplicateZone(zoneId, gameState.company);
      if (newZone) {
        updateGameState();
      }
    }
  }, [gameState, updateGameState]);

  const handleNavigateToZone = useCallback((direction: 'next' | 'prev') => {
    if (!selectedRoom || !selectedZoneId) return;

    const zoneIds = Object.keys(selectedRoom.zones);
    const currentIndex = zoneIds.indexOf(selectedZoneId);

    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < zoneIds.length) {
        setSelectedZoneId(zoneIds[nextIndex]);
    }
  }, [selectedRoom, selectedZoneId, setSelectedZoneId]);

  const handleNavigateToAlert = useCallback((location: AlertLocation) => {
    setSelectedStructureId(location.structureId);
    setSelectedRoomId(location.roomId);
    setSelectedZoneId(location.zoneId);
  }, [setSelectedStructureId, setSelectedRoomId, setSelectedZoneId]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    if (!gameState) return;
    const alert = gameState.company.alerts.find((a: Alert) => a.id === alertId);
    if (alert) {
        alert.isAcknowledged = true;
        updateGameState();
    }
  }, [gameState, updateGameState]);


  //--- Render ---//

  if (isLoading) {
    return (
      <div className="content-area">
        <div className="loading-screen">Loading Game...</div>
      </div>
    );
  }

  const isAnyModalOpen = Object.values(modalState).some(v => typeof v === 'boolean' && v);
  const isBlurred = isGameMenuOpen || isAnyModalOpen;

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json,application/json" 
        onChange={handleFileSelect} 
      />
      <div className="app-container">
        {gameState && (
          <Dashboard 
            capital={gameState.company.capital}
            cumulativeYield_g={gameState.company.cumulativeYield_g}
            ticks={gameState.ticks}
            isSimRunning={isSimRunning}
            onStart={() => setIsSimRunning(true)}
            onPause={() => setIsSimRunning(false)}
            onReset={(context) => openModal('reset', context)}
            onSaveClick={(context) => openModal('save', context)}
            onLoadClick={(context) => openModal('load', context)}
            onExportClick={exportGame}
            onFinancesClick={handleFinancesClick}
            onPersonnelClick={handlePersonnelClick}
            gameSpeed={gameSpeed}
            onSetGameSpeed={setGameSpeed}
            currentView={currentView}
            alerts={gameState.company.alerts}
            onNavigateToAlert={handleNavigateToAlert}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onGameMenuToggle={setGameMenuOpen}
          />
        )}
        <div className={`content-area ${isBlurred ? 'blurred' : ''}`}>
          {gameState ? (
            <main>
              <Navigation
                structure={selectedStructure}
                room={selectedRoom}
                zone={selectedZone}
                onBack={handleBack}
                onRootClick={goToRoot}
                onStructureClick={goToStructureView}
                onRoomClick={goToRoomView}
              />
              <MainView 
                  company={gameState.company}
                  ticks={gameState.ticks}
                  currentView={currentView}
                  selectedStructure={selectedStructure}
                  selectedRoom={selectedRoom}
                  selectedZone={selectedZone}
                  onStructureClick={setSelectedStructureId}
                  onRoomClick={setSelectedRoomId}
                  onZoneClick={setSelectedZoneId}
                  onOpenModal={openModal}
                  onToggleDeviceGroupStatus={handleToggleDeviceGroupStatus}
                  onHarvest={handleHarvest}
                  onDuplicateRoom={handleDuplicateRoom}
                  onDuplicateZone={handleDuplicateZone}
                  onRenameRoom={handleRenameRoom}
                  onRenameZone={handleRenameZone}
                  onNavigateToZone={handleNavigateToZone}
                  onAssignEmployeeRole={handleAssignEmployeeRole}
              />
            </main>
          ) : (
            <StartScreen 
              onNewGameClick={() => openModal('newGame')}
              onLoadGameClick={() => openModal('load')}
              onImportClick={handleImportClick}
            />
          )}
        </div>
      </div>

      <Modals 
        gameState={gameState}
        selectedRoom={selectedRoom}
        selectedStructure={selectedStructure}
        modalState={modalState}
        formState={formState}
        closeModal={closeModal}
        updateForm={updateForm}
        resetForm={resetForm}
        handlers={{
          handleRentStructure,
          handleAddRoom,
          handleAddZone,
          handleAddDevice,
          handleAddSupply,
          handlePlantStrain,
          handleBreedStrain,
          handleHireEmployee,
          handleRenameItem,
          handleDeleteItem,
          handleResetConfirm,
          handleStartNewGame,
          handleSaveGame,
          handleLoadGame,
          handleDeleteGame,
          handleEditDeviceSettings,
          handleEditLightCycle,
        }}
        dynamicData={{
            saveGames: getSaveGames()
        }}
      />
    </>
  );
};

export default App;