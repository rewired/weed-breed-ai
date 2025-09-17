import React from 'react';
import { Company, Room, Zone, Device, Structure, GroupedDeviceInfo } from '../game/types';
import { roomPurposes } from '../game/roomPurposes';
import { getBlueprints, getAvailableStrains } from '../game/blueprints';
import BreedingStation from './BreedingStation';
import { Planting } from '../game/models/Planting';

interface RoomDetailProps {
  room: Room;
  company: Company;
  structure: Structure;
  onAddZoneClick: () => void;
  onRenameRoomClick: (id: string, name: string) => void;
  onRenameZoneClick: (id: string, name: string) => void;
  onDeleteRoomClick: (id: string, name: string) => void;
  onDeleteZoneClick: (id: string, name: string) => void;
  onAddDeviceClick: (zoneId: string) => void;
  onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
  onOpenModal: (type: any, context?: any) => void;
}

const getPurposeName = (purposeId: string) => {
    const purpose = roomPurposes.find(p => p.id === purposeId);
    return purpose ? purpose.name : purposeId;
};

interface DefaultRoomContentProps extends Pick<RoomDetailProps, 'room' | 'company' | 'structure' | 'onRenameZoneClick' | 'onDeleteZoneClick' | 'onAddDeviceClick' | 'onOpenModal' | 'onToggleDeviceGroupStatus'> {}

const DefaultRoomContent: React.FC<DefaultRoomContentProps> = ({ room, company, structure, onRenameZoneClick, onDeleteZoneClick, onAddDeviceClick, onOpenModal, onToggleDeviceGroupStatus }) => {
  const zones = Object.values(room.zones);
  const allStrains = getAvailableStrains(company);

  return (
    <>
       <div className="card-container">
        {zones.map(zone => {
          const cultivationMethod = getBlueprints().cultivationMethods[zone.cultivationMethodId];
          const { temperature_C, humidity_rh, co2_ppm } = zone.currentEnvironment;
          const plantCapacity = zone.getPlantCapacity();
          const plantCount = zone.getTotalPlantedCount();
          
          const lightingDetails = zone.getLightingDetails();
          const isLightingSufficient = lightingDetails.coverage >= zone.area_m2;
          
          const climateDetails = zone.getClimateControlDetails(structure.height_m);
          const isClimateSufficient = climateDetails.isSufficient;

          const humidityDetails = zone.getHumidityControlDetails();
          const isHumiditySufficient = humidityDetails.isSufficient;

          const co2Details = zone.getCO2Details();
          const isCO2Sufficient = co2Details.isSufficient;
          
          const groupedDevices = zone.getGroupedDevices();

          return (
            <div key={zone.id} className="card">
              <div className="card__header">
                  <h3>{zone.name}</h3>
                  <div className="card__actions">
                      <button className="btn-rename" onClick={() => onRenameZoneClick(zone.id, zone.name)}>Rename</button>
                      <button className="btn-delete" onClick={() => onDeleteZoneClick(zone.id, zone.name)}>Delete</button>
                  </div>
              </div>
              <p>Area: {zone.area_m2} m²</p>
              <p>Method: {cultivationMethod ? cultivationMethod.name : 'N/A'}</p>
              <p>Plants: {plantCount} / {plantCapacity}</p>
              
              <div className="zone-lighting">
                  <h5>Lighting</h5>
                  <div className="lighting-stats">
                      <span className={isLightingSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                          Coverage: {lightingDetails.coverage.toFixed(1)} / {zone.area_m2.toFixed(1)} m²
                      </span>
                      <span>Avg PPFD: {lightingDetails.averagePPFD.toFixed(0)} µmol/m²/s</span>
                      <span>DLI: {lightingDetails.dli.toFixed(1)} mol/m²/day</span>
                  </div>
              </div>

              <div className="zone-climate">
                  <h5>Climate</h5>
                  <div className="climate-stats">
                      <span className={isClimateSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                          Airflow: {climateDetails.actualAirflow.toFixed(0)} / {climateDetails.requiredAirflow.toFixed(0)} m³/h
                      </span>
                  </div>
              </div>
              
              <div className="zone-environment">
                  <h5>Environment</h5>
                  <div className="env-stats">
                      <span>Temp: {temperature_C?.toFixed(1) ?? 'N/A'} °C</span>
                      <span>RH: {(humidity_rh * 100)?.toFixed(0) ?? 'N/A'} %</span>
                      <span>CO2: {co2_ppm?.toFixed(0) ?? 'N/A'} ppm</span>
                      <span className={isHumiditySufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                        Dehumid.: {humidityDetails.actualDehumidification.toFixed(2)}/{humidityDetails.requiredDehumidification.toFixed(2)} kg/h
                      </span>
                       <span className={isCO2Sufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                        CO₂ Inj.: {co2Details.actualInjectionRate.toFixed(0)}/{co2Details.requiredInjectionRate.toFixed(0)} ppm/t
                      </span>
                  </div>
              </div>

              <div className="zone-inventory">
                  <h5>Devices</h5>
                  {groupedDevices.length > 0 ? (
                    <ul>
                      {groupedDevices.map(deviceGroup => (
                        <li key={deviceGroup.blueprintId} data-clickable="true" onClick={() => onToggleDeviceGroupStatus(zone.id, deviceGroup.blueprintId)}>
                          <span className="device-name-group">
                            <span className={`device-status-indicator status-${deviceGroup.status}`}></span>
                            {deviceGroup.name}
                          </span>
                          <span className="device-count">(x{deviceGroup.count})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="placeholder-text-small">No devices installed.</p>
                  )}
                  <button className="btn-add-item" onClick={() => onAddDeviceClick(zone.id)}>+ Device</button>
              </div>

              {room.purpose === 'growroom' && (
                <div className="zone-plantings">
                    <h5>Plantings</h5>
                     {Object.keys(zone.plantings).length > 0 ? (
                        <ul className="planting-list">
                          {Object.values(zone.plantings).map(planting => {
                              const strain = allStrains[planting.strainId];
                              const stage = planting.getGrowthStage();
                              const health = planting.getAverageHealth();

                              return (
                                <li key={planting.id} className="planting-item">
                                  <div className="planting-item-header">
                                    <strong>{strain ? strain.name : 'Unknown Strain'}</strong> ({planting.quantity})
                                  </div>
                                  <div className="planting-item-body">
                                    <span>Stage: <span className="planting-item-value">{stage}</span></span>
                                    <span>Health: <span className="planting-item-value">{(health * 100).toFixed(0)}%</span></span>
                                  </div>
                                </li>
                              );
                          })}
                        </ul>
                      ) : (
                        <p className="placeholder-text-small">No plants in this zone.</p>
                      )}
                    <button className="btn-add-item" onClick={() => onOpenModal('plantStrain', { activeZoneId: zone.id })}>+ Plant Strain</button>
                </div>
              )}

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
    headerActions = <button className="btn" onClick={onAddZoneClick}>+ Add Zone</button>;
    content = <DefaultRoomContent {...props} />;
  }

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
        {headerActions}
      </div>
      
      <h3>{headerTitle}</h3>
      {content}

    </div>
  );
};

export default RoomDetail;