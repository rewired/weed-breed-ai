import { useState, useCallback, useEffect, useRef } from 'react';
import { RoomPurpose } from '../game/roomPurposes';
import { getBlueprints, getAvailableStrains } from '../game/blueprints';
import { Structure, Room, Company, GameState } from '../game/types';

type ModalType = 'rent' | 'addRoom' | 'addZone' | 'addDevice' | 'addSupply' | 'reset' | 'rename' | 'delete' | 'breedStrain' | 'plantStrain' | 'newGame' | 'save' | 'load' | 'editDevice' | 'editLightCycle';

const PAUSING_MODALS: ModalType[] = [
  'rent', 'addRoom', 'addZone', 'addDevice', 'addSupply', 'reset', 'rename',
  'delete', 'breedStrain', 'plantStrain', 'newGame', 'save', 'load',
  'editDevice', 'editLightCycle'
];


interface ModalState {
  rent: boolean;
  addRoom: boolean;
  addZone: boolean;
  addDevice: boolean;
  addSupply: boolean;
  reset: boolean;
  rename: boolean;
  delete: boolean;
  breedStrain: boolean;
  plantStrain: boolean;
  newGame: boolean;
  save: boolean;
  load: boolean;
  editDevice: boolean;
  editLightCycle: boolean;
  itemToRename: { type: 'structure' | 'room' | 'zone', id: string, currentName: string } | null;
  itemToDelete: { type: 'structure' | 'room' | 'zone' | 'device' | 'plant' | 'planting', id: string, name: string, context?: any } | null;
  itemToEdit: { type: 'deviceGroup', blueprintId: string, name: string, context: { zoneId: string } } | null;
  activeZoneId: string | null;
  // FIX: Add optional supplyType property to ModalState to match context passed when opening the 'addSupply' modal.
  supplyType?: 'water' | 'nutrients';
}

interface FormState {
  newItemName: string;
  newItemArea: number;
  newRoomPurpose: RoomPurpose;
  newZoneCultivationMethodId: string | null;
  renameValue: string;
  selectedStructureBlueprintId: string | null;
  selectedDeviceBlueprintId: string | null;
  deviceQuantity: number;
  deviceTargetTemp: number | null;
  deviceTargetHumidity: number | null;
  deviceTargetCO2: number | null;
  lightCycleOnHours: number;
  // For supplies modal
  supplyType: 'water' | 'nutrients' | null;
  supplyQuantity: number;
  // For breeding modal
  parentAId: string | null;
  parentBId: string | null;
  newStrainName: string;
  // For planting modal
  plantStrainId: string | null;
  plantQuantity: number;
  // For New Game modal
  newCompanyName: string;
  seed: string;
  // For Save Game modal
  saveGameName: string;
}

const initialModalState: ModalState = {
  rent: false,
  addRoom: false,
  addZone: false,
  addDevice: false,
  addSupply: false,
  reset: false,
  rename: false,
  delete: false,
  breedStrain: false,
  plantStrain: false,
  newGame: false,
  save: false,
  load: false,
  editDevice: false,
  editLightCycle: false,
  itemToRename: null,
  itemToDelete: null,
  itemToEdit: null,
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
  deviceQuantity: 1,
  deviceTargetTemp: null,
  deviceTargetHumidity: null,
  deviceTargetCO2: null,
  lightCycleOnHours: 18,
  supplyType: null,
  supplyQuantity: 0,
  parentAId: null,
  parentBId: null,
  newStrainName: '',
  plantStrainId: null,
  plantQuantity: 1,
  newCompanyName: 'My Company',
  seed: '',
  saveGameName: '',
};

interface UseModalsProps {
    selectedStructure: Structure | null;
    selectedRoom: Room | null;
    gameState?: GameState | null; 
    isSimRunning: boolean;
    setIsSimRunning: (isRunning: boolean) => void;
}

export const useModals = ({ selectedStructure, selectedRoom, gameState, isSimRunning, setIsSimRunning }: UseModalsProps) => {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const wasRunningBeforeModal = useRef<boolean>(false);
  
  const openModal = useCallback((type: ModalType, context?: any) => {
    if (PAUSING_MODALS.includes(type)) {
      if (isSimRunning) {
        wasRunningBeforeModal.current = true;
        setIsSimRunning(false);
      }
    }
    setModalState(prev => ({ ...prev, [type]: true, ...context }));
  }, [isSimRunning, setIsSimRunning]);

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  const closeModal = useCallback((type: ModalType) => {
    if (PAUSING_MODALS.includes(type)) {
      if (wasRunningBeforeModal.current) {
        setIsSimRunning(true);
        wasRunningBeforeModal.current = false;
      }
    }
    setModalState(prev => ({ ...prev, [type]: false }));
    if (['addRoom', 'addZone', 'addSupply', 'rename', 'delete', 'breedStrain', 'plantStrain', 'newGame', 'save', 'editDevice', 'editLightCycle'].includes(type)) {
        resetForm();
    }
  }, [resetForm, setIsSimRunning]);

  const updateForm = useCallback((field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
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
        updateForm('deviceQuantity', 1);
    }
    if(modalState.addSupply) {
      updateForm('supplyType', modalState.supplyType || 'water');
      updateForm('supplyQuantity', 100);
    }
    if(modalState.breedStrain && gameState) {
        const availableStrains = getAvailableStrains(gameState.company);
        const strainIds = Object.keys(availableStrains);
        if (strainIds.length > 0) {
            updateForm('parentAId', strainIds[0]);
            updateForm('parentBId', strainIds.length > 1 ? strainIds[1] : strainIds[0]);
        }
    }
    if (modalState.plantStrain && gameState) {
        const strains = getAvailableStrains(gameState.company);
        const firstId = Object.keys(strains)[0];
        updateForm('plantStrainId', firstId || null);
        updateForm('plantQuantity', 1);
    }
    if(modalState.rename && modalState.itemToRename) {
        updateForm('renameValue', modalState.itemToRename.currentName);
    }
     if (modalState.editDevice && modalState.itemToEdit && selectedRoom) {
      const { blueprintId, context } = modalState.itemToEdit;
      const zone = selectedRoom.zones[context.zoneId];
      const groupSettings = zone?.deviceGroupSettings[blueprintId];
      if (groupSettings) {
        if (typeof groupSettings.targetTemperature === 'number') {
          updateForm('deviceTargetTemp', groupSettings.targetTemperature);
        }
        if (typeof groupSettings.targetHumidity === 'number') {
          updateForm('deviceTargetHumidity', Math.round(groupSettings.targetHumidity * 100));
        }
        if (typeof groupSettings.targetCO2 === 'number') {
          updateForm('deviceTargetCO2', groupSettings.targetCO2);
        }
      }
    }
    if (modalState.editLightCycle && modalState.activeZoneId && selectedRoom) {
        const zone = selectedRoom.zones[modalState.activeZoneId];
        if (zone) {
            updateForm('lightCycleOnHours', zone.lightCycle.on);
        }
    }
    if (modalState.save && gameState) {
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const suggestedName = `${gameState.company.name} - ${timestamp}`;
      updateForm('saveGameName', suggestedName);
    }
  }, [modalState, updateForm, gameState, selectedRoom]);

  return {
    modalState,
    formState,
    openModal,
    closeModal,
    updateForm,
    resetForm,
  };
};