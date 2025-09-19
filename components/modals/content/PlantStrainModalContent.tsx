import React, { useState, useEffect } from 'react';
import { getBlueprints, getAvailableStrains } from '@/src/game/api';

const getNestedProperty = (obj: any, path: string) => {
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
};


const PlantStrainModalContent = ({ gameState, selectedRoom, modalState, formState, updateForm, handlers, closeModal }) => {
    const [compatibilityWarning, setCompatibilityWarning] = useState<string | null>(null);

    const availableStrains = getAvailableStrains(gameState.company);
    const strainOptions = Object.values(availableStrains);
    const strainPrices = getBlueprints().strainPrices;
    
    const selectedStrain = formState.plantStrainId ? availableStrains[formState.plantStrainId] : null;
    const selectedStrainPrice = formState.plantStrainId ? strainPrices[formState.plantStrainId]?.seedPrice : 0;
    const totalCost = (selectedStrainPrice || 0) * formState.plantQuantity;
    const canAfford = gameState.company.capital >= totalCost;

    const zone = selectedRoom && modalState.activeZoneId ? selectedRoom.zones[modalState.activeZoneId] : null;

    useEffect(() => {
        setCompatibilityWarning(null);
        if (!selectedStrain || !zone) return;

        const cultivationMethod = getBlueprints().cultivationMethods[zone.cultivationMethodId];
        const conflicts = cultivationMethod?.strainTraitCompatibility?.conflicting;

        if (!conflicts) return;

        for (const [traitPath, rule] of Object.entries(conflicts)) {
            const strainValue = getNestedProperty(selectedStrain, traitPath);
            if (typeof strainValue !== 'number') continue;

            let isConflict = false;
            let message = '';
            if (rule.min !== undefined && strainValue >= rule.min) {
                isConflict = true;
                message = `Warning: This strain's high ${traitPath.split('.').pop()} may conflict with the ${cultivationMethod.name} method.`;
            } else if (rule.max !== undefined && strainValue <= rule.max) {
                isConflict = true;
                message = `Warning: This strain's low ${traitPath.split('.').pop()} may conflict with the ${cultivationMethod.name} method.`;
            }

            if (isConflict) {
                setCompatibilityWarning(message);
                break; // Show first warning found
            }
        }

    }, [selectedStrain, zone, formState.plantStrainId]);

    let availableSpace = 0;
    if (zone) {
      const capacity = zone.getPlantCapacity();
      const currentCount = zone.getTotalPlantedCount();
      availableSpace = capacity - currentCount;
    }
    const quantity = Number(formState.plantQuantity) || 0;
    const willExceedCapacity = quantity > availableSpace;

    const canPlant = canAfford && quantity > 0 && !willExceedCapacity;

    return (
        <>
            <h2>Plant a Strain</h2>
            <div className="form-group">
                <label htmlFor="plantStrainId">Strain to Plant</label>
                <select id="plantStrainId" value={formState.plantStrainId || ''} onChange={(e) => updateForm('plantStrainId', e.target.value)}>
                    {strainOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="plantQuantity">Number of Plants</label>
                <div className="form-group-inline">
                    <input id="plantQuantity" type="number" value={formState.plantQuantity} onChange={(e) => updateForm('plantQuantity', Number(e.target.value))} min="1" />
                    <button type="button" className="btn-max" onClick={() => updateForm('plantQuantity', availableSpace)} disabled={availableSpace <= 0}>MAX</button>
                </div>
            </div>

            {compatibilityWarning && (
                <div className="compatibility-warning">
                    <p>{compatibilityWarning}</p>
                </div>
            )}

            <p><strong>Total Seed Cost:</strong> ${totalCost.toFixed(2)}</p>
            {selectedStrain && typeof selectedStrain.germinationRate === 'number' && (
              <p><strong>Expected Germination Rate:</strong> {(selectedStrain.germinationRate * 100).toFixed(0)}%</p>
            )}
            <p><strong>Available Space:</strong> {availableSpace} plant slots</p>
            {!canAfford && <p style={{color: 'var(--danger-color)'}}>You do not have enough capital for this.</p>}
            {willExceedCapacity && <p style={{color: 'var(--danger-color)'}}>This quantity exceeds the zone's capacity.</p>}

            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('plantStrain')}>Cancel</button>
                <button className="btn" onClick={handlers.handlePlantStrain} disabled={!canPlant}>
                    Plant
                </button>
            </div>
        </>
    );
};

export default PlantStrainModalContent;