import React from 'react';
import { getZoneInfo } from '@/src/game/api';
import type { ZoneInfoDTO } from '@/src/game/api';
import type { Company } from '@/game/models/Company';
import type { Zone } from '@/game/models/Zone';
import type { Structure } from '@/game/models/Structure';
import type { Room } from '@/game/models/Room';
import ZoneInfoPanel from '../components/ZoneInfoPanel';
import ZoneDeviceList from '../components/ZoneDeviceList';
import ZonePlantingList from '../components/ZonePlantingList';
import ZonePlantingPlan from '../components/ZonePlantingPlan';

interface ZoneDetailProps {
  zone: Zone;
  company: Company;
  structure: Structure;
  room: Room;
  onRenameZoneClick: (id: string, name: string) => void;
  onDeleteZoneClick: (id: string, name: string) => void;
  onAddDeviceClick: (zoneId: string) => void;
  onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
  onOpenModal: (type: any, context?: any) => void;
  onHarvest: (zoneId: string, plantId?: string) => void;
  onNavigateToZone: (direction: 'next' | 'prev') => void;
  onToggleAutoReplant: (zoneId: string) => void;
  onDeletePlantingPlan: (zoneId: string) => void;
}

const ZoneDetail: React.FC<ZoneDetailProps> = ({ zone, company, structure, room, onRenameZoneClick, onDeleteZoneClick, onAddDeviceClick, onOpenModal, onToggleDeviceGroupStatus, onHarvest, onNavigateToZone, onToggleAutoReplant, onDeletePlantingPlan }) => {
  if (!zone) {
    return <div className="content-panel">Zone not found.</div>;
  }

  const zoneInfo: ZoneInfoDTO = getZoneInfo(zone, structure, company);

  const zoneIds = Object.keys(room.zones);
  const currentIndex = zoneIds.indexOf(zone.id);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < zoneIds.length - 1;


  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <div className="content-panel__title-group">
            <button 
              className="btn-action-icon" 
              onClick={() => onNavigateToZone('prev')} 
              disabled={!canGoPrev}
              title="Previous Zone"
              aria-label="Previous Zone"
            >
              <span className="material-symbols-outlined">arrow_back_ios</span>
            </button>
            <h2>{zone.name}</h2>
            <button 
              className="btn-action-icon" 
              onClick={() => onNavigateToZone('next')} 
              disabled={!canGoNext}
              title="Next Zone"
              aria-label="Next Zone"
            >
              <span className="material-symbols-outlined">arrow_forward_ios</span>
            </button>
            <button className="btn-action-icon" onClick={() => onRenameZoneClick(zone.id, zone.name)} title="Rename Zone" aria-label="Rename Zone">
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button className="btn-action-icon delete" onClick={() => onDeleteZoneClick(zone.id, zone.name)} title="Delete Zone" aria-label="Delete Zone">
              <span className="material-symbols-outlined">delete</span>
            </button>
        </div>
      </div>

       <div className="zone-detail-view">
            <ZoneInfoPanel
                info={zoneInfo}
                onOpenModal={onOpenModal}
            />
        
            <div className="zone-detail-lists-panel">
                <ZonePlantingList 
                    zone={zone}
                    company={company}
                    onOpenModal={onOpenModal}
                    onHarvest={(plantId?: string) => onHarvest(zone.id, plantId)}
                />
                <ZonePlantingPlan
                    zone={zone}
                    company={company}
                    onOpenModal={onOpenModal}
                    onToggleAutoReplant={onToggleAutoReplant}
                    onDeletePlantingPlan={onDeletePlantingPlan}
                />
                <ZoneDeviceList 
                    zone={zone}
                    onAddDeviceClick={onAddDeviceClick}
                    onOpenModal={onOpenModal}
                    onToggleDeviceGroupStatus={onToggleDeviceGroupStatus}
                />
            </div>
       </div>
    </div>
  );
};

export default ZoneDetail;