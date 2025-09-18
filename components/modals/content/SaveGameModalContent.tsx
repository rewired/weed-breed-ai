import React from 'react';

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

export default SaveGameModalContent;