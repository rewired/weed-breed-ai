import { useState, useCallback } from 'react';

export const useViewManager = () => {
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (selectedRoomId) {
      setSelectedRoomId(null);
    } else if (selectedStructureId) {
      setSelectedStructureId(null);
    }
  }, [selectedRoomId, selectedStructureId]);

  const goToRoot = useCallback(() => {
    setSelectedStructureId(null);
    setSelectedRoomId(null);
  }, []);

  const goToStructureView = useCallback(() => {
    setSelectedRoomId(null);
  }, []);

  return {
    selectedStructureId,
    selectedRoomId,
    setSelectedStructureId,
    setSelectedRoomId,
    handleBack,
    goToRoot,
    goToStructureView,
  };
};