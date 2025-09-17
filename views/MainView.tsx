import React from 'react';
import { Company, Structure, Room, Zone } from '../game/types';
import Structures from '../components/Structures';
import StructureDetail from '../components/StructureDetail';
import RoomDetail from '../components/RoomDetail';
import ZoneDetail from './ZoneDetail';

interface MainViewProps {
    company: Company;
    selectedStructure: Structure | null;
    selectedRoom: Room | null;
    selectedZone: Zone | null;
    onStructureClick: (id: string) => void;
    onRoomClick: (id: string) => void;
    onZoneClick: (id: string) => void;
    onOpenModal: (type: any, context?: any) => void;
    onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
}

const MainView: React.FC<MainViewProps> = (props) => {
    const { 
        company, 
        selectedStructure, 
        selectedRoom, 
        selectedZone, 
        onStructureClick, 
        onRoomClick,
        onZoneClick,
        onOpenModal,
        onToggleDeviceGroupStatus 
    } = props;

    if (selectedStructure && selectedRoom && selectedZone) {
        return <ZoneDetail
            zone={selectedZone}
            company={company}
            structure={selectedStructure}
            onRenameZoneClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'zone', id, currentName: name }})}
            onDeleteZoneClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'zone', id, name }})}
            onAddDeviceClick={(zoneId) => onOpenModal('addDevice', { activeZoneId: zoneId })}
            onToggleDeviceGroupStatus={onToggleDeviceGroupStatus}
            onOpenModal={onOpenModal}
        />
    }
    
    if (selectedStructure && selectedRoom) {
        return <RoomDetail 
            structure={selectedStructure}
            room={selectedRoom} 
            company={company}
            onAddZoneClick={() => onOpenModal('addZone')}
            onRenameRoomClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'room', id, currentName: name }})}
            onDeleteRoomClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'room', id, name }})}
            onZoneClick={onZoneClick}
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