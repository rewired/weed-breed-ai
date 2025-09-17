import React, { useState } from 'react';
import { Zone, Company } from '../game/types';
import { getAvailableStrains } from '../game/blueprints';
import { GrowthStage } from '../game/models/Plant';

interface ZonePlantingListProps {
  zone: Zone;
  company: Company;
  onOpenModal: (type: any, context?: any) => void;
  onHarvest: (plantId?: string) => void;
}

const ZonePlantingList: React.FC<ZonePlantingListProps> = ({ zone, company, onOpenModal, onHarvest }) => {
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const allStrains = getAvailableStrains(company);

    const toggleExpanded = (key: string) => {
      setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const plantCapacity = zone.getPlantCapacity();
    const plantCount = zone.getTotalPlantedCount();
    const canPlantMore = plantCount < plantCapacity;

    const harvestablePlants = zone.getHarvestablePlants();
    const canMassHarvest = harvestablePlants.length > 0;

    return (
        <div className="card">
            <div className="zone-plantings">
                <h5>Plantings</h5>
                {Object.keys(zone.plantings).length > 0 ? (
                    <ul>
                        {Object.values(zone.plantings).map(planting => {
                            const strain = allStrains[planting.strainId];
                            if (!strain) return null;
                            const isExpanded = expandedItems[`planting-${planting.id}`];
                            
                            const dominantStageInfo = planting.getDominantStageInfo(strain);
                            let summaryText = '';
                            if (dominantStageInfo) {
                                const capitalizedStage = dominantStageInfo.stage.charAt(0).toUpperCase() + dominantStageInfo.stage.slice(1);
                                summaryText = `(${capitalizedStage} - ${dominantStageInfo.progress.toFixed(0)}%)`;
                            }
                            
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
                            const idealLightCycle = prefs?.lightCycle[preferenceKey];

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
                                                            <span>Light Cycle: {idealLightCycle ? `${idealLightCycle[0]}h / ${idealLightCycle[1]}h` : 'N/A'}</span>
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
                                            {summaryText && <span className="planting-stage-summary">{summaryText}</span>}
                                        </span>
                                        <div className="sub-list-item-actions">
                                             <button
                                                className="btn-action-icon delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenModal('delete', { itemToDelete: { type: 'planting', id: planting.id, name: `all ${planting.quantity} '${strain.name}' plants`, context: { zoneId: zone.id } } })
                                                }}
                                                title={`Delete all ${strain.name} plants`}
                                                aria-label={`Delete all ${strain.name} plants`}
                                            >
                                                <span className="material-symbols-outlined">delete_sweep</span>
                                            </button>
                                            <span className="device-count">(x{planting.quantity})</span>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <ul className="sub-list">
                                            {planting.plants.map(plant => {
                                                const capitalizedStage = plant.growthStage.charAt(0).toUpperCase() + plant.growthStage.slice(1);
                                                const progress = plant.getStageProgress(strain);
                                                return (
                                                    <li key={plant.id} className="sub-list-item">
                                                        <span>Plant #{plant.id.slice(-4)} (Stage: {capitalizedStage} <span className="planting-progress">{progress.toFixed(0)}%</span>, Health: {(plant.health*100).toFixed(0)}%)</span>
                                                        <div className="sub-list-item-actions">
                                                            {plant.growthStage === GrowthStage.Harvestable && (
                                                                <button
                                                                    className="btn-action-icon harvest"
                                                                    onClick={(e) => { e.stopPropagation(); onHarvest(plant.id); }}
                                                                    title="Harvest Plant"
                                                                    aria-label="Harvest Plant"
                                                                >
                                                                    <span className="material-symbols-outlined">content_cut</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                className="btn-action-icon delete"
                                                                onClick={(e) => { e.stopPropagation(); onOpenModal('delete', { itemToDelete: { type: 'plant', id: plant.id, name: `Plant #${plant.id.slice(-4)}`, context: { zoneId: zone.id, plantingId: planting.id } } }); }}
                                                                title="Delete Plant" aria-label="Delete Plant"
                                                            >
                                                                <span className="material-symbols-outlined">delete</span>
                                                            </button>
                                                        </div>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="placeholder-text-small">No plants in this zone.</p>
                )}
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button 
                      className="btn-add-item" 
                      onClick={() => onOpenModal('plantStrain', { activeZoneId: zone.id })}
                      disabled={!canPlantMore}
                      title={canPlantMore ? "Plant a new strain" : "Zone is at maximum plant capacity"}
                      style={{ flex: 1 }}
                    >
                      + Plant Strain
                    </button>
                    {canMassHarvest && (
                        <button
                            className="btn-harvest-all"
                            onClick={() => onHarvest()}
                            style={{ flex: 1 }}
                        >
                            <span className="material-symbols-outlined">content_cut</span>
                            Harvest All ({harvestablePlants.length})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ZonePlantingList;