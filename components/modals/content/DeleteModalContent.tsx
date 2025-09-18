import React from 'react';

const DeleteModalContent = ({ modalState, handlers, closeModal }) => {
    if (!modalState.itemToDelete) return <p>Error: No item specified for deletion.</p>;
    
    const { type, name, context } = modalState.itemToDelete;

    let content;
    if (type === 'employee' && context?.employee) {
        const employee = context.employee;
        const severance = employee.salaryPerDay * 7;
        content = (
            <>
                <h2>Confirm Firing</h2>
                <p>Are you sure you want to fire <strong>{name}</strong>? This action cannot be undone.</p>
                <p>This will cost <strong>${severance.toFixed(2)}</strong> in severance pay and will lower the morale of other staff in the same structure by 10 points.</p>
            </>
        );
    } else {
        content = (
            <>
                <h2>Confirm Deletion</h2>
                <p>Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.</p>
            </>
        );
    }
    
    return (
        <>
            {content}
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => closeModal('delete')}>Cancel</button>
                <button className="btn btn-danger" onClick={handlers.handleDeleteItem}>Delete</button>
            </div>
        </>
    );
};

export default DeleteModalContent;