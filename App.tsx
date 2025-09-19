import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useViewManager } from './hooks/useViewManager';
import { useModals } from './hooks/useModals';

import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import MainView from './views/MainView';
import { Modals } from './components/modals';
import StartScreen from './views/StartScreen';
import {
  getDashboardStatus,
  getFinanceSummary,
} from '@/src/game/api';
import type {
  AlertSummaryDTO,
  StructureSummaryDTO,
  RoomSummaryDTO,
  ZoneSummaryDTO,
  FinanceSummaryDTO,
  DashboardStatusDTO,
} from '@/src/game/api';

const App = () => {
  const {
    gameState,
    telemetry,
    isLoading,
    isSimRunning,
    setIsSimRunning,
    gameSpeed,
    setGameSpeed,
    // Game Actions from Hook
    startNewGame,
    saveGame,
    loadGame,
    deleteGame,
    getSaveGames,
    resetGame,
    exportGame,
    importGame,
    rentStructure,
    addRoom,
    addZone,
    purchaseDevicesForZone,
    purchaseSuppliesForZone,
    purchaseSeedsAndPlant,
    breedStrain,
    hireEmployee,
    assignEmployeeRole,
    acceptRaise,
    offerBonus,
    declineRaise,
    setPlantingPlan,
    setOvertimePolicy,
    renameItem,
    editDeviceGroupSettings,
    editLightCycle,
    deleteItem,
    toggleDeviceGroupStatus,
    harvest,
    duplicateRoom,
    duplicateZone,
    acknowledgeAlert,
    toggleAutoReplant,
    deletePlantingPlan,
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
    const currentAlertKeys = new Set(gameState.company.alerts.map(a => a.id));
    const previousAlertKeys = previousAlertsRef.current;
    
    let isNewAlertTriggered = false;
    for (const key of currentAlertKeys) {
        if (!previousAlertKeys.has(key)) {
            const alert = gameState.company.alerts.find(a => a.id === key);
            if (alert && !alert.isAcknowledged) {
              isNewAlertTriggered = true;
              break;
            }
        }
    }
    if (isNewAlertTriggered && isSimRunning) {
        setIsSimRunning(false);
    }
    previousAlertsRef.current = currentAlertKeys;
  }, [gameState, isSimRunning, setIsSimRunning]);


  const selectedStructure = selectedStructureId && gameState ? gameState.company.structures[selectedStructureId] : null;
  const selectedRoom = selectedStructure && selectedRoomId ? selectedStructure.rooms[selectedRoomId] : null;
  const selectedZone = selectedRoom && selectedZoneId ? selectedRoom.zones[selectedZoneId] : null;

  const selectedStructureSummary: StructureSummaryDTO | null = selectedStructure
    ? { id: selectedStructure.id, name: selectedStructure.name }
    : null;
  const selectedRoomSummary: RoomSummaryDTO | null = selectedRoom
    ? { id: selectedRoom.id, name: selectedRoom.name, structureId: selectedStructure?.id ?? '' }
    : null;
  const selectedZoneSummary: ZoneSummaryDTO | null = selectedZone
    ? { id: selectedZone.id, name: selectedZone.name, roomId: selectedRoom?.id ?? '' }
    : null;
  
  const { modalState, formState, openModal, closeModal, updateForm, resetForm } = useModals({
    selectedStructure,
    selectedRoom,
    gameState,
    isSimRunning,
    setIsSimRunning,
  });
  
  //--- UI Action Handlers ---//
  const handleFinancesClick = useCallback(() => setCurrentView(prev => prev === 'finances' ? 'structures' : 'finances'), [setCurrentView]);
  const handlePersonnelClick = useCallback(() => setCurrentView(prev => prev === 'personnel' ? 'structures' : 'personnel'), [setCurrentView]);
  const handleImportClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') importGame(e.target.result);
    };
    reader.onerror = (e) => {
      console.error("Failed to read file:", e);
      alert("Error reading file.");
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [importGame]);

  const handleNavigateToAlert = useCallback((alert: AlertSummaryDTO) => {
    if (!gameState) return;
    acknowledgeAlert(alert.id);

    if (alert.type === 'raise_request' && alert.context && typeof alert.context === 'object') {
        const { employeeId, newSalary } = alert.context as { employeeId?: string; newSalary?: number };
        if (employeeId) {
            const employee = gameState.company.employees[employeeId];
            if (employee && typeof newSalary === 'number') {
                const bonus = (newSalary - employee.salaryPerDay) * 45;
                openModal('negotiateSalary', { itemToNegotiate: { employee, newSalary, bonus } });
            }
        }
    } else if (alert.type === 'employee_quit') {
        setCurrentView('personnel');
    } else if (alert.location) {
        setSelectedStructureId(alert.location.structureId);
        setSelectedRoomId(alert.location.roomId);
        setSelectedZoneId(alert.location.zoneId);
    }
  }, [gameState, openModal, setSelectedStructureId, setSelectedRoomId, setSelectedZoneId, setCurrentView, acknowledgeAlert]);

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

  if (isLoading) {
    return <div className="loading-screen">Loading Game...</div>;
  }

  const isAnyModalOpen = Object.values(modalState).some(v => typeof v === 'boolean' && v);
  const isBlurred = isGameMenuOpen || isAnyModalOpen;

  const dashboardAlerts: AlertSummaryDTO[] = gameState
    ? gameState.company.alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        location: alert.location
          ? {
              structureId: alert.location.structureId,
              roomId: alert.location.roomId,
              zoneId: alert.location.zoneId,
            }
          : undefined,
        isAcknowledged: alert.isAcknowledged,
        context: alert.context,
      }))
    : [];

  const latestSimTick = telemetry.simTick;
  const dashboardStatus: DashboardStatusDTO = getDashboardStatus(gameState, latestSimTick);
  const financeSummary: FinanceSummaryDTO | null = getFinanceSummary(gameState);

  return (
    <>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json,application/json" onChange={handleFileSelect} />
      <div className="app-container">
        {gameState && (
          <Dashboard
            status={dashboardStatus}
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
            alerts={dashboardAlerts}
            onNavigateToAlert={handleNavigateToAlert}
            onAcknowledgeAlert={acknowledgeAlert}
            onGameMenuToggle={setGameMenuOpen}
          />
        )}
        <div className={`content-area ${isBlurred ? 'blurred' : ''}`}>
          {gameState ? (
            <main>
              <Navigation
                structure={selectedStructureSummary}
                room={selectedRoomSummary}
                zone={selectedZoneSummary}
                onBack={handleBack}
                onRootClick={goToRoot}
                onStructureClick={goToStructureView}
                onRoomClick={goToRoomView}
              />
              <MainView
                  company={gameState.company}
                  ticks={gameState.ticks}
                  financeSummary={financeSummary}
                  currentView={currentView}
                  selectedStructure={selectedStructure}
                  selectedRoom={selectedRoom}
                  selectedZone={selectedZone}
                  onStructureClick={setSelectedStructureId}
                  onRoomClick={setSelectedRoomId}
                  onZoneClick={setSelectedZoneId}
                  onOpenModal={openModal}
                  onToggleDeviceGroupStatus={toggleDeviceGroupStatus}
                  onHarvest={harvest}
                  onDuplicateRoom={duplicateRoom}
                  onDuplicateZone={duplicateZone}
                  onRenameRoom={(id, name) => renameItem('room', id, name)}
                  onRenameZone={(id, name) => renameItem('zone', id, name)}
                  onNavigateToZone={handleNavigateToZone}
                  onAssignEmployeeRole={assignEmployeeRole}
                  onSetOvertimePolicy={setOvertimePolicy}
                  onToggleAutoReplant={toggleAutoReplant}
                  onDeletePlantingPlan={deletePlantingPlan}
              />
            </main>
          ) : (
            <StartScreen onNewGameClick={() => openModal('newGame')} onLoadGameClick={() => openModal('load')} onImportClick={handleImportClick} />
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
        handlers={{
          handleStartNewGame: () => startNewGame(formState.newCompanyName, formState.seed ? parseInt(formState.seed, 10) : undefined).then(() => closeModal('newGame')),
          handleSaveGame: () => { saveGame(formState.saveGameName); closeModal('save'); },
          handleLoadGame: (name) => { loadGame(name); closeModal('load'); },
          handleDeleteGame: (name) => { deleteGame(name); closeModal('load'); openModal('load'); },
          handleRentStructure: () => { if(rentStructure(formState.selectedStructureBlueprintId)) closeModal('rent'); },
          handleAddRoom: () => { if(addRoom(selectedStructureId, formState.newItemName, formState.newItemArea, formState.newRoomPurpose)) closeModal('addRoom'); },
          handleAddZone: () => { if(addZone(selectedRoomId, formState.newItemName, formState.newItemArea, formState.newZoneCultivationMethodId)) closeModal('addZone'); },
          handleAddDevice: () => { if(purchaseDevicesForZone(modalState.activeZoneId, formState.selectedDeviceBlueprintId, formState.deviceQuantity)) closeModal('addDevice'); },
          handleAddSupply: () => { if(purchaseSuppliesForZone(modalState.activeZoneId, formState.supplyType, formState.supplyQuantity)) closeModal('addSupply'); },
          handlePlantStrain: () => { 
            const result = purchaseSeedsAndPlant(modalState.activeZoneId, formState.plantStrainId, formState.plantQuantity);
            if(result) {
              closeModal('plantStrain');
              alert(`Successfully planted. ${result.germinatedCount} of ${formState.plantQuantity} seeds germinated.`);
            }
          },
          handleBreedStrain: () => { if(breedStrain(formState.parentAId, formState.parentBId, formState.newStrainName)) closeModal('breedStrain'); },
          handleHireEmployee: () => { if(hireEmployee(modalState.itemToHire, formState.hireStructureId)) closeModal('hireEmployee'); },
          handleAcceptRaise: () => { if(acceptRaise(modalState.itemToNegotiate.employee.id, modalState.itemToNegotiate.newSalary)) closeModal('negotiateSalary'); },
          handleOfferBonus: () => { if(offerBonus(modalState.itemToNegotiate.employee.id, modalState.itemToNegotiate.bonus)) closeModal('negotiateSalary'); },
          handleDeclineRaise: () => { if(declineRaise(modalState.itemToNegotiate.employee.id)) closeModal('negotiateSalary'); },
          handleSetPlantingPlan: (isDelete = false) => {
            if (isDelete) {
              if (setPlantingPlan(modalState.activeZoneId, null)) closeModal('plantingPlan');
            } else {
              const plan = { strainId: formState.plantStrainId, quantity: formState.plantQuantity, autoReplant: formState.plantingPlanAutoReplant };
              if (setPlantingPlan(modalState.activeZoneId, plan)) closeModal('plantingPlan');
            }
          },
          handleRenameItem: () => { if(renameItem(modalState.itemToRename.type, modalState.itemToRename.id, formState.renameValue)) closeModal('rename'); },
          handleEditDeviceSettings: () => {
            const settings = {
              targetTemperature: formState.deviceTargetTemp,
              targetHumidity: formState.deviceTargetHumidity !== null ? formState.deviceTargetHumidity / 100 : null,
              targetCO2: formState.deviceTargetCO2,
            };
            if (editDeviceGroupSettings(modalState.itemToEdit.context.zoneId, modalState.itemToEdit.blueprintId, settings)) closeModal('editDevice');
          },
          handleEditLightCycle: () => {
            const newCycle = { on: formState.lightCycleOnHours, off: 24 - formState.lightCycleOnHours };
            if(editLightCycle(modalState.activeZoneId, newCycle)) closeModal('editLightCycle');
          },
          handleDeleteItem: () => { if(deleteItem(modalState.itemToDelete)) closeModal('delete'); },
          handleResetConfirm: () => { resetGame(); goToRoot(); closeModal('reset'); },
        }}
        dynamicData={{ saveGames: getSaveGames() }}
      />
    </>
  );
};

export default App;