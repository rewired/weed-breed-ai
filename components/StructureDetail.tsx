import React from 'react';
import { Company, Structure } from '../game/types';
import { roomPurposes } from '../game/roomPurposes';
import { getAvailableStrains } from '../game/blueprints';

interface StructureDetailProps {
  structure: Structure;
  company: Company;
  onAddRoomClick: () => void;
  onRoomClick: (id: string) => void;
  onRenameClick: (id: string, name: string) => void;
  onDeleteStructureClick: (id: string, name: string) => void;
  onDeleteRoomClick: (id: string, name: string) => void;
  onDuplicateRoom: (structureId: string, roomId: string) => void;
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

const StructureDetail: React.FC<StructureDetailProps> = ({ structure, company, onAddRoomClick, onRoomClick, onRenameClick, onDeleteStructureClick, onDeleteRoomClick, onDuplicateRoom }) => {
  const rooms = Object.values(structure.rooms);
  const usedArea = rooms.reduce((sum, room) => sum + room.area_m2, 0);
  const availableArea = structure.area_m2 - usedArea;
  const allStrains = getAvailableStrains(company);

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
            <div key={room.id} className="card" data-clickable="true" onClick={() => onRoomClick(room.id)}>
              <div className="card__header">
                  <h3>{room.name}</h3>
                  <div className="card__actions">
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
              </div>
              <p>Area: {room.area_m2} m²</p>
              <p>Purpose: {getPurposeName(room.purpose)}</p>
              <p>Zones: {Object.keys(structure.rooms).length}</p>
              {plantSummaryText !== null && <p>Plants: {plantSummaryText}</p>}
              {expectedYield > 0 && <p>Exp. Yield: {expectedYield.toFixed(1)}g</p>}
            </div>
          );
        })}
      </div>
      {rooms.length === 0 && <p className="placeholder-text">This structure has no rooms. Create a room to start organizing your space.</p>}
    </div>
  );
};

export default StructureDetail;
