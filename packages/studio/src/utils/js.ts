export function noop(...x: any[]) {}

export const hasOwn =
  Object.hasOwn ??
  function (obj: object, key: PropertyKey) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };

export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function isPrimitive(obj) {
  return obj !== Object(obj);
}

export function removeItem(arr, el) {
  //
  const index = arr.indexOf(el);

  if (index >= 0) {
    arr.splice(index, 1);
  }

  return index;
}

export function eachKey<T1, T2, O extends Record<string, T1>>(
  obj: O,
  fn: (v: T1, key: string) => T2
): Record<string, T2> {
  //
  if (obj == null) return obj as any;

  let result: Record<string, T2> = {};

  for (let key in obj) {
    result[key] = fn(obj[key], key);
  }

  return result;
}

export function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function upgradeData(data, defData) {
  for (let key in defData) {
    if (!hasOwn(data, key)) {
      data[key] = defData[key];

      continue;
    }

    if (isObject(data[key])) {
      upgradeData(data[key], defData[key]);
    }
  }

  return data;
}

export function deepAssign(target, source) {
  //
  let keys = Object.keys(source);

  for (let key of keys) {
    const sourceVal = source[key];

    const targetVal = target[key];

    if (isObject(sourceVal) && isObject(targetVal)) {
      //
      deepAssign(targetVal, sourceVal);
    } else {
      //
      target[key] = sourceVal;
    }
  }

  return target;
}

export function deepEqual(x, y) {
  //
  if (
    x === y ||
    (x == null && y == null) ||
    (Number.isNaN(x) && Number.isNaN(y))
  ) {
    return true;
  }

  if (isPrimitive(x) && isPrimitive(y)) {
    return x === y;
  }

  if (Array.isArray(x) && Array.isArray(y)) {
    return x.length === y.length && x.every((it, i) => deepEqual(it, y[i]));
  }

  if (x == null || y == null) return false;

  const xKeys = Object.keys(x);

  const yKeys = Object.keys(y);

  if (xKeys.length !== yKeys.length) return false;

  // compare objects with same number of keys
  for (let i = 0; i < xKeys.length; i++) {
    const key = xKeys[i];
    if (!(key in y)) return false; //other object doesn't have this prop
    if (!deepEqual(x[key], y[key])) return false;
  }

  return true;
}

export function capitalize(val: string): string {
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export function isEmpty(obj): boolean {
  return obj && Object.keys(obj).length === 0;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function eclipseText(text, maxLength) {
  if (!text) return null;

  if (text.length <= maxLength) {
    return text;
  } else {
    return text.substring(0, maxLength) + "...";
  }
}

export function runOnce<T extends (...args: any[]) => any>(fn: T): T {
  let executed = false;
  let result: ReturnType<T>;

  return function (...args: Parameters<T>): ReturnType<T> {
    if (!executed) {
      result = fn(...args);
      executed = true;
    }
    return result;
  } as T;
}

export function toHex(s) {
  let hex = "";
  for (let i = 0; i < s.length; i++) {
    hex += "" + s.charCodeAt(i).toString(16);
  }
  return `0x${hex}`;
}

export const updateObjProperty = (obj: any, key: string, value: any) => {
  const nestedKeys = key.split(".");
  const lastKey = nestedKeys.pop() as string;

  nestedKeys.forEach((nestedKey) => {
    obj = obj[nestedKey];
  });

  if (obj[lastKey] !== value) {
    obj[lastKey] = value;
  }
};

export function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    const context = this;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

export async function saveFile(content: string, opts) {
  //
  // if ("showSaveFilePicker" in window) {
  //     //
  //     var taBlob = new Blob([content], { type: "text/plain" });

  //     try {
  //         //@ts-ignore
  //         const fileHandle = await window.showSaveFilePicker(opts);

  //         const writableFileStream = await fileHandle.createWritable();

  //         await writableFileStream.write(taBlob);

  //         await writableFileStream.close();
  //     } catch (err) {
  //         console.error(err);
  //     }
  //     //
  // } else {
  //
  var data = "text/json;charset=utf-8," + encodeURIComponent(content);

  var a = document.createElement("a");

  a.href = "data:" + data;

  a.download = opts.suggestedName;

  var container = document.createElement("div");

  container.appendChild(a);

  a.click();

  container.removeChild(a);

  a = null;
  // }
}

export async function selectFile(opts: {
  description: string;
  mime: string;
  extensions: string[];
}): Promise<File> {
  //
  if ("showOpenFilePicker" in window) {
    //

    const pickerOpts = {
      types: [
        {
          description: opts.description,
          accept: {
            [opts.mime]: opts.extensions,
          },
        },
      ],
      excludeAcceptAllOption: true,
      multiple: false,
    };

    try {
      //@ts-ignore
      const [fileHandle] = await window.showOpenFilePicker(pickerOpts);

      return fileHandle?.getFile();
      //
    } catch (err) {
      //
      if (err.code === DOMException.ABORT_ERR) return null;

      throw err;
    }

    //
  } else {
    //
    let lock = false;

    return new Promise((resolve) => {
      //
      let input = document.createElement("input");

      input.type = "file";

      input.style.display = "none";

      input.multiple = false;

      input.accept = opts.extensions.join(",");

      document.body.appendChild(input);

      input.addEventListener(
        "change",
        (event) => {
          //
          lock = true;

          const file = input.files?.[0];

          resolve(file);

          document.body.removeChild(input);

          input = null;
          //
        },
        { once: true }
      );

      window.addEventListener(
        "focus",
        () => {
          //
          setTimeout(() => {
            //
            if (!lock && input) {
              //
              resolve(null);
              // remove dom
              document.body.removeChild(input);
            }
          }, 300);
        },
        { once: true }
      );

      input.click();
    });
  }
}

export function formatWallet(address) {
  return `${address.slice(0, 12)}...${address.slice(-4)}`;
}
