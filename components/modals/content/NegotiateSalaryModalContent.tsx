import React from 'react';

const NegotiateSalaryModalContent = ({ gameState, modalState, handlers, closeModal }) => {
    const negotiation = modalState.itemToNegotiate;
    if (!negotiation) return null;
    const { employee, newSalary, bonus } = negotiation;
    
    return (
        <>
            <h2>Salary Negotiation</h2>
            <p><strong>{employee.firstName} {employee.lastName}</strong> ({employee.role}) has requested a salary review based on their performance and skill improvements.</p>
            
            <div className="summary-cards" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem'}}>
                <div className="summary-card">
                    <h4>Current Salary</h4>
                    <p>${employee.salaryPerDay.toFixed(2)}/day</p>
                </div>
                 <div className="summary-card">
                    <h4>Requested Salary</h4>
                    <p className="positive">${newSalary.toFixed(2)}/day</p>
                </div>
            </div>

            <p>You have three options:</p>
            <div className="modal-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                <button className="btn btn-start" onClick={handlers.handleAcceptRaise}>
                    Accept Raise (+25 Morale)
                </button>
                <button className="btn btn-pause" onClick={handlers.handleOfferBonus} disabled={gameState.company.capital < bonus}>
                    Offer ${bonus.toFixed(2)} Bonus (+15 Morale)
                </button>
                <button className="btn btn-danger" onClick={handlers.handleDeclineRaise}>
                    Decline Request (-20 Morale)
                </button>
            </div>
        </>
    );
};

export default NegotiateSalaryModalContent;