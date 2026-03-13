//

import { deepEqual, hasOwn } from "../../internal/utils/js";

export type PathLike = string | string[];

export function asPath(path: PathLike): string[] {
  //
  return Array.isArray(path) ? path.slice() : path.split(".");
}

export function asStrPath(path: PathLike): string {
  //
  return Array.isArray(path) ? path.join(".") : path;
}

export function copyValue(obj: any) {
  //
  return Array.isArray(obj) ? obj.slice() : { ...obj };
}

export interface DataSchemaConfig {
  valuePaths?: string[];
  defaultData?: any;
}

export interface DataWrapperOpts<T> {
  valuePaths?: string[];
  defaultData?: any;
  data?: Partial<T>;
}

const defValuePaths = [
  "position",
  "rotation",
  "scale",
  "collider.translationLock",
  "collider.rotationLock",
];

function getValue(obj: any, key: string) {
  return obj?.[key];
}

function setValue(obj: any, key: any, value: any) {
  if (Array.isArray(obj)) {
    if (typeof key !== "number") {
      throw new Error("Invalid key for array");
    }
    obj = obj.slice();
    obj[key] = value;
    return obj;
  } else {
    return {
      ...obj,
      [key]: value,
    };
  }
}

function unsetValue(obj: any, key: any) {
  if (Array.isArray(obj)) {
    if (typeof key !== "number") {
      throw new Error("Invalid key for array");
    }
    obj = obj.slice();
    obj.splice(key, 1);
    return obj;
  } else {
    const { [key]: _, ...rest } = obj;
    return Object.keys(rest).length == 0 ? null : rest;
  }
}

/**
 * @internal
 */
export class DataWrapper<T = any> {
  //

  //#region Properties + Constructor

  protected _listeners = [];

  _valuePaths: Record<string, boolean> = {};

  private _defaultData: any;

  _data: Partial<T>;

  _proxy: any;

  _proxyCache: any = {};

  constructor(opts: DataWrapperOpts<T>) {
    //
    this._initValuePaths(opts.valuePaths);
    this._defaultData = structuredClone(opts.defaultData ?? {});
    this._data = opts.data ?? {};
    this._proxy = this._createDataProxy();
  }

  private _initValuePaths(paths: string[] = []) {
    this._valuePaths = {};
    defValuePaths.forEach((path) => {
      this._valuePaths[path] = true;
    });
    paths.forEach((path) => {
      this._valuePaths[path] = true;
    });
  }

  //#endregion

  //#region Getters
  get id() {
    // @ts-ignore
    return this._data.id;
  }

  /**
   * Returns the data
   */
  get data() {
    //
    return this._data;
  }
  //#endregion

  //#region Change Notification@
  onChange(fn) {
    //
    this._listeners.push(fn);

    return () => {
      //
      this._listeners.splice(this._listeners.indexOf(fn), 1);
    };
  }

  private _listenersPaused = false;

  pauseNotifications() {
    //
    this._listenersPaused = true;
  }

  resumeNotifications(notify = true) {
    //
    this._listenersPaused = false;

    if (notify) this.notify();
  }

  notify = () => {
    //
    if (this._listenersPaused) return;

    let i = 0;
    while (i < this._listeners.length) {
      this._listeners[i]();

      i++;
    }
  };

  //#endregion

  //#region Schema helpers (inlined from DataSchema)

  private _isObject(item: any) {
    return item != null && typeof item === "object" && !Array.isArray(item);
  }

  /**
   * Returns true if the item is a value or if the path is a value path
   */
  private _isValue(item: any, path: string) {
    return !this._isObject(item) || this._valuePaths[path];
  }

  private _pathsCache = new WeakMap<any, string[]>();

  /**
   * Returns the paths to final values in the object
   */
  private _paths(obj: any) {
    let paths = this._pathsCache.get(obj);
    if (paths) return paths;

    paths = [];
    this._forEachValue(obj, (value, path) => {
      if (value == null) return;
      paths.push(path);
    });

    this._pathsCache.set(obj, paths);
    return paths;
  }

  private _forEachValue(
    obj: any,
    fn: (value: any, path: string, parent: any) => void
  ) {
    if (!this._isObject(obj)) return;
    this._forEachValueRec(obj, fn);
  }

