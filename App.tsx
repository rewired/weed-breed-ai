import React, { useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useViewManager } from './hooks/useViewManager';
import { useModals } from './hooks/useModals';

import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import MainView from './views/MainView';
import { Modals } from './components/modals';
import { getBlueprints } from './game/blueprints';

const App = () => {
  const { gameState, isLoading, isSimRunning, setIsSimRunning, updateGameState, resetGame } = useGameState();
  const { selectedStructureId, selectedRoomId, setSelectedStructureId, setSelectedRoomId, handleBack, goToRoot } = useViewManager();

  const selectedStructure = selectedStructureId && gameState ? gameState.company.structures[selectedStructureId] : null;
  const selectedRoom = selectedStructure && selectedRoomId ? selectedStructure.rooms[selectedRoomId] : null;
  
  const { modalState, formState, openModal, closeModal, updateForm, resetForm } = useModals({
    selectedStructure,
    selectedRoom,
  });
  
  //--- Action Handlers ---//
  // These handlers are defined here, in the orchestrator component, because they
  // often need to combine actions from multiple domains (e.g., game state, view state, and modal state).

  const handleRentStructure = useCallback(() => {
    if (!gameState || !formState.selectedStructureBlueprintId) return;
    // FIX: The rentStructure method expects a StructureBlueprint object, not an ID.
    // We fetch the blueprint object using the ID from the form state.
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
    if (!gameState || !selectedRoom || !modalState.activeZoneId || !formState.selectedDeviceBlueprintId) return;
    const zone = selectedRoom.zones[modalState.activeZoneId];
    if (!zone) return;
    
    const success = gameState.company.purchaseDeviceForZone(formState.selectedDeviceBlueprintId, zone);
    if (success) {
      updateGameState();
      closeModal('addDevice');
    }
  }, [gameState, selectedRoom, modalState.activeZoneId, formState.selectedDeviceBlueprintId, updateGameState, closeModal]);


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


  const handleResetConfirm = useCallback(() => {
    resetGame();
    goToRoot();
    closeModal('reset');
  }, [resetGame, goToRoot, closeModal]);


  //--- Render ---//

  if (isLoading || !gameState) {
    return <div className="loading-screen">Loading Game...</div>;
  }

  return (
    <>
      <Dashboard 
        capital={gameState.company.capital}
        ticks={gameState.ticks}
        isSimRunning={isSimRunning}
        onStart={() => setIsSimRunning(true)}
        onPause={() => setIsSimRunning(false)}
        onReset={() => openModal('reset')}
      />
      <main>
        <Navigation
          structure={selectedStructure}
          room={selectedRoom}
          onBack={handleBack}
          onRootClick={goToRoot}
        />
        <MainView 
            company={gameState.company}
            selectedStructure={selectedStructure}
            selectedRoom={selectedRoom}
            onStructureClick={setSelectedStructureId}
            onRoomClick={setSelectedRoomId}
            onOpenModal={openModal}
        />
      </main>

      <Modals 
        gameState={gameState}
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
          handleRenameItem,
          handleDeleteItem,
          handleResetConfirm,
        }}
      />
    </>
  );
};

export default App;
