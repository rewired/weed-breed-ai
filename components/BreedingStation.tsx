import React from 'react';
import { Company } from '@/src/game/api';

interface BreedingStationProps {
  company: Company;
}

const BreedingStation: React.FC<BreedingStationProps> = ({ company }) => {
  const customStrains = Object.values(company.customStrains || {});

  return (
    <>
      {customStrains.length > 0 ? (
        <div className="card-container">
          {customStrains.map(strain => (
            <div key={strain.id} className="card">
              <div className="card__header">
                <h3>{strain.name}</h3>
              </div>
              <p>Parents: <em>{strain.lineage.parents.join(' x ')}</em></p>
              <p>THC: <strong>{(strain.chemotype.thcContent * 100).toFixed(1)}%</strong></p>
              <p>Flowering: <strong>{strain.photoperiod.floweringDays} days</strong></p>
              <p>Genotype (S/I): <strong>{Math.round(strain.genotype.sativa * 100)}% / {Math.round(strain.genotype.indica * 100)}%</strong></p>
            </div>
          ))}
        </div>
      ) : (
        <p className="placeholder-text">You haven't bred any custom strains yet. Click 'Breed New Strain' to get started!</p>
      )}
    </>
  );
};

export default BreedingStation;