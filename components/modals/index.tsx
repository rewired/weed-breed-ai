import React from 'react';
import Modal from '../Modal';
import { GameState, StrainBlueprint, Room, CultivationMethodBlueprint, Structure } from '../../game/types';
import { getAvailableStrains, getBlueprints } from '../../game/blueprints';
import { roomPurposes, RoomPurpose } from '../../game/roomPurposes';

// A helper component for the Rent Structure modal content
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

// A helper component for the Add Device modal content
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

const PlantStrainModalContent = ({ gameState, selectedRoom, modalState, formState, updateForm, handlers, closeModal }) => {
    const availableStrains = getAvailableStrains(gameState.company);
    const strainOptions = Object.values(availableStrains);
    const strainPrices = getBlueprints().strainPrices;
    
    const selectedStrainPrice = formState.plantStrainId ? strainPrices[formState.plantStrainId]?.seedPrice : 0;
    const totalCost = (selectedStrainPrice || 0) * formState.plantQuantity;
    const canAfford = gameState.company.capital >= totalCost;

    const zone = selectedRoom && modalState.activeZoneId ? selectedRoom.zones[modalState.activeZoneId] : null;
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

            <p><strong>Total Seed Cost:</strong> ${totalCost.toFixed(2)}</p>
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

const NewGameModalContent = ({ formState, updateForm, handlers, closeModal }) => {
    return (
        <>
            <h2>Start New Game</h2>
            <p>Welcome! Please name your new company to begin.</p>
            <div className="form-group">
                <label htmlFor="companyName">Company Name</label>
                <input id="companyName" type="text" value={formState.newCompanyName} onChange={(e) => updateForm('newCompanyName', e.target.value)} placeholder="e.g., GreenLeaf Inc." />
            </div>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('newGame')}>Cancel</button>
                <button className="btn" onClick={handlers.handleStartNewGame}>Start Game</button>
            </div>
        </>
    );
};

