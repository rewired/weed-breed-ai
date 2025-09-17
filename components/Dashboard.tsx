import React, { useState, useEffect, useRef } from 'react';
import { GameSpeed, Alert, AlertLocation } from '../game/types';

interface DashboardProps {
  capital: number;
  cumulativeYield_g: number;
  ticks: number;
  isSimRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: (context?: any) => void;
  onSaveClick: (context?: any) => void;
  onLoadClick: (context?: any) => void;
  onExportClick: () => void;
  onFinancesClick: () => void;
  onPersonnelClick: () => void;
  gameSpeed: GameSpeed;
  onSetGameSpeed: (speed: GameSpeed) => void;
  currentView: 'structures' | 'finances' | 'personnel';
  alerts: Alert[];
  onNavigateToAlert: (location: AlertLocation) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onGameMenuToggle: (isOpen: boolean) => void;
}

const speedOptions: { label: string; speed: GameSpeed }[] = [
  { label: '0.5x', speed: 0.5 },
  { label: '1x', speed: 1 },
  { label: '10x', speed: 10 },
  { label: '25x', speed: 25 },
  { label: '50x', speed: 50 },
  { label: '100x', speed: 100 },
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
        case 'plant_stress':
            iconName = 'priority_high';
            className = 'warning';
            break;
    }
    return <span className={`material-symbols-outlined alert-item-icon ${className}`}>{iconName}</span>;
}

const Dashboard: React.FC<DashboardProps> = ({ capital, cumulativeYield_g, ticks, isSimRunning, onStart, onPause, onReset, onSaveClick, onLoadClick, onExportClick, onFinancesClick, onPersonnelClick, gameSpeed, onSetGameSpeed, currentView, alerts, onNavigateToAlert, onAcknowledgeAlert, onGameMenuToggle }) => {
  const [progress, setProgress] = useState(0);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isGameMenuOpen, setGameMenuOpen] = useState(false);

  const tickStartTimeRef = useRef(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const wasRunningBeforeMenu = useRef(false);

  const alertsContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);


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

  // --- Click Outside Handlers for Popovers ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (isAlertsOpen && alertsContainerRef.current && !alertsContainerRef.current.contains(event.target as Node)) {
            setIsAlertsOpen(false);
        }
        if (isGameMenuOpen && menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
             onGameMenuToggle(false);
             if (wasRunningBeforeMenu.current) {
                onStart();
            }
            wasRunningBeforeMenu.current = false;
            setGameMenuOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAlertsOpen, isGameMenuOpen, onStart, onGameMenuToggle]);

  const handleMenuToggle = () => {
    setGameMenuOpen(prev => {
        const isOpening = !prev;
        onGameMenuToggle(isOpening);
        if (isOpening) {
            if (isSimRunning) {
                onPause();
                wasRunningBeforeMenu.current = true;
            } else {
                wasRunningBeforeMenu.current = false;
            }
        } else { // is closing
            if (wasRunningBeforeMenu.current) {
                onStart();
            }
            wasRunningBeforeMenu.current = false;
        }
        return isOpening;
    });
  };

  const handleMenuAction = (handler: (context?: any) => void) => {
    // This function is for actions that open a modal.
    // It passes the pre-menu running state to the modal,
    // and lets the modal system handle resuming the simulation.
    onGameMenuToggle(false);
    handler({ prePauseState: wasRunningBeforeMenu.current });
    setGameMenuOpen(false);
    wasRunningBeforeMenu.current = false;
  };

  const handleExportAction = () => {
    // This action doesn't open a modal, so we manage the pause state directly.
    onGameMenuToggle(false);
    onExportClick();
    setGameMenuOpen(false);
    if (wasRunningBeforeMenu.current) {
        onStart();
    }
    wasRunningBeforeMenu.current = false;
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  const unacknowledgedAlerts = alerts.filter(a => !a.isAcknowledged);
  const unacknowledgedCount = unacknowledgedAlerts.length;

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

        <button className={`btn btn-secondary btn-icon ${currentView === 'personnel' ? 'active' : ''}`} onClick={onPersonnelClick} title="Personnel" aria-label="Personnel">
          <span className="material-symbols-outlined">groups</span>
        </button>

        <div className="notifications-container" ref={alertsContainerRef}>
            <button className="btn btn-secondary btn-icon" onClick={() => setIsAlertsOpen(prev => !prev)} title="Alerts" aria-label="Alerts">
              <span className="material-symbols-outlined">notifications</span>
              {unacknowledgedCount > 0 && <span className="notifications-badge">{unacknowledgedCount}</span>}
            </button>
            {isAlertsOpen && (
                <div className="alerts-popover">
                    <div className="alerts-popover-header">
                        {alerts.length > 0 ? `Active Alerts (${alerts.length})` : 'No Active Alerts'}
                    </div>
                    {alerts.map(alert => (
                        <div key={alert.id} className={`alert-item ${alert.isAcknowledged ? 'acknowledged' : ''}`}>
                            {alert.isAcknowledged ? (
                                <span className="material-symbols-outlined alert-item-ack-icon">check_circle</span>
                            ) : (
                                <AlertIcon type={alert.type} />
                            )}
                            <span className="alert-item-message">{alert.message}</span>
                            <div className="alert-item-action">
                                <button className="btn" onClick={() => { onAcknowledgeAlert(alert.id); onNavigateToAlert(alert.location); setIsAlertsOpen(false); }}>Go</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        <div className="game-menu-container" ref={menuContainerRef}>
            <button className="btn btn-secondary btn-icon" onClick={handleMenuToggle} title="Game Menu" aria-label="Game Menu">
                <span className="material-symbols-outlined">settings</span>
            </button>
            {isGameMenuOpen && (
                <div className="game-menu-flyout">
                    <button className="btn btn-secondary btn-flyout" onClick={() => handleMenuAction(onSaveClick)}>
                        <span className="material-symbols-outlined">save</span> Save Game
                    </button>
                    <button className="btn btn-secondary btn-flyout" onClick={() => handleMenuAction(onLoadClick)}>
                        <span className="material-symbols-outlined">folder_open</span> Load Game
                    </button>
                    <button className="btn btn-secondary btn-flyout" onClick={handleExportAction}>
                        <span className="material-symbols-outlined">download</span> Export Game
                    </button>
                    <button className="btn btn-danger btn-flyout" onClick={() => handleMenuAction(onReset)}>
                        <span className="material-symbols-outlined">restart_alt</span> Reset Game
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Dashboard;