  private _forEachValueRec(obj, fn, prefix = "") {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const currentPath = prefix + key;

      if (this._isValue(value, currentPath)) {
        fn(value, currentPath, obj);
      } else {
        this._forEachValueRec(value, fn, currentPath + ".");
      }
    });
  }

  /**
   * Returns true if the object has the given path
   */
  private _has(obj: any, path: PathLike) {
    const parts = asPath(path);
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      currentPath += key;

      if (obj == null || !hasOwn(obj, key)) {
        return false;
      }
      obj = obj[key];
      currentPath += ".";
    }
    return true;
  }

  /**
   * Returns the value at the given path
   */
  private _get(obj: any, path: PathLike) {
    const parts = asPath(path);
    return parts.reduce(getValue, obj);
  }

  /**
   * Sets the value at the given path
   */
  private _set(obj: any, path: PathLike, value: any) {
    if (value === undefined) {
      return this._unset(obj, path);
    }
    const parts = asPath(path);
    return this._setRec(obj, parts, value);
  }

  private _setRec(obj: any, parts: string[], value: any, prefix = "") {
    const [key, ...rest] = parts;

    if (rest.length === 0) {
      return setValue(obj, key, value);
    }

    const currentPath = prefix + key;
    let child = obj[key];

    if (child != null && this._isValue(child, currentPath)) {
      throw new Error("Cannot mutate values on " + currentPath);
    }

    child ??= {};
    const newVal = this._setRec(child, rest, value);
    return setValue(obj, key, newVal);
  }

  /**
   * Unsets the value at the given path
   */
  private _unset(obj: any, path: PathLike) {
    const parts = asPath(path);
    if (!this._has(obj, path)) return obj;

    const res = this._unsetRec(obj, parts);
    return res ?? {};
  }

  private _unsetRec(obj: any, parts: string[], prefix = "") {
    const [head, ...tail] = parts;

    if (tail.length === 0) {
      return unsetValue(obj, head);
    }

    const currentPath = prefix + head;
    let child = obj[head];

    if (this._isValue(child, currentPath)) {
      throw new Error("Cannot mutate values on " + currentPath);
    }

    child ??= {};
    const val = this._unsetRec(child, tail);

    if (val == null) {
      const { [head]: _, ...rest } = obj;
      return Object.keys(rest).length == 0 ? null : rest;
    }

    return {
      ...obj,
      [head]: this._unsetRec(child, tail),
    };
  }

  private _unionWith(obj1: any, obj2: any, combineFn: (a: any, b: any) => any) {
    let res = obj1;

    this._forEachValue(obj2, (value, path) => {
      const existing = this._get(obj1, path);
      const combined = combineFn(existing, value);

      if (combined == null) {
        res = this._unset(res, path);
      } else if (combined != existing) {
        res = this._set(res, path, combined);
      }
    });

    return res;
  }

  /**
   * Returns an object whose paths are the union of the paths of obj1 and obj2
   * paths in obj2 take precedence over paths in obj1
   */
  private _assign(obj1: any, obj2: any) {
    return this._unionWith(obj1, obj2, (a, b) => b ?? a);
  }

  /**
   * Returns from obj1 only the paths that are present in obj2
   */
  private _extract(obj1: any, obj2: any) {
    const paths = this._paths(obj2);
    let res = {};

    paths.forEach((path) => {
      const value = this._get(obj1, path);
      if (value != null) {
        res = this._set(res, path, value);
      }
    });

    return res;
  }

  /**
   * Returns true if obj1 includes obj2
   */
  private _includes(obj1: any, obj2: any) {
    let equals = true;

    this._forEachValue(obj2, (value, path) => {
      if (!deepEqual(value, this._get(obj1, path))) {
        equals = false;
      }
    });

    return equals;
  }

  /**
   * Returns from own data only the paths that are present in data
   */
  extract(data: Partial<T>) {
    return this._extract(this._data, data);
  }

  /**
   * Returns true if own data includes data
   */
  includes(data: Partial<T>) {
    return this._includes(this._data, data);
  }

  //#endregion

  //#region Data Access
  /**
   * Returns the value of the given path in the data
   */
  get(path: PathLike) {
    //
    return this._get(this._data, path);
  }

  /**
   * Sets the value of the given path in the own data
   */
  set(path: PathLike, value: any, notify = true) {
    //
    const strPath = asStrPath(path);

    // if we're setting a subpath of a derived value (eg array access), we need
    // to get the whole value and set the subpath on it
    if (this._valuePaths[strPath] == null) {
      // look for the closest value path
      let prefix: string[] = null;
      let suffix: string[] = null;

      for (let valuePath in this._valuePaths) {
        if (strPath.startsWith(valuePath)) {
          prefix = asPath(valuePath);
          suffix = strPath.slice(valuePath.length + 1).split(".");
          break;
        }
      }

      if (prefix) {
        //
        path = prefix;

        let parentValue = copyValue(this.get(prefix));

        value = this._setValueMut(parentValue, suffix, value);
      }
    }

    this._data = this._set(this._data, path, value);

    if (notify) {
      this.notify();
    }
  }

  setMeta(key: string, value: string) {
    //
    let meta = this._data?.["_meta"] ?? {};

    meta[key] = value;

    this.set("_meta", meta, false);
  }

  getMeta(key: string) {
    //
    return this._data?.["_meta"]?.[key];
  }

  private _getValueMut(data: any, path: string[]) {
    //
    let obj = data;

    for (let i = 0; i < path.length; i++) {
      //
      obj = obj[path[i]];
    }

    return obj;
  }

  private _setValueMut(object: any, path: string[], value: any) {
    //
    const key = path[0];

    if (path.length === 1) {
      // fast track: mutably set the value
      object[key] = value;
      //
    } else {
      // for nested paths, we need to clone the objects
      const data = object[key];

      let current = copyValue(data);

      object[key] = current;

      // immutable set the value on target

      for (let i = 1; i < path.length - 1; i++) {
        //
        const childKey = path[i];

        const childData = current[childKey];

        current = current[childKey] = copyValue(childData);
      }

      current[path[path.length - 1]] = value;
    }

    return object;
  }

  /**
   * Used at runtime for perfs
   */
  setMerged(path: string[], value: any, notify = true) {
    //
    this._setValueMut(this._data, path, value);

    if (notify) {
      this.notify();
    }
  }

  getMerged(path: string[]) {
    //
    return this._getValueMut(this._data, path);
  }

  setOwnData(data: Partial<T>, notify = true) {
    //
    this._data = data;

    if (notify) this.notify();
  }

  /**
   * Assigns the given data to the own data
   */
  assign(data: Partial<T>) {
    //
    this._data = this._assign(this._data, data);

    this.notify();
  }

  /**
   * Remove the given paths from the own data
   */
  unset(...paths: PathLike[]) {
    //
    this._data = paths.reduce((acc, path) => {
      //
      return this._unset(acc, path);
      //
    }, this._data);

    this.notify();
  }

  //#endregion

  /**
   * Creates a proxy object that allows to access the data in a more convenient way
   */
  private _createDataProxy(prefix = "") {
    //
    if (prefix && prefix in this._proxyCache) {
      return this._proxyCache[prefix];
    }

    const handler: ProxyHandler<any> = {
      get: (target, prop) => {
        if (target[prop]) return target[prop];

        const path = prefix + String(prop);

        // if the path is final, return the value
        // otherwise, return a new proxy with the new path
        const value = this.get(path);

        if (this._isValue(value, path)) {
          return value;
        }

        return this._createDataProxy(path + ".");
      },

      set: (target, prop, value) => {
        const path = prefix + String(prop);
        this.set(path, value);
        return true;
      },

      deleteProperty: (target, prop) => {
        const path = prefix + String(prop);
        this.unset(path);
        return true;
      },

      getOwnPropertyDescriptor(target, prop) {
        return {
          enumerable: true,
          configurable: true,
        };
      },

      ownKeys: (target) => {
        const value = prefix
          ? this.get(prefix.slice(0, prefix.length - 1))
          : this.data;

        if (typeof value !== "object") return [];

        return Object.keys(value);
      },
    };

    const proxy = new Proxy(
      {
        DATA_PROXY_ID: this.id,
      },
      handler
    );

    this._proxyCache[prefix] = proxy;

    return proxy;
  }

  private _wasDisposed = false;
  dispose() {
    //
    if (this._wasDisposed) return;

    this._wasDisposed = true;

    this._listeners = [];

    this._proxy = null;

    this._proxyCache = null;
  }
}
