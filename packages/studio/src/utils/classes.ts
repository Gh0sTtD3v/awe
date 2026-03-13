import { twMerge } from "tailwind-merge";

type ClassValue = string | number | boolean | undefined | null;
type ClassObject = Record<string, ClassValue>;
type ClassArray = ClassValue[];

export function classes(...args: (ClassValue | ClassObject | ClassArray)[]): string {
  const cls: string[] = [];

  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === "string" || typeof arg === "number") {
      cls.push(String(arg));
    } else if (Array.isArray(arg)) {
      cls.push(...arg.filter(Boolean).map(String));
    } else if (typeof arg === "object") {
      for (const key in arg) {
        if (arg[key]) {
          cls.push(key);
        }
      }
    }
  }

  return twMerge(cls.join(" "));
}
