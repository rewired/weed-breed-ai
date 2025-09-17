import React from 'react';
import { Structure, Room } from '../game/types';

interface NavigationProps {
  structure: Structure | null;
  room: Room | null;
  onBack: () => void;
  onRootClick: () => void;
  onStructureClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ structure, room, onBack, onRootClick, onStructureClick }) => {
  const showBack = !!structure;

  return (
    <div className="navigation">
      {showBack && (
        <button onClick={onBack} className="nav-back-btn" aria-label="Go back">
          &larr;
        </button>
      )}
      <span className="nav-path-link" onClick={onRootClick}>Structures</span>
      {structure && (
        <>
          <span className="nav-path-separator">/</span>
          {room ? (
            <span className="nav-path-link" onClick={onStructureClick}>
              {structure.name}
            </span>
          ) : (
            <span>{structure.name}</span>
          )}
        </>
      )}
      {room && (
        <>
          <span className="nav-path-separator">/</span>
          <span>{room.name}</span>
        </>
      )}
    </div>
  );
};

export default Navigation;