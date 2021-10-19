import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangCell } from '@wangGraph/model/wangCell';
import { wangCodecRegistry } from '@wangGraph/io/wangCodecRegistry';

export class wangCellCodec extends wangObjectCodec {
  constructor() {
    super(new wangCell(), ['children', 'edges', 'overlays', 'wangTransient'], ['parent', 'source', 'target']);
  }

  isCellCodec() {
    return true;
  }

  isNumericAttribute(dec, attr, obj) {
    return attr.nodeName !== 'value' && super.isNumericAttribute(dec, attr, obj);
  }

  isExcluded(obj, attr, value, isWrite) {
    return (
      super.isExcluded(obj, attr, value, isWrite) ||
      (isWrite && attr == 'value' && value.nodeType == wangConstants.NODETYPE_ELEMENT)
    );
  }

  afterEncode(enc, obj, node) {
    if (obj.value != null && obj.value.nodeType == wangConstants.NODETYPE_ELEMENT) {
      let tmp = node;
      node = wangUtils.importNode(enc.document, obj.value, true);
      node.appendChild(tmp);
      let id = tmp.getAttribute('id');
      node.setAttribute('id', id);
      tmp.removeAttribute('id');
    }

    return node;
  }

  beforeDecode(dec, node, obj) {
    let inner = node.cloneNode(true);
    let classname = this.getName();

    if (node.nodeName != classname) {
      let tmp = node.getElementsByTagName(classname)[0];

      if (tmp != null && tmp.parentNode == node) {
        wangUtils.removeWhitespace(tmp, true);
        wangUtils.removeWhitespace(tmp, false);
        tmp.parentNode.removeChild(tmp);
        inner = tmp;
      } else {
        inner = null;
      }

      obj.value = node.cloneNode(true);
      let id = obj.value.getAttribute('id');

      if (id != null) {
        obj.setId(id);
        obj.value.removeAttribute('id');
      }
    } else {
      obj.setId(node.getAttribute('id'));
    }

    if (inner != null) {
      for (let i = 0; i < this.idrefs.length; i++) {
        let attr = this.idrefs[i];
        let ref = inner.getAttribute(attr);

        if (ref != null) {
          inner.removeAttribute(attr);
          let object = dec.objects[ref] || dec.lookup(ref);

          if (object == null) {
            let element = dec.getElementById(ref);

            if (element != null) {
              let decoder = wangCodecRegistry.codecs[element.nodeName] || this;
              object = decoder.decode(dec, element);
            }
          }

          obj[attr] = object;
        }
      }
    }

    return inner;
  }
}
