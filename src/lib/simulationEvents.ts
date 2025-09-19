import { EventBus, type Listener } from '@/src/game/api/eventBus';
import type { SimulationEventMap, SimulationEventName } from '@/src/game/api';

export const simulationEventBus = new EventBus<SimulationEventMap>();

export const onSimulationEvent = <EventName extends SimulationEventName>(
  eventName: EventName,
  listener: Listener<SimulationEventMap[EventName]>,
): (() => void) => simulationEventBus.on(eventName, listener);

export const emitSimulationEvent = <EventName extends SimulationEventName>(
  eventName: EventName,
  payload: SimulationEventMap[EventName],
): void => {
  simulationEventBus.emit(eventName, payload);
};

export const clearSimulationEventListeners = (): void => {
  simulationEventBus.clear();
};
