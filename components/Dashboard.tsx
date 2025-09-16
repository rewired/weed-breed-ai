import React from 'react';

interface DashboardProps {
  capital: number;
  ticks: number;
  isSimRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ capital, ticks, isSimRunning, onStart, onPause, onReset }) => {
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