const SaveGameModalContent = ({ formState, updateForm, handlers, closeModal, dynamicData }) => {
    const saveGames = dynamicData.saveGames || [];
    return (
        <>
            <h2>Save Game</h2>
            <div className="form-group">
                <label htmlFor="saveGameName">Save Name</label>
                <input id="saveGameName" type="text" value={formState.saveGameName} onChange={(e) => updateForm('saveGameName', e.target.value)} />
            </div>
            {saveGames.length > 0 && (
                <div className="form-group">
                    <label>Or Overwrite Existing</label>
                    <div className="save-game-list">
                        {saveGames.map(name => (
                            <button key={name} className="btn-list-item" onClick={() => updateForm('saveGameName', name)}>
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('save')}>Cancel</button>
                <button className="btn" onClick={handlers.handleSaveGame} disabled={!formState.saveGameName.trim()}>Save</button>
            </div>
        </>
    );
};

const LoadGameModalContent = ({ handlers, closeModal, dynamicData }) => {
    const saveGames = dynamicData.saveGames || [];
    return (
        <>
            <h2>Load Game</h2>
            {saveGames.length > 0 ? (
                <div className="save-game-list">
                    {saveGames.map(name => (
                        <div key={name} className="save-game-list-item">
                            <span>{name}</span>
                            <div className="save-game-list-actions">
                                <button className="btn-delete" onClick={() => handlers.handleDeleteGame(name)}>Delete</button>
                                <button className="btn" onClick={() => handlers.handleLoadGame(name)}>Load</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="placeholder-text">No saved games found.</p>
            )}
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('load')}>Cancel</button>
            </div>
        </>
    );
};


interface ModalsProps {
    gameState: GameState;
    selectedRoom: Room | null;
    selectedStructure: Structure | null;
    modalState: any;
    formState: any;
    closeModal: (type: any) => void;
    updateForm: (field: any, value: any) => void;
    resetForm: () => void;
    handlers: any;
    dynamicData: any;
}

export const Modals: React.FC<ModalsProps> = ({ gameState, selectedRoom, selectedStructure, modalState, formState, closeModal, updateForm, resetForm, handlers, dynamicData }) => {
    return (
        <>
            <Modal isOpen={modalState.rent} onClose={() => closeModal('rent')}>
                <RentModalContent {...{ gameState, formState, updateForm, handlers, closeModal }} />
            </Modal>
            
            <Modal isOpen={modalState.newGame} onClose={() => closeModal('newGame')}>
                <NewGameModalContent {...{ formState, updateForm, handlers, closeModal }} />
            </Modal>

            <Modal isOpen={modalState.save} onClose={() => closeModal('save')}>
                <SaveGameModalContent {...{ formState, updateForm, handlers, closeModal, dynamicData }} />
            </Modal>
            
            <Modal isOpen={modalState.load} onClose={() => closeModal('load')}>
                <LoadGameModalContent {...{ handlers, closeModal, dynamicData }} />
            </Modal>

            <Modal isOpen={modalState.addRoom} onClose={() => closeModal('addRoom')}>
                <h2>Add New Room</h2>
                <div className="form-group">
                    <label htmlFor="roomName">Room Name</label>
                    <input id="roomName" type="text" value={formState.newItemName} onChange={(e) => updateForm('newItemName', e.target.value)} placeholder="e.g., Grow Room A" />
                </div>
                <div className="form-group">
                    <label htmlFor="roomArea">Area (m²)</label>
                    <div className="form-group-inline">
                        <input id="roomArea" type="number" value={formState.newItemArea} onChange={(e) => updateForm('newItemArea', Number(e.target.value))} min="1" />
                        <button
                            type="button"
                            className="btn-max"
                            onClick={() => updateForm('newItemArea', selectedStructure?.getAvailableArea() || 0)}
                            disabled={!selectedStructure || selectedStructure.getAvailableArea() <= 0}
                        >
                            MAX
                        </button>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="roomPurpose">Purpose</label>
                    <select id="roomPurpose" value={formState.newRoomPurpose} onChange={(e) => updateForm('newRoomPurpose', e.target.value as RoomPurpose)}>
                        {roomPurposes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => closeModal('addRoom')}>Cancel</button>
                    <button className="btn" onClick={handlers.handleAddRoom}>Create Room</button>
                </div>
            </Modal>

            <Modal isOpen={modalState.addZone} onClose={() => closeModal('addZone')}>
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
            </Modal>
            
            <Modal isOpen={modalState.addDevice} onClose={() => closeModal('addDevice')}>
                <AddDeviceModalContent {...{ gameState, formState, updateForm, handlers, closeModal, selectedRoom, selectedStructure, modalState }} />
            </Modal>

            <Modal isOpen={modalState.breedStrain} onClose={() => closeModal('breedStrain')}>
                <BreedStrainModalContent {...{ gameState, formState, updateForm, handlers, closeModal }} />
            </Modal>

            <Modal isOpen={modalState.plantStrain} onClose={() => closeModal('plantStrain')}>
                <PlantStrainModalContent {...{ gameState, selectedRoom, modalState, formState, updateForm, handlers, closeModal }} />
            </Modal>

            <Modal isOpen={modalState.reset} onClose={() => closeModal('reset')}>
                <h2>Reset Simulation</h2>
                <p>Are you sure you want to reset the game? All your progress will be permanently lost.</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => closeModal('reset')}>Cancel</button>
                    <button className="btn btn-danger" onClick={handlers.handleResetConfirm}>Reset Game</button>
                </div>
            </Modal>

            <Modal isOpen={modalState.rename} onClose={() => closeModal('rename')}>
                <h2>Rename Item</h2>
                <div className="form-group">
                    <label htmlFor="renameInput">New Name</label>
                    <input id="renameInput" type="text" value={formState.renameValue} onChange={(e) => updateForm('renameValue', e.target.value)} />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => closeModal('rename')}>Cancel</button>
                    <button className="btn" onClick={handlers.handleRenameItem}>Save</button>
                </div>
            </Modal>

            <Modal isOpen={modalState.delete} onClose={() => closeModal('delete')}>
                <h2>Confirm Deletion</h2>
                <p>Are you sure you want to delete <strong>{modalState.itemToDelete?.name}</strong>? This action cannot be undone.</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => closeModal('delete')}>Cancel</button>
                    <button className="btn btn-danger" onClick={handlers.handleDeleteItem}>Delete</button>
                </div>
            </Modal>
        </>
    );
};