import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { GameState, Structure, Room } from './game/types';
import { roomPurposes, RoomPurpose } from './game/roomPurposes';
import { initialGameState, gameTick } from './game/engine';
import { loadAllBlueprints, getBlueprints } from './game/blueprints';
import Dashboard from './components/Dashboard';
import Structures from './components/Structures';
import Modal from './components/Modal';
import Navigation from './components/Navigation';
import StructureDetail from './components/StructureDetail';
import RoomDetail from './components/RoomDetail';

const SAVE_GAME_KEY = 'growtopia-game-state';
const TICK_INTERVAL = 5000; // 5 seconds

const App = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimRunning, setIsSimRunning] = useState(false);
  
  // View state
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Modal state
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemArea, setNewItemArea] = useState(10);
  const [newRoomPurpose, setNewRoomPurpose] = useState<RoomPurpose>('growroom');
  const [renameValue, setRenameValue] = useState('');
  const [itemToRename, setItemToRename] = useState<{ type: 'structure' | 'room' | 'zone', id: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'structure' | 'room' | 'zone', id: string, name: string } | null>(null);
  const [selectedStructureBlueprintId, setSelectedStructureBlueprintId] = useState<string | null>(null);


  // Load blueprints and game state from localStorage on initial render
  useEffect(() => {
    const loadGame = async () => {
      try {
        await loadAllBlueprints();
        const savedState = localStorage.getItem(SAVE_GAME_KEY);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          // Migration logic for room purpose
          if (parsedState.company && parsedState.company.structures) {
            Object.values(parsedState.company.structures).forEach((structure: any) => {
              if (structure.rooms) {
                Object.values(structure.rooms).forEach((room: any) => {
                  if (!room.purpose) {
                    room.purpose = 'growroom'; // Default purpose for old saves
                  }
                });
              }
            });
          }
          setGameState(parsedState);
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
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameState));
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
  
  const handleOpenRentModal = () => {
    const blueprints = getBlueprints().structures;
    const blueprintIds = Object.keys(blueprints);
    if (blueprintIds.length > 0) {
      setSelectedStructureBlueprintId(blueprintIds[0]);
    }
    setIsRentModalOpen(true);
  };

  const handleRentStructure = useCallback(() => {
    if (!selectedStructureBlueprintId) {
      alert("Please select a structure type.");
      return;
    }
    
    const blueprint = getBlueprints().structures[selectedStructureBlueprintId];
    if (!blueprint) {
      console.error(`Could not find blueprint for: ${selectedStructureBlueprintId}`);
      alert("An error occurred. Could not find the selected structure type.");
      return;
    }

    const upfrontFee = blueprint.upfrontFee;

    setGameState(prevState => {
      if (!prevState) return null;
      
      if (prevState.company.capital < upfrontFee) {
        alert("Not enough capital for the upfront fee!");
        return prevState;
      }
      
      const newStructureId = `structure-${Date.now()}`;
      const area = blueprint.footprint.length_m * blueprint.footprint.width_m;
      const newStructure: Omit<Structure, 'rentalCostPerSqmPerTick'> & { blueprintId: string } = {
        id: newStructureId,
        blueprintId: blueprint.id,
        name: `${blueprint.name} #${Object.keys(prevState.company.structures).length + 1}`,
        area_m2: area,
        rooms: {},
      };

      return {
        ...prevState,
        company: {
          ...prevState.company,
          capital: prevState.company.capital - upfrontFee,
          structures: {
            ...prevState.company.structures,
            [newStructureId]: newStructure,
          },
        },
      };
    });
    setIsRentModalOpen(false);
  }, [selectedStructureBlueprintId]);

  const handleAddRoom = useCallback(() => {
    if (!selectedStructureId || !newItemName || newItemArea <= 0) return;

    setGameState(prevState => {
      if (!prevState) return null;
      
      const structure = prevState.company.structures[selectedStructureId];
      const usedArea = Object.values(structure.rooms).reduce((sum, room) => sum + room.area_m2, 0);
      if (newItemArea > structure.area_m2 - usedArea) {
        alert("Not enough space in the structure!");
        return prevState;
      }

      const newRoomId = `room-${Date.now()}`;
      const newRoom: Room = { id: newRoomId, name: newItemName, area_m2: newItemArea, purpose: newRoomPurpose, zones: {} };

      const newState: GameState = {
        ...prevState,
        company: {
          ...prevState.company,
          structures: {
            ...prevState.company.structures,
            [selectedStructureId]: {
              ...structure,
              rooms: {
                ...structure.rooms,
                [newRoomId]: newRoom,
              },
            },
          },
        },
      };
      return newState;
    });
    
    setIsAddRoomModalOpen(false);
    setNewItemName('');
    setNewItemArea(10);
  }, [selectedStructureId, newItemName, newItemArea, newRoomPurpose]);
  
  const handleAddZone = useCallback(() => {
    if (!selectedStructureId || !selectedRoomId || !newItemName || newItemArea <= 0) return;

    setGameState(prevState => {
      if (!prevState) return null;

      const structure = prevState.company.structures[selectedStructureId];
      const room = structure.rooms[selectedRoomId];
      const usedArea = Object.values(room.zones).reduce((sum, zone) => sum + zone.area_m2, 0);
      if (newItemArea > room.area_m2 - usedArea) {
        alert("Not enough space in the room!");
        return prevState;
      }

      const newZoneId = `zone-${Date.now()}`;
      const newZone = { id: newZoneId, name: newItemName, area_m2: newItemArea, plants: {}, devices: {}, currentEnvironment: {} };

      const newState = JSON.parse(JSON.stringify(prevState)); // Deep copy for simplicity
      newState.company.structures[selectedStructureId].rooms[selectedRoomId].zones[newZoneId] = newZone;
      return newState;
    });

    setIsAddZoneModalOpen(false);
    setNewItemName('');
    setNewItemArea(10);
  }, [selectedStructureId, selectedRoomId, newItemName, newItemArea]);

  const handleResetConfirm = useCallback(() => {
    setIsSimRunning(false);
    localStorage.removeItem(SAVE_GAME_KEY);
    setGameState(initialGameState());
    setSelectedStructureId(null);
    setSelectedRoomId(null);
    setIsResetModalOpen(false);
  }, []);

  const handleOpenRenameModal = useCallback((type: 'structure' | 'room' | 'zone', id: string, currentName: string) => {
    setItemToRename({ type, id });
    setRenameValue(currentName);
    setIsRenameModalOpen(true);
  }, []);

  const handleRenameItem = useCallback(() => {
    if (!itemToRename || !renameValue.trim()) return;

    setGameState(prevState => {
      if (!prevState) return null;
      const newState = JSON.parse(JSON.stringify(prevState)); // Deep copy for simplicity
      
      const { type, id } = itemToRename;

      if (type === 'structure' && newState.company.structures[id]) {
        newState.company.structures[id].name = renameValue;
      } else if (type === 'room' && selectedStructureId && newState.company.structures[selectedStructureId]?.rooms[id]) {
        newState.company.structures[selectedStructureId].rooms[id].name = renameValue;
      } else if (type === 'zone' && selectedStructureId && selectedRoomId && newState.company.structures[selectedStructureId]?.rooms[selectedRoomId]?.zones[id]) {
        newState.company.structures[selectedStructureId].rooms[selectedRoomId].zones[id].name = renameValue;
      }
      
      return newState;
    });

    setIsRenameModalOpen(false);
    setItemToRename(null);
    setRenameValue('');
  }, [itemToRename, renameValue, selectedStructureId, selectedRoomId]);

  const handleOpenDeleteModal = useCallback((type: 'structure' | 'room' | 'zone', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteItemConfirm = useCallback(() => {
    if (!itemToDelete) return;

    setGameState(prevState => {
      if (!prevState) return null;
      const newState = JSON.parse(JSON.stringify(prevState)); // Deep copy for simplicity
      const { type, id } = itemToDelete;

      if (type === 'structure') {
        delete newState.company.structures[id];
        if (id === selectedStructureId) {
          setSelectedStructureId(null);
          setSelectedRoomId(null);
        }
      } else if (type === 'room' && selectedStructureId) {
        delete newState.company.structures[selectedStructureId].rooms[id];
        if (id === selectedRoomId) {
          setSelectedRoomId(null);
        }
      } else if (type === 'zone' && selectedStructureId && selectedRoomId) {
        delete newState.company.structures[selectedStructureId].rooms[selectedRoomId].zones[id];
      }

      return newState;
    });

    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, selectedStructureId, selectedRoomId]);


  const handleBack = () => {
    if (selectedRoomId) {
      setSelectedRoomId(null);
    } else if (selectedStructureId) {
      setSelectedStructureId(null);
    }
  };
  
  const resetForm = () => {
    setNewItemName('');
    setNewItemArea(10);
    setNewRoomPurpose('growroom');
  }

  if (isLoading || !gameState) {
    return <div className="loading-screen">Loading Game...</div>;
  }

  const selectedStructure = selectedStructureId ? gameState.company.structures[selectedStructureId] : null;
  const selectedRoom = selectedStructure && selectedRoomId ? selectedStructure.rooms[selectedRoomId] : null;

  let currentView;
  if (selectedStructure && selectedRoom) {
      currentView = <RoomDetail 
        room={selectedRoom} 
        onAddZoneClick={() => setIsAddZoneModalOpen(true)}
        onRenameRoomClick={(id, name) => handleOpenRenameModal('room', id, name)}
        onRenameZoneClick={(id, name) => handleOpenRenameModal('zone', id, name)}
        onDeleteRoomClick={(id, name) => handleOpenDeleteModal('room', id, name)}
        onDeleteZoneClick={(id, name) => handleOpenDeleteModal('zone', id, name)}
      />;
  } else if (selectedStructure) {
      currentView = <StructureDetail 
        structure={selectedStructure} 
        onRoomClick={setSelectedRoomId} 
        onAddRoomClick={() => setIsAddRoomModalOpen(true)}
        onRenameClick={(id, name) => handleOpenRenameModal('structure', id, name)}
        onDeleteStructureClick={(id, name) => handleOpenDeleteModal('structure', id, name)}
        onDeleteRoomClick={(id, name) => handleOpenDeleteModal('room', id, name)}
      />;
  } else {
      currentView = <Structures structures={Object.values(gameState.company.structures)} onStructureClick={setSelectedStructureId} onRentClick={handleOpenRentModal} />;
  }
  
  const renderRentModalContent = () => {
    const structureBlueprints = getBlueprints().structures;
    const blueprintOptions = Object.values(structureBlueprints);

    const selectedBlueprint = selectedStructureBlueprintId ? structureBlueprints[selectedStructureBlueprintId] : null;

    if (!selectedBlueprint) {
      return (
        <>
          <h2>Rent New Structure</h2>
          <p className="placeholder-text">No structure types available.</p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setIsRentModalOpen(false)}>Close</button>
          </div>
        </>
      );
    }

    const area = selectedBlueprint.footprint.length_m * selectedBlueprint.footprint.width_m;
    const monthlyRent = area * selectedBlueprint.rentalCostPerSqmPerMonth;
    
    return (
        <>
            <h2>Rent New Structure</h2>
            <p>Choose a structure to expand your operations.</p>
            <div className="form-group">
              <label htmlFor="structureBlueprint">Structure Type</label>
              <select id="structureBlueprint" value={selectedStructureBlueprintId || ''} onChange={(e) => setSelectedStructureBlueprintId(e.target.value)}>
                {blueprintOptions.map((bp) => (
                  <option key={bp.id} value={bp.id}>{bp.name}</option>
                ))}
              </select>
            </div>
            <ul>
                <li><strong>Dimensions:</strong> {selectedBlueprint.footprint.length_m}m x {selectedBlueprint.footprint.width_m}m</li>
                <li><strong>Area:</strong> {area} m²</li>
                <li><strong>Upfront Fee:</strong> ${selectedBlueprint.upfrontFee.toLocaleString()}</li>
                <li><strong>Monthly Rent:</strong> ${monthlyRent.toLocaleString()}</li>
            </ul>
            <p>The upfront fee will be deducted immediately. The rent will be deducted from your capital over time.</p>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setIsRentModalOpen(false)}>Cancel</button>
                <button className="btn" onClick={handleRentStructure}>Confirm & Rent</button>
            </div>
        </>
    );
  };
  
  return (
    <>
      <Dashboard 
        capital={gameState.company.capital}
        ticks={gameState.ticks}
        isSimRunning={isSimRunning}
        onStart={() => setIsSimRunning(true)}
        onPause={() => setIsSimRunning(false)}
        onReset={() => setIsResetModalOpen(true)}
      />
      <main>
        <Navigation
          structure={selectedStructure}
          room={selectedRoom}
          onBack={handleBack}
          onRootClick={() => {
            setSelectedStructureId(null);
            setSelectedRoomId(null);
          }}
        />
        {currentView}
      </main>

      {/* Modals */}
      <Modal isOpen={isRentModalOpen} onClose={() => setIsRentModalOpen(false)}>
        {renderRentModalContent()}
      </Modal>

      <Modal isOpen={isAddRoomModalOpen} onClose={() => { setIsAddRoomModalOpen(false); resetForm(); }}>
        <h2>Add New Room</h2>
        <p>Divide your structure into rooms. The total area of all rooms cannot exceed the structure's area.</p>
        <div className="form-group">
          <label htmlFor="roomName">Room Name</label>
          <input id="roomName" type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g., Grow Room A" />
        </div>
        <div className="form-group">
          <label htmlFor="roomArea">Area (m²)</label>
          <input id="roomArea" type="number" value={newItemArea} onChange={(e) => setNewItemArea(Number(e.target.value))} min="1" />
        </div>
        <div className="form-group">
          <label htmlFor="roomPurpose">Purpose</label>
          <select id="roomPurpose" value={newRoomPurpose} onChange={(e) => setNewRoomPurpose(e.target.value as RoomPurpose)}>
            {roomPurposes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => { setIsAddRoomModalOpen(false); resetForm(); }}>Cancel</button>
          <button className="btn" onClick={handleAddRoom}>Create Room</button>
        </div>
      </Modal>

      <Modal isOpen={isAddZoneModalOpen} onClose={() => { setIsAddZoneModalOpen(false); resetForm(); }}>
        <h2>Add New Zone</h2>
        <p>Divide your room into zones for cultivation. The total area of all zones cannot exceed the room's area.</p>
        <div className="form-group">
          <label htmlFor="zoneName">Zone Name</label>
          <input id="zoneName" type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g., Veg Zone 1" />
        </div>
        <div className="form-group">
          <label htmlFor="zoneArea">Area (m²)</label>
          <input id="zoneArea" type="number" value={newItemArea} onChange={(e) => setNewItemArea(Number(e.target.value))} min="1" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => { setIsAddZoneModalOpen(false); resetForm(); }}>Cancel</button>
          <button className="btn" onClick={handleAddZone}>Create Zone</button>
        </div>
      </Modal>

       <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)}>
        <h2>Reset Simulation</h2>
        <p>Are you sure you want to reset the game? All your progress will be permanently lost.</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleResetConfirm}>Reset Game</button>
        </div>
      </Modal>

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)}>
        <h2>Rename Item</h2>
        <div className="form-group">
          <label htmlFor="renameInput">New Name</label>
          <input id="renameInput" type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setIsRenameModalOpen(false)}>Cancel</button>
          <button className="btn" onClick={handleRenameItem}>Save</button>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <h2>Confirm Deletion</h2>
        <p>Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDeleteItemConfirm}>Delete</button>
        </div>
      </Modal>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);