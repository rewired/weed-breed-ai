export type Listener<Payload> = (payload: Payload) => void;

export class EventBus<EventMap extends Record<string, any>> {
  private readonly listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<EventName extends keyof EventMap>(eventName: EventName, listener: Listener<EventMap[EventName]>): () => void {
    const listenersForEvent = this.listeners.get(eventName) ?? new Set<Listener<EventMap[EventName]>>();
    listenersForEvent.add(listener as Listener<any>);
    this.listeners.set(eventName, listenersForEvent as Set<Listener<any>>);
    return () => this.off(eventName, listener);
  }

  off<EventName extends keyof EventMap>(eventName: EventName, listener: Listener<EventMap[EventName]>): void {
    const listenersForEvent = this.listeners.get(eventName);
    if (!listenersForEvent) {
      return;
    }
    listenersForEvent.delete(listener as Listener<any>);
    if (listenersForEvent.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit<EventName extends keyof EventMap>(eventName: EventName, payload: EventMap[EventName]): void {
    const listenersForEvent = this.listeners.get(eventName);
    if (!listenersForEvent) {
      return;
    }
    listenersForEvent.forEach(listener => {
      try {
        (listener as Listener<EventMap[EventName]>)(payload);
      } catch (error) {
        console.error(`Error in event listener for "${String(eventName)}"`, error);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}
