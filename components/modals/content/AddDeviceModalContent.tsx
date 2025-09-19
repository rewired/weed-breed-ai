import React from 'react';
import { getBlueprints } from '@/src/game/api';

const AddDeviceModalContent = ({ gameState, formState, updateForm, handlers, closeModal, selectedRoom, selectedStructure, modalState }) => {
    const deviceBlueprints = getBlueprints().devices;
    const devicePrices = getBlueprints().devicePrices;
    const blueprintOptions = Object.values(deviceBlueprints);
    
    const selectedBlueprint = formState.selectedDeviceBlueprintId ? deviceBlueprints[formState.selectedDeviceBlueprintId] : null;
    const priceInfo = formState.selectedDeviceBlueprintId ? devicePrices[formState.selectedDeviceBlueprintId] : null;
    
    const quantity = formState.deviceQuantity || 1;
    const totalCost = (priceInfo?.capitalExpenditure || 0) * quantity;
    const canAfford = gameState.company.capital >= totalCost;
    const isValidQuantity = quantity > 0;
    
    const zone = selectedRoom && modalState.activeZoneId ? selectedRoom.zones[modalState.activeZoneId] : null;

    let sufficiencyPreview = null;
    if (zone && selectedBlueprint && isValidQuantity) {
        const kind = selectedBlueprint.kind;
        const settings = selectedBlueprint.settings || {};

        if (kind === 'Lamp' && settings.coverageArea) {
            const currentLighting = zone.getLightingDetails();
            const newCoverage = settings.coverageArea * quantity;
            const projectedCoverage = currentLighting.coverage + newCoverage;
            const isSufficient = projectedCoverage >= zone.area_m2;
            sufficiencyPreview = (
                <div className="sufficiency-preview">
                    <h4>Projected Sufficiency</h4>
                    <p>
                        Current Coverage: {currentLighting.coverage.toFixed(1)} m² <br/>
                        Projected Total: <span className={isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                            {projectedCoverage.toFixed(1)} / {zone.area_m2.toFixed(1)} m²
                        </span>
                    </p>
                </div>
            );
        } else if (kind === 'ClimateUnit' && settings.airflow && selectedStructure) {
            const currentClimate = zone.getClimateControlDetails(selectedStructure.height_m);
            const newAirflow = settings.airflow * quantity;
            const projectedAirflow = currentClimate.actualAirflow + newAirflow;
            const isSufficient = projectedAirflow >= currentClimate.requiredAirflow;
            sufficiencyPreview = (
                <div className="sufficiency-preview">
                    <h4>Projected Sufficiency</h4>
                    <p>
                        Required Airflow: {currentClimate.requiredAirflow.toFixed(0)} m³/h <br/>
                        Projected Total: <span className={isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                            {projectedAirflow.toFixed(0)} / {currentClimate.requiredAirflow.toFixed(0)} m³/h
                        </span>
                    </p>
                </div>
            );
        } else if (kind === 'Dehumidifier' || kind === 'HumidityControlUnit') {
            const currentHumidity = zone.getHumidityControlDetails();
            const newDehumidification = (settings.latentRemovalKgPerTick || settings.dehumidifyRateKgPerTick || 0) * quantity;
            const projectedDehumidification = currentHumidity.actualDehumidification + newDehumidification;
            const isSufficient = projectedDehumidification >= currentHumidity.requiredDehumidification;
             sufficiencyPreview = (
                <div className="sufficiency-preview">
                    <h4>Projected Sufficiency</h4>
                    <p>
                        Required Dehumid.: {currentHumidity.requiredDehumidification.toFixed(2)} kg/h <br/>
                        Projected Total: <span className={isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                            {projectedDehumidification.toFixed(2)} / {currentHumidity.requiredDehumidification.toFixed(2)} kg/h
                        </span>
                    </p>
                </div>
            );
        } else if (kind === 'CO2Injector' && settings.pulsePpmPerTick) {
            const currentCO2 = zone.getCO2Details();
            const newInjection = settings.pulsePpmPerTick * quantity;
            const projectedInjection = currentCO2.actualInjectionRate + newInjection;
            const isSufficient = projectedInjection >= currentCO2.requiredInjectionRate;
            sufficiencyPreview = (
                <div className="sufficiency-preview">
                    <h4>Projected Sufficiency</h4>
                    <p>
                        Required CO₂ Inj.: {currentCO2.requiredInjectionRate.toFixed(0)} ppm/t <br/>
                        Projected Total: <span className={isSufficient ? 'lighting-ok' : 'lighting-insufficient'}>
                            {projectedInjection.toFixed(0)} / {currentCO2.requiredInjectionRate.toFixed(0)} ppm/t
                        </span>
                    </p>
                </div>
            );
        }
    }

    return (
      <>
        <h2>Install New Device</h2>
        <p>Select a device to install in this zone.</p>
         <div className="form-group">
          <label htmlFor="deviceBlueprint">Device Type</label>
          <select id="deviceBlueprint" value={formState.selectedDeviceBlueprintId || ''} onChange={(e) => updateForm('selectedDeviceBlueprintId', e.target.value)}>
            {blueprintOptions.map((bp) => <option key={bp.id} value={bp.id}>{bp.name}</option>)}
          </select>
        </div>
        
        <div className="form-group">
            <label htmlFor="deviceQuantity">Quantity</label>
            <input id="deviceQuantity" type="number" value={formState.deviceQuantity} onChange={(e) => updateForm('deviceQuantity', Number(e.target.value))} min="1" />
        </div>

        {sufficiencyPreview}

        {selectedBlueprint && priceInfo && (
            <p style={{marginTop: '1rem'}}><strong>Total Cost:</strong> ${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
        )}
        {!canAfford && <p style={{color: 'var(--danger-color)'}}>You do not have enough capital for this purchase.</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => closeModal('addDevice')}>Cancel</button>
          <button className="btn" onClick={handlers.handleAddDevice} disabled={!priceInfo || !canAfford || !isValidQuantity}>
            Purchase & Install
          </button>
        </div>
      </>
    );
};

export default AddDeviceModalContent;