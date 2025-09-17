import React, { useState } from 'react';
import { Company, Room, Zone, Device, Structure, GroupedDeviceInfo } from '../game/types';
import { roomPurposes } from '../game/roomPurposes';
import { getBlueprints, getAvailableStrains } from '../game/blueprints';
import BreedingStation from './BreedingStation';
import { Planting } from '../game/models/Planting';
import { GrowthStage } from '../game/models/Plant';

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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
                      <button className="btn-action-icon" onClick={() => onRenameZoneClick(zone.id, zone.name)} title="Rename Zone" aria-label="Rename Zone">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="btn-action-icon delete" onClick={() => onDeleteZoneClick(zone.id, zone.name)} title="Delete Zone" aria-label="Delete Zone">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
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
                      {groupedDevices.map(deviceGroup => {
                        const isExpanded = expandedItems[`device-${deviceGroup.blueprintId}`];
                        const blueprint = getBlueprints().devices[deviceGroup.blueprintId];
                        const isAdjustable = blueprint?.kind === 'ClimateUnit' || blueprint?.kind === 'HumidityControlUnit' || blueprint?.kind === 'CO2Injector';
                        const groupSettings = zone.deviceGroupSettings[deviceGroup.blueprintId];
                        let currentSettingDisplay = null;

                        if (groupSettings) {
                            if (blueprint?.kind === 'ClimateUnit' && groupSettings.targetTemperature) {
                                currentSettingDisplay = `(Set: ${groupSettings.targetTemperature}°C)`;
                            }
                            if (blueprint?.kind === 'HumidityControlUnit' && groupSettings.targetHumidity) {
                                currentSettingDisplay = `(Set: ${Math.round(groupSettings.targetHumidity * 100)}%)`;
                            }
                            if (blueprint?.kind === 'CO2Injector' && groupSettings.targetCO2) {
                                currentSettingDisplay = `(Set: ${groupSettings.targetCO2} ppm)`;
                            }
                        }

                        return (
                        <li key={deviceGroup.blueprintId}>
                           <div className="group-summary" onClick={() => toggleExpanded(`device-${deviceGroup.blueprintId}`)}>
                              <span className="device-name-group">
                                <span className={`device-status-indicator status-${deviceGroup.status}`} onClick={(e) => { e.stopPropagation(); onToggleDeviceGroupStatus(zone.id, deviceGroup.blueprintId); }}></span>
                                {deviceGroup.name} <span className="device-setting-display">{currentSettingDisplay}</span>
                              </span>
                              <div className="sub-list-item-actions">
                                {isAdjustable && (
                                     <button
                                        className="btn-action-icon"
                                        onClick={(e) => { e.stopPropagation(); onOpenModal('editDevice', { itemToEdit: { type: 'deviceGroup', blueprintId: deviceGroup.blueprintId, name: deviceGroup.name, context: { zoneId: zone.id } } })}}
                                        title={`Adjust ${deviceGroup.name} Settings`} aria-label={`Adjust ${deviceGroup.name} Settings`}
                                      >
                                        <span className="material-symbols-outlined">tune</span>
                                      </button>
                                  )}
                                <span className="device-count">(x{deviceGroup.count})</span>
                              </div>
                            </div>
                            {isExpanded && (
                              <ul className="sub-list">
                                {Object.values(zone.devices).filter(d => d.blueprintId === deviceGroup.blueprintId).map(device => (
                                    <li key={device.id} className="sub-list-item">
                                      <span>{device.name} #{device.id.slice(-4)}</span>
                                      <div className="sub-list-item-actions">
                                        <button
                                          className="btn-action-icon delete"
                                          onClick={() => onOpenModal('delete', { itemToDelete: { type: 'device', id: device.id, name: device.name, context: { zoneId: zone.id } } })}
                                          title="Delete Device" aria-label="Delete Device"
                                        >
                                          <span className="material-symbols-outlined">delete</span>
                                        </button>
                                      </div>
                                    </li>
                                  )
                                )}
                              </ul>
                            )}
                        </li>
                      )})}
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
                        <ul>
                          {Object.values(zone.plantings).map(planting => {
                              const strain = allStrains[planting.strainId];
                              const isExpanded = expandedItems[`planting-${planting.id}`];
                              const stageDistribution = planting.getStageDistribution();
                              const stageSummary = Object.entries(stageDistribution)
                                .filter(([, count]) => count > 0)
                                .map(([stage, count]) => `${stage.charAt(0).toUpperCase() + stage.slice(1)}: ${count}`)
                                .join(', ');
                              
                              // --- Get Optimal Conditions for Tooltip ---
                              const stage = planting.getGrowthStage();
                              let preferenceKey: 'vegetation' | 'flowering' | null = null;
                              if (stage === GrowthStage.Vegetative || stage === GrowthStage.Seedling) {
                                preferenceKey = 'vegetation';
                              } else if (stage === GrowthStage.Flowering || stage === GrowthStage.Harvestable) {
                                preferenceKey = 'flowering';
                              }
                              
                              const prefs = strain && preferenceKey ? strain.environmentalPreferences : null;
                              const idealTemp = prefs?.idealTemperature[preferenceKey];
                              const idealHumidity = prefs?.idealHumidity[preferenceKey];
                              const idealPPFD = prefs?.lightIntensity[preferenceKey];


                              return (
                                <li key={planting.id}>
                                  <div className="group-summary" onClick={() => toggleExpanded(`planting-${planting.id}`)}>
                                    <span className="device-name-group">
                                      <strong>{strain ? strain.name : 'Unknown Strain'}</strong>
                                      {strain && preferenceKey && (
                                        <div className="planting-info-tooltip-container">
                                          <span className="material-symbols-outlined planting-info-icon">info</span>
                                          <div className="planting-info-tooltip">
                                              <h5>Optimal Conditions ({preferenceKey})</h5>
                                              <div className="target-stats">
                                                  <span>Temp: {idealTemp ? `${idealTemp[0]}-${idealTemp[1]} °C` : 'N/A'}</span>
                                                  <span>RH: {idealHumidity ? `${Math.round(idealHumidity[0]*100)}-${Math.round(idealHumidity[1]*100)} %` : 'N/A'}</span>
                                                  <span>PPFD: {idealPPFD ? `${idealPPFD[0]}-${idealPPFD[1]} µmol/m²/s` : 'N/A'}</span>
                                              </div>
                                              {strain.meta?.notes && (
                                                <>
                                                  <h5 style={{marginTop: '0.75rem'}}>Strain Notes</h5>
                                                  <p className="strain-notes-text">{strain.meta.notes}</p>
                                                </>
                                              )}
                                          </div>
                                        </div>
                                      )}
                                      {stageSummary && <span className="planting-stage-summary">({stageSummary})</span>}
                                    </span>
                                    <span className="device-count">(x{planting.quantity})</span>
                                  </div>
                                  {isExpanded && (
                                     <ul className="sub-list">
                                      {planting.plants.map(plant => {
                                        const capitalizedStage = plant.growthStage.charAt(0).toUpperCase() + plant.growthStage.slice(1);
                                        return (
                                        <li key={plant.id} className="sub-list-item">
                                          <span>Plant #{plant.id.slice(-4)} (Stage: {capitalizedStage}, Health: {(plant.health*100).toFixed(0)}%)</span>
                                           <button
                                            className="btn-action-icon delete"
                                            onClick={() => onOpenModal('delete', { itemToDelete: { type: 'plant', id: plant.id, name: `Plant #${plant.id.slice(-4)}`, context: { zoneId: zone.id, plantingId: planting.id } } })}
                                            title="Delete Plant" aria-label="Delete Plant"
                                          >
                                            <span className="material-symbols-outlined">delete</span>
                                          </button>
                                        </li>
                                      )})}
                                    </ul>
                                  )}
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