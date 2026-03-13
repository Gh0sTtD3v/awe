/**
 * State change listener
 */
export type StateListener<T> = (newValue: T, oldValue: T) => void;

/**
 * State primitive - observable game state with events.
 * For health, score, timers, etc.
 *
 * @example
 * ```ts
 * const state = new State({
 *   health: 3,
 *   maxHealth: 3,
 *   invincible: false,
 *   score: 0,
 * });
 *
 * state.get("health");              // 3
 * state.set("health", 2);
 * state.update({ health: 2, score: 100 });
 *
 * state.on("health", (newVal, oldVal) => {
 *   if (newVal < oldVal) flashDamage();
 *   if (newVal <= 0) gameOver();
 * });
 * ```
 */
export class State<T extends Record<string, any>> {
    private _state: T;
    private _listeners = new Map<keyof T, Set<StateListener<any>>>();
    private _globalListeners = new Set<(key: keyof T, newValue: any, oldValue: any) => void>();
    private _disposed = false;

    constructor(initialState: T) {
        this._state = { ...initialState };
    }

    /**
     * Get a state value by key
     */
    get<K extends keyof T>(key: K): T[K] {
        return this._state[key];
    }

    /**
     * Set a state value
     */
    set<K extends keyof T>(key: K, value: T[K]): void {
        if (this._disposed) return;

        const oldValue = this._state[key];
        if (oldValue === value) return;

        this._state[key] = value;
        this._notify(key, value, oldValue);
    }

    /**
     * Update multiple state values at once
     */
    update(partial: Partial<T>): void {
        if (this._disposed) return;

        for (const [key, value] of Object.entries(partial)) {
            const k = key as keyof T;
            const oldValue = this._state[k];
            if (oldValue !== value) {
                this._state[k] = value as T[keyof T];
                this._notify(k, value, oldValue);
            }
        }
    }

    /**
     * Get a snapshot of the entire state
     */
    snapshot(): T {
        return { ...this._state };
    }

    /**
     * Replace the entire state
     */
    replace(newState: T): void {
        if (this._disposed) return;

        const oldState = this._state;
        this._state = { ...newState };

        // Notify all changes
        for (const key of Object.keys(newState) as (keyof T)[]) {
            if (oldState[key] !== newState[key]) {
                this._notify(key, newState[key], oldState[key]);
            }
        }
    }

    /**
     * Reset to initial values
     */
    reset(initialState: T): void {
        this.replace(initialState);
    }

    /**
     * Subscribe to changes on a specific key
     */
    on<K extends keyof T>(key: K, listener: StateListener<T[K]>): () => void {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key)!.add(listener);

        // Return unsubscribe function
        return () => this.off(key, listener);
    }

    /**
     * Unsubscribe from changes on a specific key
     */
    off<K extends keyof T>(key: K, listener: StateListener<T[K]>): void {
        this._listeners.get(key)?.delete(listener);
    }

    /**
     * Subscribe to all state changes
     */
    onAny(listener: (key: keyof T, newValue: any, oldValue: any) => void): () => void {
        this._globalListeners.add(listener);
        return () => this._globalListeners.delete(listener);
    }

    /**
     * Subscribe to changes, calling immediately with current value
     */
    watch<K extends keyof T>(key: K, listener: StateListener<T[K]>): () => void {
        listener(this._state[key], this._state[key]);
        return this.on(key, listener);
    }

    /**
     * Check if a key exists
     */
    has(key: keyof T): boolean {
        return key in this._state;
    }

    /**
     * Get all keys
     */
    keys(): (keyof T)[] {
        return Object.keys(this._state) as (keyof T)[];
    }

    /**
     * Dispose the state
     */
    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this._listeners.clear();
        this._globalListeners.clear();
    }

    // Private methods

    private _notify<K extends keyof T>(key: K, newValue: T[K], oldValue: T[K]): void {
        // Notify specific listeners
        const listeners = this._listeners.get(key);
        if (listeners) {
            for (const listener of listeners) {
                listener(newValue, oldValue);
            }
        }

        // Notify global listeners
        for (const listener of this._globalListeners) {
            listener(key, newValue, oldValue);
        }
    }
}

/**
 * Create a derived state that computes from another state
 */
export function derived<T extends Record<string, any>, R>(
    source: State<T>,
    compute: (state: T) => R
): { get: () => R; subscribe: (listener: (value: R) => void) => () => void } {
    let cached = compute(source.snapshot());
    const listeners = new Set<(value: R) => void>();

    const unsubscribe = source.onAny(() => {
        const newValue = compute(source.snapshot());
        if (newValue !== cached) {
            cached = newValue;
            for (const listener of listeners) {
                listener(newValue);
            }
        }
    });

    return {
        get: () => cached,
        subscribe: (listener: (value: R) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    unsubscribe();
                }
            };
        },
    };
}

/**
 * Helper to create a simple counter state
 */
export function createCounter(initial = 0) {
    const state = new State({ value: initial });
    return {
        get value() { return state.get("value"); },
        increment: (amount = 1) => state.set("value", state.get("value") + amount),
        decrement: (amount = 1) => state.set("value", state.get("value") - amount),
        reset: () => state.set("value", initial),
        on: (listener: StateListener<number>) => state.on("value", listener),
        dispose: () => state.dispose(),
    };
}

/**
 * Helper to create a health state with min/max bounds
 */
export function createHealthState(initial: number, max = initial, min = 0) {
    const state = new State({
        current: initial,
        max,
        min,
    });

    return {
        get current() { return state.get("current"); },
        get max() { return state.get("max"); },
        get min() { return state.get("min"); },
        get percentage() { return state.get("current") / state.get("max"); },
        get isEmpty() { return state.get("current") <= state.get("min"); },
        get isFull() { return state.get("current") >= state.get("max"); },

        damage: (amount: number) => {
            const newValue = Math.max(state.get("min"), state.get("current") - amount);
            state.set("current", newValue);
        },

        heal: (amount: number) => {
            const newValue = Math.min(state.get("max"), state.get("current") + amount);
            state.set("current", newValue);
        },

        setMax: (max: number) => state.set("max", max),

        reset: () => state.set("current", initial),

        fill: () => state.set("current", state.get("max")),

        on: (listener: StateListener<number>) => state.on("current", listener),

        dispose: () => state.dispose(),
    };
}
