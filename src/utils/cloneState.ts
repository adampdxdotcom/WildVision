/**
 * Fast deep clone utility optimized for design state objects and arrays.
 * Bypasses JSON.parse(JSON.stringify()) overhead, supporting structured clone
 * with fallback for pure data primitives, nested objects, and arrays.
 */
export function fastDeepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Use native structuredClone if available in the environment
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback to manual recursive clone if structuredClone fails on edge cases
    }
  }

  if (Array.isArray(obj)) {
    const copyArr: any[] = new Array(obj.length);
    for (let i = 0; i < obj.length; i++) {
      copyArr[i] = fastDeepClone(obj[i]);
    }
    return copyArr as unknown as T;
  }

  const copyObj: any = {};
  for (const key of Object.keys(obj as any)) {
    copyObj[key] = fastDeepClone((obj as any)[key]);
  }
  return copyObj as T;
}
