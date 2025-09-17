import { useState, useCallback } from 'react';

export type View = 'structures' | 'finances';

export const useViewManager = () => {
  const [currentView, setCurrentView] = useState<View>('structures');
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (selectedZoneId) {
      setSelectedZoneId(null);
    } else if (selectedRoomId) {
      setSelectedRoomId(null);
    } else if (selectedStructureId) {
      setSelectedStructureId(null);
    } else if (currentView === 'finances') {
      setCurrentView('structures');
    }
  }, [selectedZoneId, selectedRoomId, selectedStructureId, currentView]);

  const goToRoot = useCallback(() => {
    setSelectedStructureId(null);
    setSelectedRoomId(null);
    setSelectedZoneId(null);
    setCurrentView('structures');
  }, []);

  const goToStructureView = useCallback(() => {
    setSelectedRoomId(null);
    setSelectedZoneId(null);
    setCurrentView('structures');
  }, []);
  
  const goToRoomView = useCallback(() => {
    setSelectedZoneId(null);
    setCurrentView('structures');
  }, []);

  return {
    currentView,
    setCurrentView,
    selectedStructureId,
    selectedRoomId,
    selectedZoneId,
    setSelectedStructureId,
    setSelectedRoomId,
    setSelectedZoneId,
    handleBack,
    goToRoot,
    goToStructureView,
    goToRoomView,
  };
};