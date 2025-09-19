import React from 'react';
import { getBlueprints } from '@/src/game/api';

const EditDeviceModalContent = ({ modalState, formState, updateForm, handlers, closeModal, selectedRoom }) => {
    if (!modalState.itemToEdit || !selectedRoom) return null;

    const { blueprintId, name, context } = modalState.itemToEdit;
    const zone = selectedRoom.zones[context.zoneId];
    
    if (!zone) return <p>Zone not found.</p>;
    
    const blueprint = getBlueprints().devices[blueprintId];
    if (!blueprint) return <p>Blueprint not found.</p>;

    const blueprintSettings = blueprint.settings || {};
    let settingsContent = null;

    if (blueprint.kind === 'ClimateUnit') {
        const [min, max] = blueprintSettings.targetTemperatureRange || [15, 35];
        const currentValue = formState.deviceTargetTemp ?? min;
        settingsContent = (
            <div className="form-group">
                <label htmlFor="deviceTargetTemp">Target Temperature: {currentValue}°C</label>
                <input
                    id="deviceTargetTemp"
                    type="range"
                    min={min}
                    max={max}
                    step="1"
                    value={currentValue}
                    onChange={(e) => updateForm('deviceTargetTemp', Number(e.target.value))}
                />
            </div>
        );
    } else if (blueprint.kind === 'HumidityControlUnit') {
        const [min, max] = [30, 80]; // Example range
        const currentValue = formState.deviceTargetHumidity ?? 60;
         settingsContent = (
            <div className="form-group">
                <label htmlFor="deviceTargetHumidity">Target Humidity: {currentValue}%</label>
                <input
                    id="deviceTargetHumidity"
                    type="range"
                    min={min}
                    max={max}
                    step="1"
                    value={currentValue}
                    onChange={(e) => updateForm('deviceTargetHumidity', Number(e.target.value))}
                />
            </div>
        );
    } else if (blueprint.kind === 'CO2Injector') {
        const [min, max] = blueprintSettings.targetCO2Range || [400, 1500];
        const currentValue = formState.deviceTargetCO2 ?? min;
        settingsContent = (
            <div className="form-group">
                <label htmlFor="deviceTargetCO2">Target CO₂ Concentration: {currentValue} ppm</label>
                <input
                    id="deviceTargetCO2"
                    type="range"
                    min={min}
                    max={max}
                    step="50"
                    value={currentValue}
                    onChange={(e) => updateForm('deviceTargetCO2', Number(e.target.value))}
                />
            </div>
        );
    } else {
        return <p>This device has no adjustable settings.</p>;
    }

    return (
        <>
            <h2>Settings for all {name}s</h2>
            {settingsContent}
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('editDevice')}>Cancel</button>
                <button className="btn" onClick={handlers.handleEditDeviceSettings}>Save Settings</button>
            </div>
        </>
    );
};

export default EditDeviceModalContent;