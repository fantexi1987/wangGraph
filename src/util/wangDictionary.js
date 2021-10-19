import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';

export class wangDictionary {
  map = null;

  constructor() {
    this.clear();
  }

  clear() {
    this.map = {};
  }

  get(key) {
    let id = wangObjectIdentity.get(key);
    return this.map[id];
  }

  put(key, value) {
    let id = wangObjectIdentity.get(key);
    let previous = this.map[id];
    this.map[id] = value;
    return previous;
  }

  remove(key) {
    let id = wangObjectIdentity.get(key);
    let previous = this.map[id];
    delete this.map[id];
    return previous;
  }

  getKeys() {
    let result = [];

    for (let key in this.map) {
      result.push(key);
    }

    return result;
  }

  getValues() {
    let result = [];

    for (let key in this.map) {
      result.push(this.map[key]);
    }

    return result;
  }

  visit(visitor) {
    for (let key in this.map) {
      visitor(key, this.map[key]);
    }
  }
}
