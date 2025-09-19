import React from 'react';
import type { FinanceSummaryDTO } from '@/src/game/api';
import type { Company } from '@/game/models/Company';
import type { Structure } from '@/game/models/Structure';
import type { Room } from '@/game/models/Room';
import type { Zone } from '@/game/models/Zone';
import type { JobRole, OvertimePolicy } from '@/game/types';
import Structures from '../components/Structures';
import StructureDetail from '../components/StructureDetail';
import RoomDetail from '../components/RoomDetail';
import ZoneDetail from './ZoneDetail';
import FinancesView from './FinancesView';
import PersonnelView from './PersonnelView';
import { View } from '../hooks/useViewManager';

interface MainViewProps {
    company: Company;
    currentView: View;
    selectedStructure: Structure | null;
    selectedRoom: Room | null;
    selectedZone: Zone | null;
    financeSummary: FinanceSummaryDTO | null;
    onStructureClick: (id: string) => void;
    onRoomClick: (id: string) => void;
    onZoneClick: (id: string) => void;
    onOpenModal: (type: any, context?: any) => void;
    onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
    onHarvest: (zoneId: string, plantId?: string) => void;
    onDuplicateRoom: (structureId: string, roomId: string) => void;
    onDuplicateZone: (roomId: string, zoneId: string) => void;
    onRenameRoom: (roomId: string, newName: string) => void;
    onRenameZone: (zoneId: string, newName: string) => void;
    onNavigateToZone: (direction: 'next' | 'prev') => void;
    onAssignEmployeeRole: (employeeId: string, role: JobRole) => void;
    onSetOvertimePolicy: (policy: OvertimePolicy) => void;
    onToggleAutoReplant: (zoneId: string) => void;
    onDeletePlantingPlan: (zoneId: string) => void;
}

const MainView: React.FC<MainViewProps> = (props) => {
    const { 
        company, 
        currentView,
        selectedStructure,
        selectedRoom,
        selectedZone,
        financeSummary,
        onStructureClick,
        onRoomClick,
        onZoneClick,
        onOpenModal,
        onToggleDeviceGroupStatus,
        onHarvest,
        onDuplicateRoom,
        onDuplicateZone,
        onRenameRoom,
        onRenameZone,
        onNavigateToZone,
        onAssignEmployeeRole,
        onSetOvertimePolicy,
        onToggleAutoReplant,
        onDeletePlantingPlan,
    } = props;

    if (currentView === 'finances') {
        return <FinancesView summary={financeSummary} />;
    }
    
    if (currentView === 'personnel') {
        return <PersonnelView 
            company={company} 
            onOpenModal={onOpenModal} 
            onAssignEmployeeRole={onAssignEmployeeRole} 
            onSetOvertimePolicy={onSetOvertimePolicy}
        />;
    }

    if (selectedStructure && selectedRoom && selectedZone) {
        return <ZoneDetail
            zone={selectedZone}
            company={company}
            structure={selectedStructure}
            room={selectedRoom}
            onRenameZoneClick={(id, name) => onOpenModal('rename', { itemToRename: { type: 'zone', id, currentName: name }})}
            onDeleteZoneClick={(id, name) => onOpenModal('delete', { itemToDelete: { type: 'zone', id, name }})}
            onAddDeviceClick={(zoneId) => onOpenModal('addDevice', { activeZoneId: zoneId })}
            onToggleDeviceGroupStatus={onToggleDeviceGroupStatus}
            onOpenModal={onOpenModal}
            onHarvest={onHarvest}
            onNavigateToZone={onNavigateToZone}
            onToggleAutoReplant={onToggleAutoReplant}
            onDeletePlantingPlan={onDeletePlantingPlan}
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
            onRenameZone={onRenameZone}
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
            onRenameRoom={onRenameRoom}
        />;
    }
    
    return <Structures 
        company={company}
        onStructureClick={onStructureClick} 
        onRentClick={() => onOpenModal('rent')} 
    />;
};

export default MainView;