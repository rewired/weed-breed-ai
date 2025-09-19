import React, { useState } from 'react';
import {
  Company,
  Room,
  Structure,
  Zone,
  roomPurposes,
  getBlueprints,
  getAvailableStrains,
} from '@/src/game/api';
import BreedingStation from './BreedingStation';

interface RoomDetailProps {
  room: Room;
  company: Company;
  structure: Structure;
  onAddZoneClick: () => void;
  onRenameRoomClick: (id: string, name: string) => void;
  onDeleteRoomClick: (id: string, name: string) => void;
  onZoneClick: (zoneId: string) => void;
  onOpenModal: (type: any, context?: any) => void;
  onDuplicateZone: (roomId: string, zoneId: string) => void;
  onRenameZone: (zoneId: string, newName: string) => void;
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

const DefaultRoomContent: React.FC<RoomDetailProps> = ({ room, onZoneClick, company, onDuplicateZone, onRenameZone }) => {
  const [renamingZoneId, setRenamingZoneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const zones = Object.values(room.zones);
  const allStrains = getAvailableStrains(company);
  const usedArea = Object.values(room.zones).reduce((sum, zone) => sum + zone.area_m2, 0);
  const availableArea = room.area_m2 - usedArea;

  const handleStartRename = (zone: Zone) => {
    setRenamingZoneId(zone.id);
    setRenameValue(zone.name);
  };

  const handleCancelRename = () => {
    setRenamingZoneId(null);
    setRenameValue('');
  };

  const handleConfirmRename = () => {
    if (renamingZoneId && renameValue.trim()) {
      onRenameZone(renamingZoneId, renameValue.trim());
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
    <>
       <div className="card-container">
        {zones.map(zone => {
          const isRenaming = renamingZoneId === zone.id;
          const cultivationMethod = getBlueprints().cultivationMethods[zone.cultivationMethodId];
          const plantCapacity = zone.getPlantCapacity();
          const plantCount = zone.getTotalPlantedCount();
          const dominantInfo = zone.getDominantPlantingInfo(allStrains);
          const expectedYield = zone.getTotalExpectedYield(allStrains);

          let plantSummary = `${plantCount} / ${plantCapacity}`;
          if (dominantInfo && plantCount > 0) {
              const capitalizedStage = dominantInfo.stage.charAt(0).toUpperCase() + dominantInfo.stage.slice(1);
              plantSummary += ` (${capitalizedStage} - ${dominantInfo.progress.toFixed(0)}%)`;
          }

          return (
            <div key={zone.id} className="card" data-clickable={!isRenaming} onClick={() => !isRenaming && onZoneClick(zone.id)}>
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
                      <h3>{zone.name}</h3>
                      <div className="card__actions">
                        <button className="btn-action-icon" onClick={(e) => { e.stopPropagation(); handleStartRename(zone); }} title="Rename Zone" aria-label="Rename Zone">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button 
                            className="btn-action-icon" 
                            onClick={(e) => { e.stopPropagation(); onDuplicateZone(room.id, zone.id); }} 
                            title={availableArea < zone.area_m2 ? "Not enough space to duplicate" : "Duplicate Zone"} 
                            aria-label="Duplicate Zone" 
                            disabled={availableArea < zone.area_m2}
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                        </button>
                      </div>
                    </>
                  )}
              </div>
              <p>Area: <span className="card-info-value">{zone.area_m2} m²</span></p>
              <p>Method: <span className="card-info-value">{cultivationMethod ? cultivationMethod.name : 'N/A'}</span></p>
              <p>Plants: <span className="card-info-value">{plantSummary}</span></p>
              {expectedYield > 0 && <p>Exp. Yield: <span className="card-info-value">{expectedYield.toFixed(1)}g</span></p>}
            </div>
          );
        })}
      </div>
      {zones.length === 0 && <p className="placeholder-text">This room has no zones. Zones are where you can grow plants and install devices.</p>}
    </>
  )
}

const RoomDetail: React.FC<RoomDetailProps> = (props) => {
  const { room, onAddZoneClick, onRenameRoomClick, onDeleteRoomClick, onOpenModal } = props;
  
  const usedArea = Object.values(room.zones).reduce((sum, zone) => sum + zone.area_m2, 0);
  const availableArea = room.area_m2 - usedArea;
  
  let content;
  let headerActions;
  let headerTitle: string | null = "Zones";
  
  if (room.purpose === 'lab') {
    headerTitle = "Breeding Station";
    headerActions = <button className="btn" onClick={() => onOpenModal('breedStrain')}>+ Breed New Strain</button>;
    content = <BreedingStation company={props.company} />;
  } else {
    headerActions = <button 
      className="btn" 
      onClick={onAddZoneClick}
      disabled={availableArea <= 0}
      title={availableArea <= 0 ? "No available space in this room" : "Add a new zone"}
    >
      + Add Zone
    </button>;
    content = <DefaultRoomContent {...props} />;
  }

  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <div>
            <div className="content-panel__title-group">
                <h2>{room.name}</h2>
                <span className="purpose-badge">{getPurposeName(room.purpose)}</span>
                <button className="btn-action-icon" onClick={() => onRenameRoomClick(room.id, room.name)} title="Rename Room" aria-label="Rename Room">
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button className="btn-action-icon delete" onClick={() => onDeleteRoomClick(room.id, room.name)} title="Delete Room" aria-label="Delete Room">
                  <span className="material-symbols-outlined">delete</span>
                </button>
            </div>
            <p>
                {usedArea} / {room.area_m2} m² used ({availableArea} m² available)
            </p>
        </div>
        {headerActions}
      </div>
      
      <h3>{headerTitle}</h3>
      {content}

    </div>
  );
};

export default RoomDetail;