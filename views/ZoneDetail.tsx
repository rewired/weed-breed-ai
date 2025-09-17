import React from 'react';
import { Company, Zone, Structure } from '../game/types';
import ZoneInfoPanel from '../components/ZoneInfoPanel';
import ZoneDeviceList from '../components/ZoneDeviceList';
import ZonePlantingList from '../components/ZonePlantingList';

interface ZoneDetailProps {
  zone: Zone;
  company: Company;
  structure: Structure;
  onRenameZoneClick: (id: string, name: string) => void;
  onDeleteZoneClick: (id: string, name: string) => void;
  onAddDeviceClick: (zoneId: string) => void;
  onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
  onOpenModal: (type: any, context?: any) => void;
  onHarvest: (plantId?: string) => void;
}

const ZoneDetail: React.FC<ZoneDetailProps> = ({ zone, company, structure, onRenameZoneClick, onDeleteZoneClick, onAddDeviceClick, onOpenModal, onToggleDeviceGroupStatus, onHarvest }) => {
  if (!zone) {
    return <div className="content-panel">Zone not found.</div>;
  }
  
  const supplyConsumption = zone.getSupplyConsumptionRates(company);

  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <div className="content-panel__title-group">
            <h2>{zone.name}</h2>
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
                zone={zone}
                structure={structure}
                onOpenModal={onOpenModal}
                supplyConsumption={supplyConsumption}
            />
        
            <div className="zone-detail-lists-panel">
                <ZoneDeviceList 
                    zone={zone}
                    onAddDeviceClick={onAddDeviceClick}
                    onOpenModal={onOpenModal}
                    onToggleDeviceGroupStatus={onToggleDeviceGroupStatus}
                />
                <ZonePlantingList 
                    zone={zone}
                    company={company}
                    onOpenModal={onOpenModal}
                    onHarvest={onHarvest}
                />
            </div>
       </div>
    </div>
  );
};

export default ZoneDetail;