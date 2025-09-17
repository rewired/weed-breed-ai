import React from 'react';

interface StartScreenProps {
  onNewGameClick: () => void;
  onLoadGameClick: () => void;
  onImportClick: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onNewGameClick, onLoadGameClick, onImportClick }) => {
  return (
    <div className="start-screen">
      <h1>Weedbreed.AI</h1>
      <p>Your AI-powered cannabis cultivation simulator.</p>
      <div className="start-screen-actions">
        <button className="btn" onClick={onNewGameClick}>New Game</button>
        <button className="btn btn-secondary" onClick={onLoadGameClick}>Load Game</button>
        <button className="btn btn-tertiary" onClick={onImportClick}>Import Game</button>
      </div>
    </div>
  );
};

export default StartScreen;