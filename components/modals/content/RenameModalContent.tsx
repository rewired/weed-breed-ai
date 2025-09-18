import React from 'react';

const RenameModalContent = ({ formState, updateForm, handlers, closeModal }) => {
    return (
        <>
            <h2>Rename Item</h2>
            <div className="form-group">
                <label htmlFor="renameInput">New Name</label>
                <input id="renameInput" type="text" value={formState.renameValue} onChange={(e) => updateForm('renameValue', e.target.value)} />
            </div>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('rename')}>Cancel</button>
                <button className="btn" onClick={handlers.handleRenameItem}>Save</button>
            </div>
        </>
    );
};

export default RenameModalContent;