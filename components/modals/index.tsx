import React from 'react';
import Modal from '../Modal';
import { GameState, Room, Structure } from '@/src/game/api';

// Import all the new content components
import RentModalContent from './content/RentModalContent';
import AddRoomModalContent from './content/AddRoomModalContent';
import AddZoneModalContent from './content/AddZoneModalContent';
import AddDeviceModalContent from './content/AddDeviceModalContent';
import AddSupplyModalContent from './content/AddSupplyModalContent';
import EditDeviceModalContent from './content/EditDeviceModalContent';
import EditLightCycleModalContent from './content/EditLightCycleModalContent';
import BreedStrainModalContent from './content/BreedStrainModalContent';
import PlantStrainModalContent from './content/PlantStrainModalContent';
import NewGameModalContent from './content/NewGameModalContent';
import SaveGameModalContent from './content/SaveGameModalContent';
import LoadGameModalContent from './content/LoadGameModalContent';
import HireEmployeeModalContent from './content/HireEmployeeModalContent';
import NegotiateSalaryModalContent from './content/NegotiateSalaryModalContent';
import PlantingPlanModalContent from './content/PlantingPlanModalContent';
import ResetModalContent from './content/ResetModalContent';
import RenameModalContent from './content/RenameModalContent';
import DeleteModalContent from './content/DeleteModalContent';


interface ModalsProps {
    gameState: GameState | null;
    selectedRoom: Room | null;
    selectedStructure: Structure | null;
    modalState: any;
    formState: any;
    closeModal: (type: any) => void;
    updateForm: (field: any, value: any) => void;
    handlers: any;
    dynamicData: any;
}

export const Modals: React.FC<ModalsProps> = (props) => {
    const { modalState, closeModal } = props;
    
    if (!props.gameState) {
        // Only render modals that can be shown pre-game
        return (
             <>
                <Modal isOpen={modalState.newGame} onClose={() => closeModal('newGame')}>
                    <NewGameModalContent {...props} />
                </Modal>
                <Modal isOpen={modalState.load} onClose={() => closeModal('load')}>
                    <LoadGameModalContent {...props} />
                </Modal>
             </>
        )
    }

    const contentProps = { ...props, gameState: props.gameState };

    return (
        <>
            <Modal isOpen={modalState.rent} onClose={() => closeModal('rent')}>
                <RentModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.addRoom} onClose={() => closeModal('addRoom')}>
                <AddRoomModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.addZone} onClose={() => closeModal('addZone')}>
                <AddZoneModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.addDevice} onClose={() => closeModal('addDevice')}>
                <AddDeviceModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.addSupply} onClose={() => closeModal('addSupply')}>
                <AddSupplyModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.editDevice} onClose={() => closeModal('editDevice')}>
                <EditDeviceModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.editLightCycle} onClose={() => closeModal('editLightCycle')}>
                <EditLightCycleModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.breedStrain} onClose={() => closeModal('breedStrain')}>
                <BreedStrainModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.plantStrain} onClose={() => closeModal('plantStrain')}>
                <PlantStrainModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.newGame} onClose={() => closeModal('newGame')}>
                <NewGameModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.save} onClose={() => closeModal('save')}>
                <SaveGameModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.load} onClose={() => closeModal('load')}>
                <LoadGameModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.hireEmployee} onClose={() => closeModal('hireEmployee')}>
                <HireEmployeeModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.negotiateSalary} onClose={() => closeModal('negotiateSalary')}>
                <NegotiateSalaryModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.plantingPlan} onClose={() => closeModal('plantingPlan')}>
                <PlantingPlanModalContent {...contentProps} />
            </Modal>
            
            <Modal isOpen={modalState.reset} onClose={() => closeModal('reset')}>
                <ResetModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.rename} onClose={() => closeModal('rename')}>
                <RenameModalContent {...contentProps} />
            </Modal>

            <Modal isOpen={modalState.delete} onClose={() => closeModal('delete')}>
                <DeleteModalContent {...contentProps} />
            </Modal>
        </>
    );
};