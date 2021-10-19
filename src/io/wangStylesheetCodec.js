import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangStyleRegistry } from '@wangGraph/view/wangStyleRegistry';
import { wangStylesheet } from '@wangGraph/view/wangStylesheet';

export class wangStylesheetCodec extends wangObjectCodec {
  static allowEval = true;

  constructor() {
    super(new wangStylesheet());
  }

  encode(enc, obj) {
    let node = enc.document.createElement(this.getName());

    for (let i in obj.styles) {
      let style = obj.styles[i];
      let styleNode = enc.document.createElement('add');

      if (i != null) {
        styleNode.setAttribute('as', i);

        for (let j in style) {
          let value = this.getStringValue(j, style[j]);

          if (value != null) {
            let entry = enc.document.createElement('add');
            entry.setAttribute('value', value);
            entry.setAttribute('as', j);
            styleNode.appendChild(entry);
          }
        }

        if (styleNode.childNodes.length > 0) {
          node.appendChild(styleNode);
        }
      }
    }

    return node;
  }

  getStringValue(key, value) {
    let type = typeof value;

    if (type == 'function') {
      value = wangStyleRegistry.getName(value);
    } else if (type == 'object') {
      value = null;
    }

    return value;
  }

  decode(dec, node, into) {
    let obj = into || new this.template.constructor();
    let id = node.getAttribute('id');

    if (id != null) {
      dec.objects[id] = obj;
    }

    node = node.firstChild;

    while (node != null) {
      if (!this.processInclude(dec, node, obj) && node.nodeName == 'add') {
        let as = node.getAttribute('as');

        if (as != null) {
          let extend = node.getAttribute('extend');
          let style = extend != null ? wangUtils.clone(obj.styles[extend]) : null;

          if (style == null) {
            if (extend != null) {
              wangLog.warn('wangStylesheetCodec.decode: stylesheet ' + extend + ' not found to extend');
            }

            style = new Object();
          }

          let entry = node.firstChild;

          while (entry != null) {
            if (entry.nodeType == wangConstants.NODETYPE_ELEMENT) {
              let key = entry.getAttribute('as');

              if (entry.nodeName == 'add') {
                let text = wangUtils.getTextContent(entry);
                let value = null;

                if (text != null && text.length > 0 && wangStylesheetCodec.allowEval) {
                  value = wangUtils.eval(text);
                } else {
                  value = entry.getAttribute('value');

                  if (wangUtils.isNumeric(value)) {
                    value = parseFloat(value);
                  }
                }

                if (value != null) {
                  style[key] = value;
                }
              } else if (entry.nodeName == 'remove') {
                delete style[key];
              }
            }

            entry = entry.nextSibling;
          }

          obj.putCellStyle(as, style);
        }
      }

      node = node.nextSibling;
    }

    return obj;
  }
}
