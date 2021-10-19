import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangGraphModel } from '@wangGraph/model/wangGraphModel';

export class wangModelCodec extends wangObjectCodec {
  constructor() {
    super(new wangGraphModel());
  }

  encodeObject(enc, obj, node) {
    let rootNode = enc.document.createElement('root');
    enc.encodeCell(obj.getRoot(), rootNode);
    node.appendChild(rootNode);
  }

  decodeChild(dec, child, obj) {
    if (child.nodeName == 'root') {
      this.decodeRoot(dec, child, obj);
    } else {
      super.decodeChild(dec, child, obj);
    }
  }

  decodeRoot(dec, root, model) {
    let rootCell = null;
    let tmp = root.firstChild;

    while (tmp != null) {
      let cell = dec.decodeCell(tmp);

      if (cell != null && cell.getParent() == null) {
        rootCell = cell;
      }

      tmp = tmp.nextSibling;
    }

    if (rootCell != null) {
      model.setRoot(rootCell);
    }
  }
}
