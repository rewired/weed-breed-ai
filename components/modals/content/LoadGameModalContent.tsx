import React from 'react';

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
                                <button className="btn-action-icon delete" onClick={() => handlers.handleDeleteGame(name)} title="Delete Save" aria-label="Delete Save">
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
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

export default LoadGameModalContent;