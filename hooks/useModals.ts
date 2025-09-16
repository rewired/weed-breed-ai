import { useState, useCallback, useEffect } from 'react';
import { RoomPurpose } from '../game/roomPurposes';
import { getBlueprints } from '../game/blueprints';
import { Structure, Room } from '../game/types';

type ModalType = 'rent' | 'addRoom' | 'addZone' | 'addDevice' | 'reset' | 'rename' | 'delete';

interface ModalState {
  rent: boolean;
  addRoom: boolean;
  addZone: boolean;
  addDevice: boolean;
  reset: boolean;
  rename: boolean;
  delete: boolean;
  itemToRename: { type: 'structure' | 'room' | 'zone', id: string, currentName: string } | null;
  itemToDelete: { type: 'structure' | 'room' | 'zone', id: string, name: string } | null;
  activeZoneId: string | null;
}

interface FormState {
  newItemName: string;
  newItemArea: number;
  newRoomPurpose: RoomPurpose;
  newZoneCultivationMethodId: string | null;
  renameValue: string;
  selectedStructureBlueprintId: string | null;
  selectedDeviceBlueprintId: string | null;
}

const initialModalState: ModalState = {
  rent: false,
  addRoom: false,
  addZone: false,
  addDevice: false,
  reset: false,
  rename: false,
  delete: false,
  itemToRename: null,
  itemToDelete: null,
  activeZoneId: null,
};

const initialFormState: FormState = {
  newItemName: '',
  newItemArea: 10,
  newRoomPurpose: 'growroom',
  newZoneCultivationMethodId: null,
  renameValue: '',
  selectedStructureBlueprintId: null,
  selectedDeviceBlueprintId: null,
};

interface UseModalsProps {
    selectedStructure: Structure | null;
    selectedRoom: Room | null;
}

export const useModals = ({ selectedStructure, selectedRoom }: UseModalsProps) => {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  
  const openModal = useCallback((type: ModalType, context?: any) => {
    setModalState(prev => ({ ...prev, [type]: true, ...context }));
  }, []);

  const closeModal = useCallback((type: ModalType) => {
    setModalState(prev => ({ ...prev, [type]: false }));
    if (['addRoom', 'addZone', 'rename', 'delete'].includes(type)) {
        resetForm();
    }
  }, []);

  const updateForm = useCallback((field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  // Set initial form values when modals are opened
  useEffect(() => {
    if (modalState.rent) {
      const blueprints = getBlueprints().structures;
      const firstId = Object.keys(blueprints)[0];
      updateForm('selectedStructureBlueprintId', firstId || null);
    }
    if (modalState.addZone) {
      const blueprints = getBlueprints().cultivationMethods;
      const firstId = Object.keys(blueprints)[0];
      updateForm('newZoneCultivationMethodId', firstId || null);
    }
    if(modalState.addDevice) {
        const blueprints = getBlueprints().devices;
        const firstId = Object.keys(blueprints)[0];
        updateForm('selectedDeviceBlueprintId', firstId || null);
    }
    if(modalState.rename && modalState.itemToRename) {
        updateForm('renameValue', modalState.itemToRename.currentName);
    }
  }, [modalState.rent, modalState.addZone, modalState.addDevice, modalState.rename, modalState.itemToRename, updateForm]);

  return {
    modalState,
    formState,
    openModal,
    closeModal,
    updateForm,
    resetForm,
  };
};
