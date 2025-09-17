import React, { useState, useEffect, useRef } from 'react';
import { GameSpeed, Alert, AlertLocation } from '../game/types';

interface DashboardProps {
  capital: number;
  cumulativeYield_g: number;
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
  currentView: 'structures' | 'finances';
  alerts: Alert[];
  onNavigateToAlert: (location: AlertLocation) => void;
}

const speedOptions: { label: string; speed: GameSpeed }[] = [
  { label: 'Slow', speed: 0.5 },
  { label: 'Normal', speed: 1 },
  { label: 'Fast', speed: 10 },
  { label: 'Rapid', speed: 25 },
  { label: 'Ultra', speed: 50 },
  { label: 'Ludicrous', speed: 100 },
];

const TICK_INTERVAL_MS = 5000;

const AlertIcon = ({ type }: { type: string }) => {
    let iconName = 'info';
    let className = '';
    switch(type) {
        case 'low_supply':
            iconName = 'water_drop';
            className = 'warning';
            break;
        case 'sick_plant':
            iconName = 'sick';
            className = 'danger';
            break;
        case 'harvest_ready':
            iconName = 'eco';
            className = 'success';
            break;
    }
    return <span className={`material-symbols-outlined alert-item-icon ${className}`}>{iconName}</span>;
}

const Dashboard: React.FC<DashboardProps> = ({ capital, cumulativeYield_g, ticks, isSimRunning, onStart, onPause, onReset, onSaveClick, onLoadClick, onExportClick, onFinancesClick, gameSpeed, onSetGameSpeed, currentView, alerts, onNavigateToAlert }) => {
  const [progress, setProgress] = useState(0);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const tickStartTimeRef = useRef(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const alertsContainerRef = useRef<HTMLDivElement>(null);


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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (alertsContainerRef.current && !alertsContainerRef.current.contains(event.target as Node)) {
            setIsAlertsOpen(false);
        }
    };

    if (isAlertsOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAlertsOpen]);

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
        <div className="dashboard-metric">
          <span className="dashboard-metric__label">Cumulative Yield</span>
          <span className="dashboard-metric__value">
            {(cumulativeYield_g || 0).toFixed(2)}g
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
        
        <button className={`btn btn-secondary btn-icon ${currentView === 'finances' ? 'active' : ''}`} onClick={onFinancesClick} title="Finances" aria-label="Finances">
          <span className="material-symbols-outlined">monitoring</span>
        </button>

        <div className="notifications-container" ref={alertsContainerRef}>
            <button className="btn btn-secondary btn-icon" onClick={() => setIsAlertsOpen(prev => !prev)} title="Alerts" aria-label="Alerts">
              <span className="material-symbols-outlined">notifications</span>
              {alerts.length > 0 && <span className="notifications-badge">{alerts.length}</span>}
            </button>
            {isAlertsOpen && (
                <div className="alerts-popover">
                    <div className="alerts-popover-header">
                        {alerts.length > 0 ? `Active Alerts (${alerts.length})` : 'No Active Alerts'}
                    </div>
                    {alerts.map(alert => (
                        <div key={alert.id} className="alert-item">
                            <AlertIcon type={alert.type} />
                            <span className="alert-item-message">{alert.message}</span>
                            <div className="alert-item-action">
                                <button className="btn" onClick={() => { onNavigateToAlert(alert.location); setIsAlertsOpen(false); }}>Go</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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