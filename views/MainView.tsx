import React from 'react';
import { Company, Structure, Room } from '../game/types';
import Structures from '../components/Structures';
import StructureDetail from '../components/StructureDetail';
import RoomDetail from '../components/RoomDetail';

interface MainViewProps {
    company: Company;
    selectedStructure: Structure | null;
    selectedRoom: Room | null;
    onStructureClick: (id: string) => void;
    onRoomClick: (id: string) => void;
    onOpenModal: (type: any, context?: any) => void;
    onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
}

const MainView: React.FC<MainViewProps> = ({ company, selectedStructure, selectedRoom, onStructureClick, onRoomClick, onOpenModal, onToggleDeviceGroupStatus }) => {
    if (selectedStructure && selectedRoom) {
        return <RoomDetail 
            structure={selectedStructure}
            room={selectedRoom} 
            company={company}
            onAddZoneClick={() => onOpenModal('addZone')}
            onRenameRoomClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'room', id, currentName: name }})}
            onRenameZoneClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'zone', id, currentName: name }})}
            onDeleteRoomClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'room', id, name }})}
            onDeleteZoneClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'zone', id, name }})}
            onAddDeviceClick={(zoneId) => onOpenModal('addDevice', { activeZoneId: zoneId })}
            onToggleDeviceGroupStatus={onToggleDeviceGroupStatus}
            onOpenModal={onOpenModal}
        />;
    } 
    
    if (selectedStructure) {
        return <StructureDetail 
            structure={selectedStructure} 
            onRoomClick={onRoomClick} 
            onAddRoomClick={() => onOpenModal('addRoom')}
            onRenameClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'structure', id, currentName: name }})}
            onDeleteStructureClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'structure', id, name }})}
            onDeleteRoomClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'room', id, name }})}
        />;
    }
    
    return <Structures 
        structures={Object.values(company.structures)} 
        onStructureClick={onStructureClick} 
        onRentClick={() => onOpenModal('rent')} 
    />;
};

export default MainView;