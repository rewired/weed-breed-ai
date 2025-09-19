import React from 'react';
import type { ZoneInfoDTO } from '@/src/game/api';

interface ZoneInfoPanelProps {
  info: ZoneInfoDTO;
  onOpenModal: (type: any, context?: any) => void;
}

const ZoneInfoPanel: React.FC<ZoneInfoPanelProps> = ({ info, onOpenModal }) => {
    const { environment, lightCycle, supplies, lighting, climate, humidity, co2 } = info;
    const temperature = environment.temperature_C;
    const humidityRh = environment.humidity_rh;
    const co2Ppm = environment.co2_ppm;

    return (
      <div className="zone-detail-info-panel">
          {/* General Info */}
          <div className="card">
              <p>Area: <span className="card-info-value">{info.area_m2} m²</span></p>
              <p>Method: <span className="card-info-value">{info.cultivationMethodName ?? 'N/A'}</span></p>
              <p>Plants: <span className="card-info-value">{info.plantCount} / {info.plantCapacity}</span></p>
          </div>
          {/* Supplies */}
          <div className="card">
            <h5>Supplies</h5>
             <div className="env-stats">
                  <span>Water: <span className="card-info-value">{supplies.waterLevel_L?.toFixed(2) ?? '0.00'} L</span></span>
                  <span>Nutrients: <span className="card-info-value">{supplies.nutrientLevel_g?.toFixed(2) ?? '0.00'} g</span></span>
            </div>
            <div className="consumption-display">
                <p>Consumption: <span className="card-info-value">{supplies.consumption.waterPerDay.toFixed(2)} L/day</span>, <span className="card-info-value">{supplies.consumption.nutrientsPerDay.toFixed(2)} g/day</span></p>
            </div>
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                <button className="btn-add-item" style={{flex: 1}} onClick={() => onOpenModal('addSupply', { activeZoneId: info.id, supplyType: 'water' })}>+ Water</button>
                <button className="btn-add-item" style={{flex: 1}} onClick={() => onOpenModal('addSupply', { activeZoneId: info.id, supplyType: 'nutrients' })}>+ Nutrients</button>
            </div>
          </div>
          {/* Lighting */}
           <div className="card">
              <div className="zone-section-header">
                <h5>Lighting</h5>
              </div>
              <div className="lighting-stats">
                  <span>Cycle: <span className="card-info-value">{lightCycle.on}h / {lightCycle.off}h</span></span>
                  <span className={lighting.isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                      Coverage: <span className="card-info-value">{lighting.coverage.toFixed(1)} / {lighting.requiredCoverage.toFixed(1)} m²</span>
                  </span>
                  <span>Avg PPFD: <span className="card-info-value">{lighting.averagePPFD.toFixed(0)} µmol/m²/s</span></span>
                  <span>DLI: <span className="card-info-value">{lighting.dli.toFixed(1)} mol/m²/day</span></span>
              </div>
          </div>
          {/* Environment & Climate */}
          <div className="card">
              <h5>Environment & Climate</h5>
              <div className="env-stats">
                  <span>Temp: <span className="card-info-value">{temperature !== null && temperature !== undefined ? temperature.toFixed(1) : 'N/A'} °C</span></span>
                  <span>RH: <span className="card-info-value">{humidityRh !== null && humidityRh !== undefined ? (humidityRh * 100).toFixed(0) : 'N/A'} %</span></span>
                  <span>CO₂: <span className="card-info-value">{co2Ppm !== null && co2Ppm !== undefined ? co2Ppm.toFixed(0) : 'N/A'} ppm</span></span>
                  <span className={climate.isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                      Airflow: <span className="card-info-value">{climate.actualAirflow.toFixed(0)}/{climate.requiredAirflow.toFixed(0)} m³/h</span>
                  </span>
                  <span className={humidity.isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                    Dehumid.: <span className="card-info-value">{humidity.actualDehumidification.toFixed(2)}/{humidity.requiredDehumidification.toFixed(2)} kg/h</span>
                  </span>
                   <span className={co2.isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                    CO₂ Inj.: <span className="card-info-value">{co2.actualInjectionRate.toFixed(0)}/{co2.requiredInjectionRate.toFixed(0)} ppm/t</span>
                  </span>
              </div>
          </div>
      </div>
    );
};

export default ZoneInfoPanel;