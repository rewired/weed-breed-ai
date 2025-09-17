import React from 'react';
import { Company } from '../game/types';
import { getAvailableStrains } from '../game/blueprints';

interface StructuresProps {
  company: Company;
  onRentClick: () => void;
  onStructureClick: (id: string) => void;
}

const Structures: React.FC<StructuresProps> = ({ company, onRentClick, onStructureClick }) => {
  const structures = Object.values(company.structures);
  const allStrains = getAvailableStrains(company);

  return (
    <div className="content-panel">
      <div className="content-panel__header">
        <h2>Your Structures</h2>
        <button className="btn" onClick={onRentClick}>+ Rent Structure</button>
      </div>
      <div className="card-container">
        {structures.map(structure => {
          const plantSummary = structure.getStructurePlantSummary(allStrains);
          let plantSummaryText: string | null = null;
          if (plantSummary.capacity > 0) {
            plantSummaryText = `${plantSummary.count} / ${plantSummary.capacity}`;
            if (plantSummary.dominantStage && plantSummary.count > 0) {
                const capitalizedStage = plantSummary.dominantStage.charAt(0).toUpperCase() + plantSummary.dominantStage.slice(1);
                plantSummaryText += ` (${capitalizedStage} - ${plantSummary.progress.toFixed(0)}%)`;
            }
          }

          return (
            <div key={structure.id} className="card" data-clickable="true" onClick={() => onStructureClick(structure.id)}>
              <div className="card__header">
                  <h3>{structure.name}</h3>
              </div>
              <p>Area: {structure.area_m2} m²</p>
              <p>Rooms: {Object.keys(structure.rooms).length}</p>
              {plantSummaryText && <p>Plants: {plantSummaryText}</p>}
            </div>
          );
        })}
      </div>
      {structures.length === 0 && <p className="placeholder-text">You don't own any structures yet. Rent a structure to get started!</p>}
    </div>
  );
};

export default Structures;