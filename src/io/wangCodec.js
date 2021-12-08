import { wangLog } from '@wangGraph/util/wangLog';
import { wangCodecRegistry } from '@wangGraph/io/wangCodecRegistry';
import { wangCellPath } from '@wangGraph/model/wangCellPath';
import { wangCell } from '@wangGraph/model/wangCell';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

// import RenderWorker from '@wangGraph/worker';

export class wangCodec {
  elements = null;
  encodeDefaults = false;

  constructor(document) {
    this.document = document || wangUtils.createXmlDocument();
    this.objects = [];
  }

  putObject(id, obj) {
    this.objects[id] = obj;
    return obj;
  }

  getObject(id) {
    let obj = null;

    if (id != null) {
      obj = this.objects[id];

      if (obj == null) {
        obj = this.lookup(id);

        if (obj == null) {
          let node = this.getElementById(id);

          if (node != null) {
            obj = this.decode(node);
          }
        }
      }
    }

    return obj;
  }

  lookup(id) {
    return null;
  }

  getElementById(id) {
    this.updateElements();
    return this.elements[id];
  }

  updateElements() {
    if (this.elements == null) {
      this.elements = new Object();

      if (this.document.documentElement != null) {
        this.addElement(this.document.documentElement);
      }
    }
  }

  addElement(node) {
    if (node.nodeType == wangConstants.NODETYPE_ELEMENT) {
      let id = node.getAttribute('id');

      if (id != null) {
        if (this.elements[id] == null) {
          this.elements[id] = node;
        } else if (this.elements[id] != node) {
          throw new Error(id + ': Duplicate ID');
        }
      }
    }

    node = node.firstChild;

    while (node != null) {
      this.addElement(node);
      node = node.nextSibling;
    }
  }

  getId(obj) {
    let id = null;

    if (obj != null) {
      id = this.reference(obj);

      if (id == null && obj instanceof wangCell) {
        id = obj.getId();

        if (id == null) {
          id = wangCellPath.create(obj);

          if (id.length == 0) {
            id = 'root';
          }
        }
      }
    }

    return id;
  }

  reference(obj) {
    return null;
  }

  encode(obj) {
    let node = null;

    if (obj != null && obj.constructor != null) {
      let enc = wangCodecRegistry.getCodec(obj.constructor);

      if (enc != null) {
        node = enc.encode(this, obj);
      } else {
        if (wangUtils.isNode(obj)) {
          node = wangUtils.importNode(this.document, obj, true);
        } else {
          wangLog.warn('wangCodec.encode: No codec for ' + wangUtils.getFunctionName(obj.constructor));
        }
      }
    }

    return node;
  }

  decode(node, into) {
    // RenderWorker.send({ msg: 'hello!!' }).then((result) => {
    //   console.log(result);
    // });
    this.updateElements();
    let obj = null;

    if (node != null && node.nodeType == wangConstants.NODETYPE_ELEMENT) {
      let ctor = null;

      try {
        ctor = window[node.nodeName];
      } catch (err) {
        /* ignore */
      }

      let dec = wangCodecRegistry.getCodec(ctor);

      if (dec != null) {
        obj = dec.decode(this, node, into);
      } else {
        obj = node.cloneNode(true);
        obj.removeAttribute('as');
      }
    }

    return obj;
  }

  encodeCell(cell, node, includeChildren) {
    node.appendChild(this.encode(cell));

    if (includeChildren == null || includeChildren) {
      let childCount = cell.getChildCount();

      for (let i = 0; i < childCount; i++) {
        this.encodeCell(cell.getChildAt(i), node);
      }
    }
  }

  isCellCodec(codec) {
    if (codec != null && typeof codec.isCellCodec == 'function') {
      return codec.isCellCodec();
    }

    return false;
  }

  decodeCell(node, restoreStructures) {
    restoreStructures = restoreStructures != null ? restoreStructures : true;
    let cell = null;

    if (node != null && node.nodeType == wangConstants.NODETYPE_ELEMENT) {
      let decoder = wangCodecRegistry.getCodec(node.nodeName);

      if (!this.isCellCodec(decoder)) {
        let child = node.firstChild;

        while (child != null && !this.isCellCodec(decoder)) {
          decoder = wangCodecRegistry.getCodec(child.nodeName);
          child = child.nextSibling;
        }
      }

      if (!this.isCellCodec(decoder)) {
        decoder = wangCodecRegistry.getCodec(wangCell);
      }

      cell = decoder.decode(this, node);

      if (restoreStructures) {
        this.insertIntoGraph(cell);
      }
    }

    return cell;
  }

  insertIntoGraph(cell) {
    let parent = cell.parent;
    let source = cell.getTerminal(true);
    let target = cell.getTerminal(false);
    cell.setTerminal(null, false);
    cell.setTerminal(null, true);
    cell.parent = null;

    if (parent != null) {
      if (parent == cell) {
        throw new Error(parent.id + ': Self Reference');
      } else {
        parent.insert(cell);
      }
    }

    if (source != null) {
      source.insertEdge(cell, true);
    }

    if (target != null) {
      target.insertEdge(cell, false);
    }
  }

  setAttribute(node, attribute, value) {
    if (attribute != null && value != null) {
      node.setAttribute(attribute, value);
    }
  }
}
