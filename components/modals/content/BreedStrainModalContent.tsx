import React from 'react';
import { getAvailableStrains } from '../../../game/blueprints';
import { StrainBlueprint } from '../../../game/types';

const TraitDisplay = ({ strain }: { strain: StrainBlueprint | null }) => {
    if (!strain) return <div className="trait-display"></div>;
    return (
        <div className="trait-display">
            <h4>{strain.name}</h4>
            <p>THC: <strong>{(strain.chemotype.thcContent * 100).toFixed(1)}%</strong></p>
            <p>Flower Time: <strong>{strain.photoperiod.floweringDays} days</strong></p>
            <p>S/I/R: <strong>{Math.round(strain.genotype.sativa*100)}/{Math.round(strain.genotype.indica*100)}/{Math.round(strain.genotype.ruderalis*100)}</strong></p>
        </div>
    );
};


const BreedStrainModalContent = ({ gameState, formState, updateForm, handlers, closeModal }) => {
    const availableStrains = getAvailableStrains(gameState.company);
    const strainOptions = Object.values(availableStrains);

    const parentA = formState.parentAId ? availableStrains[formState.parentAId] : null;
    const parentB = formState.parentBId ? availableStrains[formState.parentBId] : null;
    
    const canBreed = parentA && parentB && formState.newStrainName.trim() !== '' && parentA.id !== parentB.id;

    return (
        <>
            <h2>Breed New Strain</h2>
            <div className="form-group">
                <label htmlFor="newStrainName">Offspring Name</label>
                <input id="newStrainName" type="text" value={formState.newStrainName} onChange={(e) => updateForm('newStrainName', e.target.value)} placeholder="e.g., Green Wonder" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="parentA">Parent A</label>
                    <select id="parentA" value={formState.parentAId || ''} onChange={(e) => updateForm('parentAId', e.target.value)}>
                        {strainOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="parentB">Parent B</label>
                    <select id="parentB" value={formState.parentBId || ''} onChange={(e) => updateForm('parentBId', e.target.value)}>
                        {strainOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'var(--background-color)', padding: '1rem', borderRadius: '4px' }}>
                <TraitDisplay strain={parentA} />
                <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
                <TraitDisplay strain={parentB} />
            </div>

            {parentA?.id === parentB?.id && <p style={{color: 'var(--warning-color)', textAlign: 'center', marginTop: '1rem'}}>Please select two different parent strains.</p>}

            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('breedStrain')}>Cancel</button>
                <button className="btn" onClick={handlers.handleBreedStrain} disabled={!canBreed}>
                    Breed
                </button>
            </div>
        </>
    );
};

export default BreedStrainModalContent;