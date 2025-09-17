import { useState, useCallback } from 'react';

export const useViewManager = () => {
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
    }
  }, [selectedZoneId, selectedRoomId, selectedStructureId]);

  const goToRoot = useCallback(() => {
    setSelectedStructureId(null);
    setSelectedRoomId(null);
    setSelectedZoneId(null);
  }, []);

  const goToStructureView = useCallback(() => {
    setSelectedRoomId(null);
    setSelectedZoneId(null);
  }, []);
  
  const goToRoomView = useCallback(() => {
    setSelectedZoneId(null);
  }, []);

  return {
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