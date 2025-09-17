import React from 'react';
import { Zone, Structure } from '../game/types';
import { getBlueprints } from '../game/blueprints';

interface ZoneInfoPanelProps {
  zone: Zone;
  structure: Structure;
  onOpenModal: (type: any, context?: any) => void;
  supplyConsumption: {
    waterPerDay: number;
    nutrientsPerDay: number;
  };
}

const ZoneInfoPanel: React.FC<ZoneInfoPanelProps> = ({ zone, structure, onOpenModal, supplyConsumption }) => {
    const { temperature_C, humidity_rh, co2_ppm } = zone.currentEnvironment;
    const plantCapacity = zone.getPlantCapacity();
    const plantCount = zone.getTotalPlantedCount();
    const cultivationMethod = getBlueprints().cultivationMethods[zone.cultivationMethodId];
    
    const lightingDetails = zone.getLightingDetails();
    // FIX: Round values before comparison to avoid floating-point inaccuracies.
    // A sum of multiple `1.2` values can result in `29.999...` which is less than 30.
    const isLightingSufficient = Math.round(lightingDetails.coverage * 100) >= Math.round(zone.area_m2 * 100);
    
    const climateDetails = zone.getClimateControlDetails(structure.height_m);
    const isClimateSufficient = climateDetails.isSufficient;

    const humidityDetails = zone.getHumidityControlDetails();
    const isHumiditySufficient = humidityDetails.isSufficient;

    const co2Details = zone.getCO2Details();
    const isCO2Sufficient = co2Details.isSufficient;

    return (
      <div className="zone-detail-info-panel">
          {/* General Info */}
          <div className="card">
              <p>Area: {zone.area_m2} m²</p>
              <p>Method: {cultivationMethod ? cultivationMethod.name : 'N/A'}</p>
              <p>Plants: {plantCount} / {plantCapacity}</p>
          </div>
          {/* Supplies */}
          <div className="card">
            <h5>Supplies</h5>
             <div className="env-stats">
                  <span>Water: {zone.waterLevel_L?.toFixed(2) ?? '0.00'} L</span>
                  <span>Nutrients: {zone.nutrientLevel_g?.toFixed(2) ?? '0.00'} g</span>
            </div>
            <div className="consumption-display">
                <p>Consumption: {supplyConsumption.waterPerDay.toFixed(2)} L/day, {supplyConsumption.nutrientsPerDay.toFixed(2)} g/day</p>
            </div>
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                <button className="btn-add-item" style={{flex: 1}} onClick={() => onOpenModal('addSupply', { activeZoneId: zone.id, supplyType: 'water' })}>+ Water</button>
                <button className="btn-add-item" style={{flex: 1}} onClick={() => onOpenModal('addSupply', { activeZoneId: zone.id, supplyType: 'nutrients' })}>+ Nutrients</button>
            </div>
          </div>
          {/* Lighting */}
           <div className="card">
              <div className="zone-section-header">
                <h5>Lighting</h5>
                <button className="btn-action-icon" onClick={() => onOpenModal('editLightCycle', { activeZoneId: zone.id })} title="Edit Light Cycle" aria-label="Edit Light Cycle">
                  <span className="material-symbols-outlined">schedule</span>
                </button>
              </div>
              <div className="lighting-stats">
                  <span>Cycle: {zone.lightCycle.on}h / {zone.lightCycle.off}h</span>
                  <span className={isLightingSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                      Coverage: {lightingDetails.coverage.toFixed(1)} / {zone.area_m2.toFixed(1)} m²
                  </span>
                  <span>Avg PPFD: {lightingDetails.averagePPFD.toFixed(0)} µmol/m²/s</span>
                  <span>DLI: {lightingDetails.dli.toFixed(1)} mol/m²/day</span>
              </div>
          </div>
          {/* Climate */}
          <div className="card">
              <h5>Climate</h5>
              <div className="climate-stats">
                  <span className={isClimateSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                      Airflow: {climateDetails.actualAirflow.toFixed(0)} / {climateDetails.requiredAirflow.toFixed(0)} m³/h
                  </span>
              </div>
          </div>
          {/* Environment */}
          <div className="card">
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
      </div>
    );
};

export default ZoneInfoPanel;