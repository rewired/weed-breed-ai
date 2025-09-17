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

const Dashboard: React.FC<DashboardProps> = ({ capital, ticks, isSimRunning, onStart, onPause, onReset, onSaveClick, onLoadClick, gameSpeed, onSetGameSpeed }) => {
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
        <button className="btn btn-secondary" onClick={onSaveClick}>Save</button>
        <button className="btn btn-secondary" onClick={onLoadClick}>Load</button>

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

        {!isSimRunning ? (
            <button className="btn btn-start" onClick={onStart}>Start</button>
        ) : (
            <button className="btn btn-pause" onClick={onPause}>Pause</button>
        )}
        <button className="btn btn-reset" onClick={onReset}>Reset</button>
      </div>
    </header>
  );
};

export default Dashboard;