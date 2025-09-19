import React from 'react';
import { getBlueprints, CultivationMethodBlueprint } from '@/src/game/api';

const AddZoneModalContent = ({ formState, updateForm, handlers, closeModal, selectedRoom }) => {
    return (
        <>
            <h2>Add New Zone</h2>
            <div className="form-group">
                <label htmlFor="zoneName">Zone Name</label>
                <input id="zoneName" type="text" value={formState.newItemName} onChange={(e) => updateForm('newItemName', e.target.value)} placeholder="e.g., Veg Zone 1" />
            </div>
            <div className="form-group">
                <label htmlFor="zoneArea">Area (m²)</label>
                <div className="form-group-inline">
                    <input id="zoneArea" type="number" value={formState.newItemArea} onChange={(e) => updateForm('newItemArea', Number(e.target.value))} min="1" />
                    <button
                        type="button"
                        className="btn-max"
                        onClick={() => updateForm('newItemArea', selectedRoom?.getAvailableArea() || 0)}
                        disabled={!selectedRoom || selectedRoom.getAvailableArea() <= 0}
                    >
                        MAX
                    </button>
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="cultivationMethod">Cultivation Method</label>
                <select id="cultivationMethod" value={formState.newZoneCultivationMethodId || ''} onChange={(e) => updateForm('newZoneCultivationMethodId', e.target.value)}>
                    {Object.values(getBlueprints().cultivationMethods).map((method: CultivationMethodBlueprint) => {
                        const area = formState.newItemArea || 0;
                        const capacity = (method.areaPerPlant && method.areaPerPlant > 0) ? Math.floor(area / method.areaPerPlant) : 0;
                        const totalCost = (method.setupCost || 0) * area;
                        const label = `${method.name} (Plants: ${capacity}, Setup: $${totalCost.toFixed(2)})`;
                        return <option key={method.id} value={method.id}>{label}</option>;
                    })}
                </select>
            </div>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('addZone')}>Cancel</button>
                <button className="btn" onClick={handlers.handleAddZone}>Create Zone</button>
            </div>
        </>
    );
};

export default AddZoneModalContent;