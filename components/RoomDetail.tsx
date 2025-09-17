import React from 'react';
import { Company, Room, Structure } from '../game/types';
import { roomPurposes } from '../game/roomPurposes';
import { getBlueprints, getAvailableStrains } from '../game/blueprints';
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
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

const DefaultRoomContent: React.FC<RoomDetailProps> = ({ room, onZoneClick, company, onDuplicateZone }) => {
  const zones = Object.values(room.zones);
  const allStrains = getAvailableStrains(company);
  const usedArea = Object.values(room.zones).reduce((sum, zone) => sum + zone.area_m2, 0);
  const availableArea = room.area_m2 - usedArea;

  return (
    <>
       <div className="card-container">
        {zones.map(zone => {
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
            <div key={zone.id} className="card" data-clickable="true" onClick={() => onZoneClick(zone.id)}>
              <div className="card__header">
                  <h3>{zone.name}</h3>
                  <div className="card__actions">
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
              </div>
              <p>Area: {zone.area_m2} m²</p>
              <p>Method: {cultivationMethod ? cultivationMethod.name : 'N/A'}</p>
              <p>Plants: {plantSummary}</p>
              {expectedYield > 0 && <p>Exp. Yield: {expectedYield.toFixed(1)}g</p>}
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
