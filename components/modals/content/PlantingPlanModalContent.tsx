import React from 'react';
import { getAvailableStrains } from '../../../game/blueprints';

const PlantingPlanModalContent = ({ gameState, selectedRoom, modalState, formState, updateForm, handlers, closeModal }) => {
    if (!selectedRoom || !modalState.activeZoneId) return null;
    const zone = selectedRoom.zones[modalState.activeZoneId];
    if (!zone) return null;

    const availableStrains = getAvailableStrains(gameState.company);
    const strainOptions = Object.values(availableStrains);

    return (
        <>
            <h2>Planting Plan for {zone.name}</h2>
            <div className="form-group">
                <label htmlFor="plantStrainId">Strain</label>
                <select id="plantStrainId" value={formState.plantStrainId || ''} onChange={(e) => updateForm('plantStrainId', e.target.value)}>
                    {strainOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
             <div className="form-group">
                <label htmlFor="plantQuantity">Quantity</label>
                <div className="form-group-inline">
                    <input id="plantQuantity" type="number" value={formState.plantQuantity} onChange={(e) => updateForm('plantQuantity', Number(e.target.value))} min="1" max={zone.getPlantCapacity()} />
                    <button type="button" className="btn-max" onClick={() => updateForm('plantQuantity', zone.getPlantCapacity())}>MAX</button>
                </div>
            </div>
            <div className="form-group">
                 <label htmlFor="autoReplantToggle" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="autoReplantToggle"
                        checked={formState.plantingPlanAutoReplant}
                        onChange={(e) => updateForm('plantingPlanAutoReplant', e.target.checked)}
                    />
                    Enable Auto-Replant
                </label>
            </div>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('plantingPlan')}>Cancel</button>
                <button className="btn" onClick={() => handlers.handleSetPlantingPlan(false)}>Save Plan</button>
                 {zone.plantingPlan && (
                    <button className="btn btn-danger" onClick={() => handlers.handleSetPlantingPlan(true)}>Delete Plan</button>
                )}
            </div>
        </>
    );
};

export default PlantingPlanModalContent;