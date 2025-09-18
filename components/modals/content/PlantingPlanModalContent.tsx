import React, { useState, useEffect } from 'react';
import { getAvailableStrains, getBlueprints } from '../../../game/blueprints';
import { StrainBlueprint } from '../../../game/types';

const getNestedProperty = (obj: any, path: string) => {
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
};

const PlantingPlanModalContent = ({ gameState, selectedRoom, modalState, formState, updateForm, handlers, closeModal }) => {
    const [compatibilityWarning, setCompatibilityWarning] = useState<string | null>(null);

    if (!selectedRoom || !modalState.activeZoneId) return null;
    const zone = selectedRoom.zones[modalState.activeZoneId];
    if (!zone) return null;

    const availableStrains = getAvailableStrains(gameState.company);
    const strainOptions = Object.values(availableStrains);
    const selectedStrain = formState.plantStrainId ? availableStrains[formState.plantStrainId] : null;

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
            
            {compatibilityWarning && (
                <div className="compatibility-warning">
                    <p>{compatibilityWarning}</p>
                </div>
            )}

            <div className="form-group policy-item">
                <label>Enable Auto-Replant</label>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={formState.plantingPlanAutoReplant}
                        onChange={(e) => updateForm('plantingPlanAutoReplant', e.target.checked)}
                    />
                    <span className="slider round"></span>
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