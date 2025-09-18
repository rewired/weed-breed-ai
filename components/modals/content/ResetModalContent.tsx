import React from 'react';

const ResetModalContent = ({ handlers, closeModal }) => {
    return (
        <>
            <h2>Reset Simulation</h2>
            <p>Are you sure you want to reset the game? All your progress will be permanently lost.</p>
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('reset')}>Cancel</button>
                <button className="btn btn-danger" onClick={handlers.handleResetConfirm}>Reset Game</button>
            </div>
        </>
    );
};

export default ResetModalContent;