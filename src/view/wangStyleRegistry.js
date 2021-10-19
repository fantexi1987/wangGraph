export class wangStyleRegistry {
  static values = [];

  static putValue(name, obj) {
    wangStyleRegistry.values[name] = obj;
  }

  static getValue(name) {
    return wangStyleRegistry.values[name];
  }

  static getName(value) {
    for (let key in wangStyleRegistry.values) {
      if (wangStyleRegistry.values[key] == value) {
        return key;
      }
    }

    return null;
  }
}
