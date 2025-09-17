import React, { useCallback, useState, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { useViewManager } from './hooks/useViewManager';
import { useModals } from './hooks/useModals';

import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import MainView from './views/MainView';
import { Modals } from './components/modals';
import { getAvailableStrains, getBlueprints } from './game/blueprints';
import StartScreen from './views/StartScreen';

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
  } = useViewManager();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStructure = selectedStructureId && gameState ? gameState.company.structures[selectedStructureId] : null;
  const selectedRoom = selectedStructure && selectedRoomId ? selectedStructure.rooms[selectedRoomId] : null;
  const selectedZone = selectedRoom && selectedZoneId ? selectedRoom.zones[selectedZoneId] : null;
  
  const { modalState, formState, openModal, closeModal, updateForm, resetForm } = useModals({
    selectedStructure,
    selectedRoom,
    gameState,
    isSimRunning,
    setIsSimRunning,
  });
  
  //--- Action Handlers ---//
  
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


  const handleStartNewGame = useCallback(() => {
    if (!formState.newCompanyName) {
      alert("Please enter a company name.");
      return;
    }
    const seed = formState.seed ? parseInt(formState.seed, 10) : undefined;
    if (formState.seed && isNaN(seed)) {
      alert("Seed must be a number.");
      return;
    }
    startNewGame(formState.newCompanyName, seed);
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

  const handlePlantStrain = useCallback(() => {
    if (!gameState || !modalState.activeZoneId || !formState.plantStrainId || formState.plantQuantity <= 0) return;
    
    const room = Object.values(gameState.company.structures).flatMap(s => Object.values(s.rooms)).find(r => r.zones[modalState.activeZoneId]);
    const zone = room?.zones[modalState.activeZoneId];
    if (!zone) {
        console.error(`Zone with id ${modalState.activeZoneId} not found`);
        return;
    }

    const success = zone.plantStrain(formState.plantStrainId, formState.plantQuantity, gameState.company);
    
    if (success) {
        updateGameState();
        closeModal('plantStrain');
    }
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

  const handleResetConfirm = useCallback(() => {
    resetGame();
    goToRoot();
    closeModal('reset');
  }, [resetGame, goToRoot, closeModal]);


  //--- Render ---//

  if (isLoading) {
    return <div className="loading-screen">Loading Game...</div>;
  }

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json,application/json" 
        onChange={handleFileSelect} 
      />
      {gameState ? (
        <>
          <Dashboard 
            capital={gameState.company.capital}
            ticks={gameState.ticks}
            isSimRunning={isSimRunning}
            onStart={() => setIsSimRunning(true)}
            onPause={() => setIsSimRunning(false)}
            onReset={() => openModal('reset')}
            onSaveClick={() => openModal('save')}
            onLoadClick={() => openModal('load')}
            onExportClick={exportGame}
            gameSpeed={gameSpeed}
            onSetGameSpeed={setGameSpeed}
          />
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
                selectedStructure={selectedStructure}
                selectedRoom={selectedRoom}
                selectedZone={selectedZone}
                onStructureClick={setSelectedStructureId}
                onRoomClick={setSelectedRoomId}
                onZoneClick={setSelectedZoneId}
                onOpenModal={openModal}
                onToggleDeviceGroupStatus={handleToggleDeviceGroupStatus}
            />
          </main>
        </>
      ) : (
        <StartScreen 
          onNewGameClick={() => openModal('newGame')}
          onLoadGameClick={() => openModal('load')}
          onImportClick={handleImportClick}
        />
      )}

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
          handlePlantStrain,
          handleBreedStrain,
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