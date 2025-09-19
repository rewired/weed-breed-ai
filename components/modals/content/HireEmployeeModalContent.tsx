import React from 'react';
import type { Employee, GameState } from '@/game/types';

const HireEmployeeModalContent = ({ gameState, modalState, formState, updateForm, handlers, closeModal }: { gameState: GameState, modalState: any, formState: any, updateForm: any, handlers: any, closeModal: any }) => {
    const employeeToHire: Employee | null = modalState.itemToHire;
    if (!employeeToHire) return null;

    const structures = Object.values(gameState.company.structures);

    return (
      <>
        <h2>Hire {employeeToHire.firstName} {employeeToHire.lastName}</h2>
        <p>Assign this employee to a structure. Their daily salary of ${employeeToHire.salaryPerDay.toFixed(2)} will be deducted from your capital.</p>
        <div className="form-group">
            <label htmlFor="structureAssignment">Assign to Structure</label>
            <select id="structureAssignment" value={formState.hireStructureId || ''} onChange={(e) => updateForm('hireStructureId', e.target.value)}>
                {structures.length > 0 ? (
                    structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                ) : (
                    <option value="" disabled>No structures available</option>
                )}
            </select>
        </div>
        <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => closeModal('hireEmployee')}>Cancel</button>
            <button className="btn" onClick={handlers.handleHireEmployee} disabled={structures.length === 0}>Confirm & Hire</button>
        </div>
      </>
    )
};

export default HireEmployeeModalContent;