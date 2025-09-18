import React from 'react';

const NewGameModalContent = ({ formState, updateForm, handlers, closeModal }) => {
    return (
        <>
            <h2>Start New Game</h2>
            <p>Welcome! Please name your new company to begin.</p>
            <div className="form-group">
                <label htmlFor="companyName">Company Name</label>
                <input id="companyName" type="text" value={formState.newCompanyName} onChange={(e) => updateForm('newCompanyName', e.target.value)} placeholder="e.g., GreenLeaf Inc." />
            </div>
             <div className="form-group">
                <label htmlFor="seed">Random Seed (Optional)</label>
                <input id="seed" type="text" value={formState.seed} onChange={(e) => updateForm('seed', e.target.value)} placeholder="Leave blank for random" />
            </div>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('newGame')}>Cancel</button>
                <button className="btn" onClick={handlers.handleStartNewGame}>Start Game</button>
            </div>
        </>
    );
};

export default NewGameModalContent;