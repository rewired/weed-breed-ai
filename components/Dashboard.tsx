import React, { useState, useEffect, useRef } from 'react';
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
  onFinancesClick: () => void;
  gameSpeed: GameSpeed;
  onSetGameSpeed: (speed: GameSpeed) => void;
}

const speedOptions: { label: string; speed: GameSpeed }[] = [
  { label: 'Slow', speed: 0.5 },
  { label: 'Normal', speed: 1 },
  { label: 'Swift', speed: 4 },
  { label: 'Fast', speed: 10 },
  { label: 'Ultra', speed: 20 },
  { label: 'Lighting', speed: 50 },
];

const TICK_INTERVAL_MS = 5000;

const Dashboard: React.FC<DashboardProps> = ({ capital, ticks, isSimRunning, onStart, onPause, onReset, onSaveClick, onLoadClick, onExportClick, onFinancesClick, gameSpeed, onSetGameSpeed }) => {
  const [progress, setProgress] = useState(0);
  const tickStartTimeRef = useRef(Date.now());
  // FIX: Initialize useRef with null to provide an initial value, resolving the "Expected 1 arguments, but got 0" error.
  const animationFrameRef = useRef<number | null>(null);

  // --- Date and Time Calculation ---
  const year = Math.floor(ticks / (24 * 365)) + 1;
  const dayOfYear = Math.floor(ticks / 24) % 365;
  const day = dayOfYear + 1;
  const hour = ticks % 24;
  const formattedDate = `Y${year}, D${day}, ${hour.toString().padStart(2, '0')}:00`;

  // --- Progress Circle Animation ---
  useEffect(() => {
    tickStartTimeRef.current = Date.now();
    setProgress(0);

    if (isSimRunning) {
      const tickDuration = TICK_INTERVAL_MS / gameSpeed;
      const animate = () => {
        const elapsedTime = Date.now() - tickStartTimeRef.current;
        const currentProgress = Math.min(elapsedTime / tickDuration, 1);
        setProgress(currentProgress);

        if (currentProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setProgress(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [ticks, isSimRunning, gameSpeed]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <header className="dashboard">
      <div className="dashboard-metrics">
        <div className="dashboard-metric">
          <span className="dashboard-metric__label">Capital</span>
          <span className="dashboard-metric__value">
            {capital.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="dashboard-metric time-display">
          <svg className="tick-progress-circle" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={radius} fill="transparent" stroke="var(--border-color)" strokeWidth="3"></circle>
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="transparent"
              stroke="var(--primary-color)"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            ></circle>
          </svg>
          <div className="time-display-text">
            <div className="time-display-date">{formattedDate}</div>
            <div className="time-display-ticks">{ticks} Ticks</div>
          </div>
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
        
        <button className="btn btn-secondary btn-icon" onClick={onFinancesClick} title="Finances" aria-label="Finances">
          <span className="material-symbols-outlined">monitoring</span>
        </button>

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