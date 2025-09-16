import React from 'react';
import { Room } from '../game/types';
import { roomPurposes } from '../game/roomPurposes';

interface RoomDetailProps {
  room: Room;
  onAddZoneClick: () => void;
  onRenameRoomClick: (id: string, name: string) => void;
  onRenameZoneClick: (id: string, name: string) => void;
  onDeleteRoomClick: (id: string, name: string) => void;
  onDeleteZoneClick: (id: string, name: string) => void;
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

const RoomDetail: React.FC<RoomDetailProps> = ({ room, onAddZoneClick, onRenameRoomClick, onRenameZoneClick, onDeleteRoomClick, onDeleteZoneClick }) => {
  const zones = Object.values(room.zones);
  const usedArea = zones.reduce((sum, zone) => sum + zone.area_m2, 0);
  const availableArea = room.area_m2 - usedArea;

  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <div>
            <div className="content-panel__title-group">
                <h2>{room.name}</h2>
                <span className="purpose-badge">{getPurposeName(room.purpose)}</span>
                <button className="btn-rename" onClick={() => onRenameRoomClick(room.id, room.name)}>Rename</button>
                <button className="btn-delete" onClick={() => onDeleteRoomClick(room.id, room.name)}>Delete</button>
            </div>
            <p>
                {usedArea} / {room.area_m2} m² used ({availableArea} m² available)
            </p>
        </div>
        <button className="btn" onClick={onAddZoneClick}>+ Add Zone</button>
      </div>

      <h3>Zones</h3>
       <div className="card-container">
        {zones.map(zone => (
          <div key={zone.id} className="card">
            <div className="card__header">
                <h3>{zone.name}</h3>
                <div className="card__actions">
                    <button className="btn-rename" onClick={() => onRenameZoneClick(zone.id, zone.name)}>Rename</button>
                    <button className="btn-delete" onClick={() => onDeleteZoneClick(zone.id, zone.name)}>Delete</button>
                </div>
            </div>
            <p>Area: {zone.area_m2} m²</p>
          </div>
        ))}
      </div>
      {zones.length === 0 && <p className="placeholder-text">This room has no zones. Zones are where you can grow plants and install devices.</p>}
    </div>
  );
};

export default RoomDetail;