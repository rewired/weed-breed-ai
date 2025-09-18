import React from 'react';

const EditLightCycleModalContent = ({ formState, updateForm, handlers, closeModal }) => {
    const onHours = formState.lightCycleOnHours;
    const offHours = 24 - onHours;
    return (
        <>
            <h2>Edit Light Cycle</h2>
            <p>Set the daily hours of light for this zone.</p>
            <div className="form-group">
                <label htmlFor="lightCycleSlider">Light Schedule: {onHours}h On / {offHours}h Off</label>
                <input
                    id="lightCycleSlider"
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={onHours}
                    onChange={(e) => updateForm('lightCycleOnHours', Number(e.target.value))}
                />
            </div>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('editLightCycle')}>Cancel</button>
                <button className="btn" onClick={handlers.handleEditLightCycle}>Set Schedule</button>
            </div>
        </>
    );
};

export default EditLightCycleModalContent;