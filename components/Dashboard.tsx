import React from 'react';
import { GameSpeed } from '../game/types';

interface DashboardProps {
  capital: number;
  ticks: number;
  isSimRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onExportClick: () => void;
  gameSpeed: GameSpeed;
  onSetGameSpeed: (speed: GameSpeed) => void;
}

const speedOptions: { label: string; speed: GameSpeed }[] = [
  { label: 'Slow', speed: 0.5 },
  { label: 'Normal', speed: 1 },
  { label: 'Swift', speed: 4 },
  { label: 'Fast', speed: 10 },
  { label: 'Ultra', speed: 20 },
];

const Dashboard: React.FC<DashboardProps> = ({ capital, ticks, isSimRunning, onStart, onPause, onReset, onSaveClick, onLoadClick, onExportClick, gameSpeed, onSetGameSpeed }) => {
  return (
    <header className="dashboard">
      <div className="dashboard-metrics">
        <div className="dashboard-metric">
            <span className="dashboard-metric__label">Capital</span>
            <span className="dashboard-metric__value">
            {capital.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}
            </span>
        </div>
        <div className="dashboard-metric">
            <span className="dashboard-metric__label">Time</span>
            <span className="dashboard-metric__value">{ticks} Ticks</span>
        </div>
      </div>
      <div className="dashboard-controls">
        {!isSimRunning ? (
            <button className="btn btn-start btn-icon" onClick={onStart} title="Start Simulation" aria-label="Start Simulation">
              <span className="material-symbols-outlined">play_circle</span>
            </button>
        ) : (
            <button className="btn btn-pause btn-icon" onClick={onPause} title="Pause Simulation" aria-label="Pause Simulation">
              <span className="material-symbols-outlined">pause_circle</span>
            </button>
        )}
        
        <div className="game-speed-controls">
          {speedOptions.map(({ label, speed }) => (
            <button
              key={speed}
              className={`btn-speed ${gameSpeed === speed ? 'active' : ''}`}
              onClick={() => onSetGameSpeed(speed)}
              title={`${speed}x`}
            >
              {label}
            </button>
          ))}
        </div>

        <button className="btn btn-secondary btn-icon" onClick={onSaveClick} title="Save Game" aria-label="Save Game">
          <span className="material-symbols-outlined">save</span>
        </button>
        <button className="btn btn-secondary btn-icon" onClick={onLoadClick} title="Load Game" aria-label="Load Game">
          <span className="material-symbols-outlined">folder_open</span>
        </button>
        <button className="btn btn-secondary btn-icon" onClick={onExportClick} title="Export Game" aria-label="Export Game">
          <span className="material-symbols-outlined">download</span>
        </button>
        
        <button className="btn btn-reset btn-icon" onClick={onReset} title="Reset Game" aria-label="Reset Game">
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
      </div>
    </header>
  );
};

export default Dashboard;