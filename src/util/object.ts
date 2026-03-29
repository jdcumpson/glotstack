export function isObject(val: any): val is Record<string, any> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function _merge(target: any, source: any): any {
  if (!isObject(target) || !isObject(source)) return target;

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (Array.isArray(srcVal) && Array.isArray(tgtVal)) {
      target[key] = tgtVal.concat(srcVal);
    } else if (isObject(srcVal) && isObject(tgtVal)) {
      _merge(tgtVal, srcVal);
    } else {
      target[key] = srcVal;
    }
  }

  return target;
}

export function  merge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  return sources.reduce((previous, current) => _merge(previous, current), target) as T
}

export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b || a == null || b == null) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((val, i) => isEqual(val, b[i]));
  }

  if (typeof a === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every(key => b.hasOwnProperty(key) && isEqual(a[key], b[key]));
  }

  return false;
}


export function unflatten(flat: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const flatKey in flat) {
    const parts = flatKey.split('.')
    let current = result

    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        current[part] = flat[flatKey]
      } else {
        if (!(part in current)) {
          current[part] = {}
        }
        current = current[part]
      }
    })
  }

  return result
}