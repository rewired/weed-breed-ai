import React from 'react';
import { roomPurposes, RoomPurpose } from '../../../game/roomPurposes';

const AddRoomModalContent = ({ formState, updateForm, handlers, closeModal, selectedStructure }) => {
    return (
        <>
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
            {formState.newRoomPurpose === 'breakroom' && (
                <div className="sufficiency-preview" style={{marginTop: 0, marginBottom: '1rem'}}>
                    <p>Capacity: <strong>{Math.floor(formState.newItemArea / 4)} employees</strong> (1 per 4m²)</p>
                </div>
            )}
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('addRoom')}>Cancel</button>
                <button className="btn" onClick={handlers.handleAddRoom}>Create Room</button>
            </div>
        </>
    );
};

export default AddRoomModalContent;