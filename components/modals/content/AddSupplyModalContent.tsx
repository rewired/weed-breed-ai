import React from 'react';
import { getBlueprints } from '../../../game/blueprints';

const AddSupplyModalContent = ({ gameState, formState, updateForm, handlers, closeModal }) => {
    const { utilityPrices } = getBlueprints();
    const { supplyType, supplyQuantity } = formState;

    const unit = supplyType === 'water' ? 'Liters' : 'Grams';
    const pricePerUnit = supplyType === 'water' ? utilityPrices.pricePerLiterWater : utilityPrices.pricePerGramNutrients;
    const totalCost = (pricePerUnit || 0) * (supplyQuantity || 0);
    const canAfford = gameState.company.capital >= totalCost;
    
    return (
      <>
        <h2>Add Supplies</h2>
        <div className="form-group">
          <label htmlFor="supplyType">Supply Type</label>
          <select id="supplyType" value={supplyType || ''} onChange={(e) => updateForm('supplyType', e.target.value)}>
            <option value="water">Water</option>
            <option value="nutrients">Nutrients</option>
          </select>
        </div>
        
        <div className="form-group">
            <label htmlFor="supplyQuantity">Quantity ({unit})</label>
            <input id="supplyQuantity" type="number" value={supplyQuantity} onChange={(e) => updateForm('supplyQuantity', Number(e.target.value))} min="0" />
        </div>

        <p><strong>Total Cost:</strong> ${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
        {!canAfford && <p style={{color: 'var(--danger-color)'}}>You do not have enough capital for this purchase.</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => closeModal('addSupply')}>Cancel</button>
          <button className="btn" onClick={handlers.handleAddSupply} disabled={!canAfford || supplyQuantity <= 0}>
            Purchase
          </button>
        </div>
      </>
    );
};

export default AddSupplyModalContent;