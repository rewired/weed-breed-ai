import React from 'react';
import { Structure } from '../game/types';

interface StructuresProps {
  structures: Structure[];
  onRentClick: () => void;
  onStructureClick: (id: string) => void;
}

const Structures: React.FC<StructuresProps> = ({ structures, onRentClick, onStructureClick }) => {
  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <h2>Your Structures</h2>
        <button className="btn" onClick={onRentClick}>+ Rent Structure</button>
      </div>
      <div className="card-container">
        {structures.map(structure => (
          <div key={structure.id} className="card" data-clickable="true" onClick={() => onStructureClick(structure.id)}>
            <div className="card__header">
                <h3>{structure.name}</h3>
            </div>
            <p>Area: {structure.area_m2} m²</p>
            <p>Rooms: {Object.keys(structure.rooms).length}</p>
          </div>
        ))}
      </div>
      {structures.length === 0 && <p className="placeholder-text">You don't own any structures yet. Rent a structure to get started!</p>}
    </div>
  );
};

export default Structures;