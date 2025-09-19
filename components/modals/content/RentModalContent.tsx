import React from 'react';
import { getBlueprints } from '@/src/game/api';

const RentModalContent = ({ gameState, formState, updateForm, handlers, closeModal }) => {
    const structureBlueprints = getBlueprints().structures;
    const blueprintOptions = Object.values(structureBlueprints);
    const selectedBlueprint = formState.selectedStructureBlueprintId ? structureBlueprints[formState.selectedStructureBlueprintId] : null;

    if (!selectedBlueprint) {
        return <p className="placeholder-text">No structure types available.</p>;
    }

    const area = selectedBlueprint.footprint.length_m * selectedBlueprint.footprint.width_m;
    const monthlyRent = area * selectedBlueprint.rentalCostPerSqmPerMonth;

    return (
        <>
            <h2>Rent New Structure</h2>
            <p>Choose a structure to expand your operations.</p>
            <div className="form-group">
                <label htmlFor="structureBlueprint">Structure Type</label>
                <select id="structureBlueprint" value={formState.selectedStructureBlueprintId || ''} onChange={(e) => updateForm('selectedStructureBlueprintId', e.target.value)}>
                    {blueprintOptions.map((bp) => <option key={bp.id} value={bp.id}>{bp.name}</option>)}
                </select>
            </div>
            <ul>
                <li><strong>Dimensions:</strong> {selectedBlueprint.footprint.length_m}m x {selectedBlueprint.footprint.width_m}m</li>
                <li><strong>Area:</strong> {area} m²</li>
                <li><strong>Upfront Fee:</strong> ${selectedBlueprint.upfrontFee.toLocaleString()}</li>
                <li><strong>Monthly Rent:</strong> ${monthlyRent.toLocaleString()}</li>
            </ul>
            <p>The upfront fee will be deducted immediately. The rent will be deducted from your capital over time.</p>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('rent')}>Cancel</button>
                <button className="btn" onClick={handlers.handleRentStructure} disabled={gameState.company.capital < selectedBlueprint.upfrontFee}>Confirm & Rent</button>
            </div>
        </>
    );
};

export default RentModalContent;