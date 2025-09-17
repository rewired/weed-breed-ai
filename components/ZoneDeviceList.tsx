import React, { useState } from 'react';
import { Zone } from '../game/types';
import { getBlueprints } from '../game/blueprints';

// Props for the new component
interface ZoneDeviceListProps {
  zone: Zone;
  onToggleDeviceGroupStatus: (zoneId: string, blueprintId: string) => void;
  onAddDeviceClick: (zoneId: string) => void;
  onOpenModal: (type: any, context?: any) => void;
}

const ZoneDeviceList: React.FC<ZoneDeviceListProps> = ({ zone, onToggleDeviceGroupStatus, onAddDeviceClick, onOpenModal }) => {
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    const toggleExpanded = (key: string) => {
      setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const groupedDevices = zone.getGroupedDevices();

    return (
        <div className="card">
            <div className="zone-inventory">
                <h5>Devices</h5>
                {groupedDevices.length > 0 ? (
                    <ul>
                        {groupedDevices.map(deviceGroup => {
                            const isExpanded = expandedItems[`device-${deviceGroup.blueprintId}`];
                            const blueprint = getBlueprints().devices[deviceGroup.blueprintId];
                            const isAdjustable = blueprint?.kind === 'ClimateUnit' || blueprint?.kind === 'HumidityControlUnit' || blueprint?.kind === 'CO2Injector';
                            const groupSettings = zone.deviceGroupSettings[deviceGroup.blueprintId];
                            let currentSettingDisplay = null;

                            if (groupSettings) {
                                if (blueprint?.kind === 'ClimateUnit' && groupSettings.targetTemperature) {
                                    currentSettingDisplay = `(Set: ${groupSettings.targetTemperature}°C)`;
                                }
                                if (blueprint?.kind === 'HumidityControlUnit' && groupSettings.targetHumidity) {
                                    currentSettingDisplay = `(Set: ${Math.round(groupSettings.targetHumidity * 100)}%)`;
                                }
                                if (blueprint?.kind === 'CO2Injector' && groupSettings.targetCO2) {
                                    currentSettingDisplay = `(Set: ${groupSettings.targetCO2} ppm)`;
                                }
                            }

                            return (
                                <li key={deviceGroup.blueprintId}>
                                    <div className="group-summary" onClick={() => toggleExpanded(`device-${deviceGroup.blueprintId}`)}>
                                        <span className="device-name-group">
                                            <span className={`device-status-indicator status-${deviceGroup.status}`} onClick={(e) => { e.stopPropagation(); onToggleDeviceGroupStatus(zone.id, deviceGroup.blueprintId); }}></span>
                                            {deviceGroup.name} <span className="device-setting-display">{currentSettingDisplay}</span>
                                        </span>
                                        <div className="sub-list-item-actions">
                                            {isAdjustable && (
                                                <button
                                                    className="btn-action-icon"
                                                    onClick={(e) => { e.stopPropagation(); onOpenModal('editDevice', { itemToEdit: { type: 'deviceGroup', blueprintId: deviceGroup.blueprintId, name: deviceGroup.name, context: { zoneId: zone.id } } }) }}
                                                    title={`Adjust ${deviceGroup.name} Settings`} aria-label={`Adjust ${deviceGroup.name} Settings`}
                                                >
                                                    <span className="material-symbols-outlined">tune</span>
                                                </button>
                                            )}
                                            <span className="device-count">(x{deviceGroup.count})</span>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <ul className="sub-list">
                                            {Object.values(zone.devices).filter(d => d.blueprintId === deviceGroup.blueprintId).map(device => (
                                                <li key={device.id} className="sub-list-item">
                                                    <span>{device.name} #{device.id.slice(-4)}</span>
                                                    <div className="sub-list-item-actions">
                                                        <button
                                                            className="btn-action-icon delete"
                                                            onClick={() => onOpenModal('delete', { itemToDelete: { type: 'device', id: device.id, name: device.name, context: { zoneId: zone.id } } })}
                                                            title="Delete Device" aria-label="Delete Device"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                </li>
                                            )
                                            )}
                                        </ul>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="placeholder-text-small">No devices installed.</p>
                )}
                <button className="btn-add-item" onClick={() => onAddDeviceClick(zone.id)}>+ Device</button>
            </div>
        </div>
    );
};

export default ZoneDeviceList;
