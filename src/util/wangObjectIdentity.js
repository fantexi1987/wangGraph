export class wangObjectIdentity {
  static FIELD_NAME = 'wangObjectId';
  static counter = 0;

  static get(obj) {
    if (obj != null) {
      if (obj[wangObjectIdentity.FIELD_NAME] == null) {
        if (typeof obj === 'object') {
          let ctor = getFunctionName(obj.constructor);
          obj[wangObjectIdentity.FIELD_NAME] = ctor + '#' + wangObjectIdentity.counter++;
        } else if (typeof obj === 'function') {
          obj[wangObjectIdentity.FIELD_NAME] = 'Function#' + wangObjectIdentity.counter++;
        }
      }

      return obj[wangObjectIdentity.FIELD_NAME];
    }

    return null;
  }

  static clear(obj) {
    if (typeof obj === 'object' || typeof obj === 'function') {
      delete obj[wangObjectIdentity.FIELD_NAME];
    }
  }
}

function getFunctionName(f) {
  let str = null;

  if (f != null) {
    if (f.name != null) {
      str = f.name;
    } else {
      str = f.toString().trim();

      if (/^function\s/.test(str)) {
        str = ltrim(str.substring(9));
        let idx2 = str.indexOf('(');

        if (idx2 > 0) {
          str = str.substring(0, idx2);
        }
      }
    }
  }

  return str;
}

function ltrim(str, chars) {
  chars = chars || '\\s';
  return str != null ? str.replace(new RegExp('^[' + chars + ']+', 'g'), '') : null;
}
