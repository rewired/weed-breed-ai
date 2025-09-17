import React from 'react';
import { Company, Structure, Room, Zone } from '../game/types';
import Structures from '../components/Structures';
import StructureDetail from '../components/StructureDetail';
import RoomDetail from '../components/RoomDetail';
import ZoneDetail from './ZoneDetail';
import FinancesView from './FinancesView';
import { View } from '../hooks/useViewManager';

interface MainViewProps {
    company: Company;
    currentView: View;
    selectedStructure: Structure | null;
    selectedRoom: Room | null;
    selectedZone: Zone | null;
    onStructureClick: (id: string) => void;
    onRoomClick: (id: string) => void;
    onZoneClick: (id: string) => void;
    onOpenModal: (type: any, context?: any) => void;
    onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
    onHarvest: (plantId?: string) => void;
    onDuplicateRoom: (structureId: string, roomId: string) => void;
    onDuplicateZone: (roomId: string, zoneId: string) => void;
    ticks: number;
}

const MainView: React.FC<MainViewProps> = (props) => {
    const { 
        company, 
        currentView,
        selectedStructure, 
        selectedRoom, 
        selectedZone, 
        onStructureClick, 
        onRoomClick,
        onZoneClick,
        onOpenModal,
        onToggleDeviceGroupStatus,
        onHarvest,
        onDuplicateRoom,
        onDuplicateZone,
        ticks,
    } = props;

    if (currentView === 'finances') {
        // FIX: Pass ticks to FinancesView.
        return <FinancesView company={company} ticks={ticks} />;
    }

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
            onHarvest={onHarvest}
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
            onDuplicateZone={onDuplicateZone}
        />;
    } 
    
    if (selectedStructure) {
        return <StructureDetail 
            structure={selectedStructure} 
            company={company}
            onRoomClick={onRoomClick} 
            onAddRoomClick={() => onOpenModal('addRoom')}
            onRenameClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'structure', id, currentName: name }})}
            onDeleteStructureClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'structure', id, name }})}
            onDeleteRoomClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'room', id, name }})}
            onDuplicateRoom={onDuplicateRoom}
        />;
    }
    
    return <Structures 
        company={company}
        onStructureClick={onStructureClick} 
        onRentClick={() => onOpenModal('rent')} 
    />;
};

export default MainView;
