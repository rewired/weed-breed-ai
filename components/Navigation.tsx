import React from 'react';
import type {
  StructureSummaryDTO,
  RoomSummaryDTO,
  ZoneSummaryDTO,
} from '@/src/game/api';

interface NavigationProps {
  structure: StructureSummaryDTO | null;
  room: RoomSummaryDTO | null;
  zone: ZoneSummaryDTO | null;
  onBack: () => void;
  onRootClick: () => void;
  onStructureClick: () => void;
  onRoomClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ structure, room, zone, onBack, onRootClick, onStructureClick, onRoomClick }) => {
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
           {zone ? (
            <span className="nav-path-link" onClick={onRoomClick}>
              {room.name}
            </span>
          ) : (
            <span>{room.name}</span>
          )}
        </>
      )}
       {zone && (
        <>
          <span className="nav-path-separator">/</span>
          <span>{zone.name}</span>
        </>
      )}
    </div>
  );
};

export default Navigation;