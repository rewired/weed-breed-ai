import React from 'react';
import Modal from '../Modal';
import { GameState } from '../../game/types';
import { getBlueprints } from '../../game/blueprints';
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
const AddDeviceModalContent = ({ gameState, formState, updateForm, handlers, closeModal }) => {
    const deviceBlueprints = getBlueprints().devices;
    const devicePrices = getBlueprints().devicePrices;
    const blueprintOptions = Object.values(deviceBlueprints);
    const selectedBlueprint = formState.selectedDeviceBlueprintId ? deviceBlueprints[formState.selectedDeviceBlueprintId] : null;
    const priceInfo = formState.selectedDeviceBlueprintId ? devicePrices[formState.selectedDeviceBlueprintId] : null;

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
        {selectedBlueprint && priceInfo && (
            <p><strong>Cost:</strong> ${priceInfo.capitalExpenditure.toLocaleString()}</p>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => closeModal('addDevice')}>Cancel</button>
          <button className="btn" onClick={handlers.handleAddDevice} disabled={!priceInfo || gameState.company.capital < priceInfo.capitalExpenditure}>
            Purchase & Install
          </button>
        </div>
      </>
    );
};


interface ModalsProps {
    gameState: GameState;
    modalState: any;
    formState: any;
    closeModal: (type: any) => void;
    updateForm: (field: any, value: any) => void;
    resetForm: () => void;
    handlers: any;
}

export const Modals: React.FC<ModalsProps> = ({ gameState, modalState, formState, closeModal, updateForm, resetForm, handlers }) => {
    return (
        <>
            <Modal isOpen={modalState.rent} onClose={() => closeModal('rent')}>
                <RentModalContent {...{ gameState, formState, updateForm, handlers, closeModal }} />
            </Modal>

            <Modal isOpen={modalState.addRoom} onClose={() => closeModal('addRoom')}>
                <h2>Add New Room</h2>
                <div className="form-group">
                    <label htmlFor="roomName">Room Name</label>
                    <input id="roomName" type="text" value={formState.newItemName} onChange={(e) => updateForm('newItemName', e.target.value)} placeholder="e.g., Grow Room A" />
                </div>
                <div className="form-group">
                    <label htmlFor="roomArea">Area (m²)</label>
                    <input id="roomArea" type="number" value={formState.newItemArea} onChange={(e) => updateForm('newItemArea', Number(e.target.value))} min="1" />
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
                    <input id="zoneArea" type="number" value={formState.newItemArea} onChange={(e) => updateForm('newItemArea', Number(e.target.value))} min="1" />
                </div>
                <div className="form-group">
                    <label htmlFor="cultivationMethod">Cultivation Method</label>
                    <select id="cultivationMethod" value={formState.newZoneCultivationMethodId || ''} onChange={(e) => updateForm('newZoneCultivationMethodId', e.target.value)}>
                        {Object.values(getBlueprints().cultivationMethods).map((method: any) => <option key={method.id} value={method.id}>{method.name}</option>)}
                    </select>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => closeModal('addZone')}>Cancel</button>
                    <button className="btn" onClick={handlers.handleAddZone}>Create Zone</button>
                </div>
            </Modal>
            
            <Modal isOpen={modalState.addDevice} onClose={() => closeModal('addDevice')}>
                <AddDeviceModalContent {...{ gameState, formState, updateForm, handlers, closeModal }} />
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
