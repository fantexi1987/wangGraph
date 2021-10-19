export class wangCellPath {
  static PATH_SEPARATOR = '.';

  static create(cell) {
    let result = '';

    if (cell != null) {
      let parent = cell.getParent();

      while (parent != null) {
        let index = parent.getIndex(cell);
        result = index + wangCellPath.PATH_SEPARATOR + result;
        cell = parent;
        parent = cell.getParent();
      }
    }

    let n = result.length;

    if (n > 1) {
      result = result.substring(0, n - 1);
    }

    return result;
  }

  static getParentPath(path) {
    if (path != null) {
      let index = path.lastIndexOf(wangCellPath.PATH_SEPARATOR);

      if (index >= 0) {
        return path.substring(0, index);
      } else if (path.length > 0) {
        return '';
      }
    }

    return null;
  }

  static resolve(root, path) {
    let parent = root;

    if (path != null) {
      let tokens = path.split(wangCellPath.PATH_SEPARATOR);

      for (let i = 0; i < tokens.length; i++) {
        parent = parent.getChildAt(parseInt(tokens[i]));
      }
    }

    return parent;
  }

  static compare(p1, p2) {
    let min = Math.min(p1.length, p2.length);
    let comp = 0;

    for (let i = 0; i < min; i++) {
      if (p1[i] != p2[i]) {
        if (p1[i].length == 0 || p2[i].length == 0) {
          comp = p1[i] == p2[i] ? 0 : p1[i] > p2[i] ? 1 : -1;
        } else {
          let t1 = parseInt(p1[i]);
          let t2 = parseInt(p2[i]);
          comp = t1 == t2 ? 0 : t1 > t2 ? 1 : -1;
        }

        break;
      }
    }

    if (comp == 0) {
      let t1 = p1.length;
      let t2 = p2.length;

      if (t1 != t2) {
        comp = t1 > t2 ? 1 : -1;
      }
    }

    return comp;
  }
}
