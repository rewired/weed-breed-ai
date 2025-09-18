import React from 'react';
import { Zone, Company } from '../game/types';
import { getAvailableStrains } from '../game/blueprints';

interface ZonePlantingPlanProps {
    zone: Zone;
    company: Company;
    onOpenModal: (type: any, context?: any) => void;
    onToggleAutoReplant: (zoneId: string) => void;
    onDeletePlantingPlan: (zoneId: string) => void;
}

const ZonePlantingPlan: React.FC<ZonePlantingPlanProps> = ({ zone, company, onOpenModal, onToggleAutoReplant, onDeletePlantingPlan }) => {
    const { plantingPlan } = zone;
    const allStrains = getAvailableStrains(company);

    return (
        <div className="card">
            <h5>Planting Plan</h5>
            {plantingPlan ? (
                <div>
                    <p style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                            Strain: <span className="card-info-value">{allStrains[plantingPlan.strainId]?.name || 'N/A'}</span>
                        </span>
                         <span>
                            Quantity: <span className="card-info-value">{plantingPlan.quantity}</span>
                        </span>
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <label htmlFor="autoReplantToggle" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="autoReplantToggle"
                                checked={plantingPlan.autoReplant}
                                onChange={() => onToggleAutoReplant(zone.id)}
                            />
                            Auto-Replant
                        </label>
                         <div className="card__actions">
                            <button 
                                className="btn-action-icon"
                                onClick={() => onOpenModal('plantingPlan', { activeZoneId: zone.id })}
                                title="Edit Plan"
                            >
                                <span className="material-symbols-outlined">edit</span>
                            </button>
                             <button 
                                className="btn-action-icon delete"
                                onClick={() => onDeletePlantingPlan(zone.id)}
                                title="Delete Plan"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <p className="placeholder-text-small">No plan configured. Create one to enable auto-replanting.</p>
                    <button 
                        className="btn-add-item" 
                        onClick={() => onOpenModal('plantingPlan', { activeZoneId: zone.id })}
                    >
                        + Create Plan
                    </button>
                </>
            )}
        </div>
    );
};

export default ZonePlantingPlan;