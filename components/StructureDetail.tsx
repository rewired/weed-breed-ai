import React from 'react';
import { Structure } from '../game/types';
import { roomPurposes } from '../game/roomPurposes';

interface StructureDetailProps {
  structure: Structure;
  onAddRoomClick: () => void;
  onRoomClick: (id: string) => void;
  onRenameClick: (id: string, name: string) => void;
  onDeleteStructureClick: (id: string, name: string) => void;
  onDeleteRoomClick: (id: string, name: string) => void;
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

const StructureDetail: React.FC<StructureDetailProps> = ({ structure, onAddRoomClick, onRoomClick, onRenameClick, onDeleteStructureClick, onDeleteRoomClick }) => {
  const rooms = Object.values(structure.rooms);
  const usedArea = rooms.reduce((sum, room) => sum + room.area_m2, 0);
  const availableArea = structure.area_m2 - usedArea;

  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <div>
          <div className="content-panel__title-group">
            <h2>{structure.name}</h2>
            <button className="btn-rename" onClick={() => onRenameClick(structure.id, structure.name)}>Rename</button>
            <button className="btn-delete" onClick={() => onDeleteStructureClick(structure.id, structure.name)}>Delete</button>
          </div>
          <p>
            {usedArea} / {structure.area_m2} m² used ({availableArea} m² available)
          </p>
        </div>
        <button className="btn" onClick={onAddRoomClick}>+ Add Room</button>
      </div>

      <h3>Rooms</h3>
      <div className="card-container">
        {rooms.map(room => (
          <div key={room.id} className="card" data-clickable="true" onClick={() => onRoomClick(room.id)}>
            <div className="card__header">
                <h3>{room.name}</h3>
                <div className="card__actions">
                    <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDeleteRoomClick(room.id, room.name); }}>Delete</button>
                </div>
            </div>
            <p>Area: {room.area_m2} m²</p>
            <p>Purpose: {getPurposeName(room.purpose)}</p>
            <p>Zones: {Object.keys(room.zones).length}</p>
          </div>
        ))}
      </div>
      {rooms.length === 0 && <p className="placeholder-text">This structure has no rooms. Create a room to start organizing your space.</p>}
    </div>
  );
};

export default StructureDetail;