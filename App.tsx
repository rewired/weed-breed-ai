import React, { useCallback, useState } from 'react';
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
  } = useGameState();

  const { selectedStructureId, selectedRoomId, setSelectedStructureId, setSelectedRoomId, handleBack, goToRoot, goToStructureView } = useViewManager();

  const selectedStructure = selectedStructureId && gameState ? gameState.company.structures[selectedStructureId] : null;
  const selectedRoom = selectedStructure && selectedRoomId ? selectedStructure.rooms[selectedRoomId] : null;
  
  const { modalState, formState, openModal, closeModal, updateForm, resetForm } = useModals({
    selectedStructure,
    selectedRoom,
    gameState,
  });
  
  //--- Action Handlers ---//

  const handleStartNewGame = useCallback(() => {
    if (!formState.newCompanyName) {
      alert("Please enter a company name.");
      return;
    }
    startNewGame(formState.newCompanyName);
    closeModal('newGame');
  }, [formState.newCompanyName, startNewGame, closeModal]);

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
    if (!gameState || !selectedRoom || !modalState.activeZoneId || !formState.selectedDeviceBlueprintId || !formState.deviceQuantity) return;
    const zone = selectedRoom.zones[modalState.activeZoneId];
    if (!zone) return;
    
    const success = gameState.company.purchaseDevicesForZone(formState.selectedDeviceBlueprintId, zone, formState.deviceQuantity);
    if (success) {
      updateGameState();
      closeModal('addDevice');
    }
  }, [gameState, selectedRoom, modalState.activeZoneId, formState.selectedDeviceBlueprintId, formState.deviceQuantity, updateGameState, closeModal]);

  const handlePlantStrain = useCallback(() => {
    if (!gameState || !selectedRoom || !modalState.activeZoneId || !formState.plantStrainId || formState.plantQuantity <= 0) return;
    
    const zone = selectedRoom.zones[modalState.activeZoneId];
    if (!zone) {
        console.error(`Zone with id ${modalState.activeZoneId} not found in room ${selectedRoom.id}`);
        return;
    }

    const success = zone.plantStrain(formState.plantStrainId, formState.plantQuantity, gameState.company);
    
    if (success) {
        updateGameState();
        closeModal('plantStrain');
    }
}, [gameState, selectedRoom, modalState.activeZoneId, formState.plantStrainId, formState.plantQuantity, updateGameState, closeModal]);

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

  const handleDeleteItem = useCallback(() => {
    if (!gameState || !modalState.itemToDelete) return;
    const { type, id } = modalState.itemToDelete;

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
    }

    updateGameState();
    closeModal('delete');
  }, [gameState, modalState.itemToDelete, selectedStructureId, selectedRoomId, selectedStructure, selectedRoom, goToRoot, setSelectedRoomId, updateGameState, closeModal]);

  const handleToggleDeviceGroupStatus = useCallback((zoneId: string, blueprintId: string) => {
    if (!selectedRoom) return;
    const zone = selectedRoom.zones[zoneId];
    if (zone) {
        zone.toggleDeviceGroupStatus(blueprintId);
        updateGameState();
    }
  }, [selectedRoom, updateGameState]);

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
          />
          <main>
            <Navigation
              structure={selectedStructure}
              room={selectedRoom}
              onBack={handleBack}
              onRootClick={goToRoot}
              onStructureClick={goToStructureView}
            />
            <MainView 
                company={gameState.company}
                selectedStructure={selectedStructure}
                selectedRoom={selectedRoom}
                onStructureClick={setSelectedStructureId}
                onRoomClick={setSelectedRoomId}
                onOpenModal={openModal}
                onToggleDeviceGroupStatus={handleToggleDeviceGroupStatus}
            />
          </main>
        </>
      ) : (
        <StartScreen 
          onNewGameClick={() => openModal('newGame')}
          onLoadGameClick={() => openModal('load')}
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
        }}
        dynamicData={{
            saveGames: getSaveGames()
        }}
      />
    </>
  );
};

export default App;