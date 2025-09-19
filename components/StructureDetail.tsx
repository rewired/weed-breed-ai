import React, { useState } from 'react';
import {
  Company,
  Room,
  Structure,
  roomPurposes,
  getAvailableStrains,
} from '@/src/game/api';

interface StructureDetailProps {
  structure: Structure;
  company: Company;
  onAddRoomClick: () => void;
  onRoomClick: (id: string) => void;
  onRenameClick: (id: string, name: string) => void;
  onDeleteStructureClick: (id: string, name: string) => void;
  onDeleteRoomClick: (id: string, name: string) => void;
  onDuplicateRoom: (structureId: string, roomId: string) => void;
  onRenameRoom: (roomId: string, newName: string) => void;
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

const StructureDetail: React.FC<StructureDetailProps> = ({ structure, company, onAddRoomClick, onRoomClick, onRenameClick, onDeleteStructureClick, onDeleteRoomClick, onDuplicateRoom, onRenameRoom }) => {
  const [renamingRoomId, setRenamingRoomId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const rooms = Object.values(structure.rooms);
  const usedArea = rooms.reduce((sum, room) => sum + room.area_m2, 0);
  const availableArea = structure.area_m2 - usedArea;
  const allStrains = getAvailableStrains(company);

  const handleStartRename = (room: Room) => {
    setRenamingRoomId(room.id);
    setRenameValue(room.name);
  };

  const handleCancelRename = () => {
    setRenamingRoomId(null);
    setRenameValue('');
  };

  const handleConfirmRename = () => {
    if (renamingRoomId && renameValue.trim()) {
      onRenameRoom(renamingRoomId, renameValue.trim());
    }
    handleCancelRename();
  };
  
  const handleRenameInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConfirmRename();
    } else if (event.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <div>
          <div className="content-panel__title-group">
            <h2>{structure.name}</h2>
            <button className="btn-action-icon" onClick={() => onRenameClick(structure.id, structure.name)} title="Rename Structure" aria-label="Rename Structure">
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button className="btn-action-icon delete" onClick={() => onDeleteStructureClick(structure.id, structure.name)} title="Delete Structure" aria-label="Delete Structure">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
          <p>
            {usedArea} / {structure.area_m2} m² used ({availableArea} m² available)
          </p>
        </div>
        <button 
          className="btn" 
          onClick={onAddRoomClick} 
          disabled={availableArea <= 0}
          title={availableArea <= 0 ? "No available space in this structure" : "Add a new room"}
        >
          + Add Room
        </button>
      </div>

      <h3>Rooms</h3>
      <div className="card-container">
        {rooms.map(room => {
          const isRenaming = renamingRoomId === room.id;
          const plantSummary = room.getRoomPlantSummary(allStrains);
          let plantSummaryText: string | null = null;
          
          if (room.purpose === 'growroom') {
            plantSummaryText = `${plantSummary.count} / ${plantSummary.capacity}`;
            if (plantSummary.dominantStage && plantSummary.count > 0) {
                const capitalizedStage = plantSummary.dominantStage.charAt(0).toUpperCase() + plantSummary.dominantStage.slice(1);
                plantSummaryText += ` (${capitalizedStage} - ${plantSummary.progress.toFixed(0)}%)`;
            }
          }
          const expectedYield = room.getTotalExpectedYield(allStrains);

          return (
            <div key={room.id} className="card" data-clickable={!isRenaming} onClick={() => !isRenaming && onRoomClick(room.id)}>
              <div className="card__header">
                  {isRenaming ? (
                     <div className="form-group-inline" style={{ width: '100%', gap: '0.25rem' }}>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={handleRenameInputKeyDown}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button className="btn-action-icon" onClick={(e) => { e.stopPropagation(); handleConfirmRename(); }} title="Confirm Rename" aria-label="Confirm Rename"><span className="material-symbols-outlined">check</span></button>
                        <button className="btn-action-icon" onClick={(e) => { e.stopPropagation(); handleCancelRename(); }} title="Cancel Rename" aria-label="Cancel Rename"><span className="material-symbols-outlined">close</span></button>
                    </div>
                  ) : (
                    <>
                      <h3>{room.name}</h3>
                      <div className="card__actions">
                          <button className="btn-action-icon" onClick={(e) => { e.stopPropagation(); handleStartRename(room); }} title="Rename Room" aria-label="Rename Room">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button 
                            className="btn-action-icon" 
                            onClick={(e) => { e.stopPropagation(); onDuplicateRoom(structure.id, room.id); }} 
                            title={availableArea < room.area_m2 ? 'Not enough space to duplicate' : 'Duplicate Room'} 
                            aria-label="Duplicate Room" 
                            disabled={availableArea < room.area_m2}
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                          <button className="btn-action-icon delete" onClick={(e) => { e.stopPropagation(); onDeleteRoomClick(room.id, room.name); }} title="Delete Room" aria-label="Delete Room">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                      </div>
                    </>
                  )}
              </div>
              <p>Area: <span className="card-info-value">{room.area_m2} m²</span></p>
              <p>Purpose: <span className="card-info-value">{getPurposeName(room.purpose)}</span></p>
              <p>Zones: <span className="card-info-value">{Object.keys(room.zones).length}</span></p>
              {plantSummaryText !== null && <p>Plants: <span className="card-info-value">{plantSummaryText}</span></p>}
              {expectedYield > 0 && <p>Exp. Yield: <span className="card-info-value">{expectedYield.toFixed(1)}g</span></p>}
            </div>
          );
        })}
      </div>
      {rooms.length === 0 && <p className="placeholder-text">This structure has no rooms. Create a room to start organizing your space.</p>}
    </div>
  );
};

export default StructureDetail;