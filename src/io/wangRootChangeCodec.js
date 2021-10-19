import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangRootChange } from '@wangGraph/model/changes/wangRootChange';

export class wangRootChangeCodec extends wangObjectCodec {
  constructor() {
    super(new wangRootChange(), ['model', 'previous', 'root']);
  }

  afterEncode(enc, obj, node) {
    enc.encodeCell(obj.root, node);
    return node;
  }

  beforeDecode(dec, node, obj) {
    if (node.firstChild != null && node.firstChild.nodeType == wangConstants.NODETYPE_ELEMENT) {
      node = node.cloneNode(true);
      let tmp = node.firstChild;
      obj.root = dec.decodeCell(tmp, false);
      let tmp2 = tmp.nextSibling;
      tmp.parentNode.removeChild(tmp);
      tmp = tmp2;

      while (tmp != null) {
        tmp2 = tmp.nextSibling;
        dec.decodeCell(tmp);
        tmp.parentNode.removeChild(tmp);
        tmp = tmp2;
      }
    }

    return node;
  }

  afterDecode(dec, node, obj) {
    obj.previous = obj.root;
    return obj;
  }
}
