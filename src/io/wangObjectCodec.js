import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangGeometry } from '@wangGraph/model/wangGeometry';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangObjectCodec {
  static allowEval = false;

  constructor(template, exclude, idrefs, mapping) {
    this.template = template;
    this.exclude = exclude != null ? exclude : [];
    this.idrefs = idrefs != null ? idrefs : [];
    this.mapping = mapping != null ? mapping : [];
    this.reverse = new Object();

    for (let i in this.mapping) {
      this.reverse[this.mapping[i]] = i;
    }
  }

  getName() {
    return wangUtils.getFunctionName(this.template.constructor);
  }

  cloneTemplate() {
    return new this.template.constructor();
  }

  getFieldName(attributename) {
    if (attributename != null) {
      let mapped = this.reverse[attributename];

      if (mapped != null) {
        attributename = mapped;
      }
    }

    return attributename;
  }

  getAttributeName(fieldname) {
    if (fieldname != null) {
      let mapped = this.mapping[fieldname];

      if (mapped != null) {
        fieldname = mapped;
      }
    }

    return fieldname;
  }

  isExcluded(obj, attr, value, write) {
    return attr == wangObjectIdentity.FIELD_NAME || wangUtils.indexOf(this.exclude, attr) >= 0;
  }

  isReference(obj, attr, value, write) {
    return wangUtils.indexOf(this.idrefs, attr) >= 0;
  }

  encode(enc, obj) {
    let node = enc.document.createElement(this.getName());
    obj = this.beforeEncode(enc, obj, node);
    this.encodeObject(enc, obj, node);
    return this.afterEncode(enc, obj, node);
  }

  encodeObject(enc, obj, node) {
    enc.setAttribute(node, 'id', enc.getId(obj));

    for (let i in obj) {
      let name = i;
      let value = obj[name];

      if (value != null && !this.isExcluded(obj, name, value, true)) {
        if (wangUtils.isInteger(name)) {
          name = null;
        }

        this.encodeValue(enc, obj, name, value, node);
      }
    }
  }

  encodeValue(enc, obj, name, value, node) {
    if (value != null) {
      if (this.isReference(obj, name, value, true)) {
        let tmp = enc.getId(value);

        if (tmp == null) {
          wangLog.warn('wangObjectCodec.encode: No ID for ' + this.getName() + '.' + name + '=' + value);
          return;
        }

        value = tmp;
      }

      let defaultValue = this.template[name];

      if (name == null || enc.encodeDefaults || defaultValue != value) {
        name = this.getAttributeName(name);
        this.writeAttribute(enc, obj, name, value, node);
      }
    }
  }

  writeAttribute(enc, obj, name, value, node) {
    if (typeof value != 'object') {
      this.writePrimitiveAttribute(enc, obj, name, value, node);
    } else {
      this.writeComplexAttribute(enc, obj, name, value, node);
    }
  }

  writePrimitiveAttribute(enc, obj, name, value, node) {
    value = this.convertAttributeToXml(enc, obj, name, value, node);

    if (name == null) {
      let child = enc.document.createElement('add');

      if (typeof value == 'function') {
        child.appendChild(enc.document.createTextNode(value));
      } else {
        enc.setAttribute(child, 'value', value);
      }

      node.appendChild(child);
    } else if (typeof value != 'function') {
      enc.setAttribute(node, name, value);
    }
  }

  writeComplexAttribute(enc, obj, name, value, node) {
    let child = enc.encode(value);

    if (child != null) {
      if (name != null) {
        child.setAttribute('as', name);
      }

      node.appendChild(child);
    } else {
      wangLog.warn('wangObjectCodec.encode: No node for ' + this.getName() + '.' + name + ': ' + value);
    }
  }

  convertAttributeToXml(enc, obj, name, value) {
    if (this.isBooleanAttribute(enc, obj, name, value)) {
      value = value == true ? '1' : '0';
    }

    return value;
  }

  isBooleanAttribute(enc, obj, name, value) {
    return typeof value.length == 'undefined' && (value == true || value == false);
  }

  convertAttributeFrowangml(dec, attr, obj) {
    let value = attr.value;

    if (this.isNumericAttribute(dec, attr, obj)) {
      value = parseFloat(value);

      if (isNaN(value) || !isFinite(value)) {
        value = 0;
      }
    }

    return value;
  }

  isNumericAttribute(dec, attr, obj) {
    let result =
      (obj.constructor == wangGeometry &&
        (attr.name == 'x' || attr.name == 'y' || attr.name == 'width' || attr.name == 'height')) ||
      (obj.constructor == wangPoint && (attr.name == 'x' || attr.name == 'y')) ||
      wangUtils.isNumeric(attr.value);
    return result;
  }

  beforeEncode(enc, obj, node) {
    return obj;
  }

  afterEncode(enc, obj, node) {
    return node;
  }

  decode(dec, node, into) {
    let id = node.getAttribute('id');
    let obj = dec.objects[id];

    if (obj == null) {
      obj = into || this.cloneTemplate();

      if (id != null) {
        dec.putObject(id, obj);
      }
    }

    node = this.beforeDecode(dec, node, obj);
    this.decodeNode(dec, node, obj);
    return this.afterDecode(dec, node, obj);
  }

  decodeNode(dec, node, obj) {
    if (node != null) {
      this.decodeAttributes(dec, node, obj);
      this.decodeChildren(dec, node, obj);
    }
  }

  decodeAttributes(dec, node, obj) {
    let attrs = node.attributes;

    if (attrs != null) {
      for (let i = 0; i < attrs.length; i++) {
        this.decodeAttribute(dec, attrs[i], obj);
      }
    }
  }

  isIgnoredAttribute(dec, attr, obj) {
    return attr.nodeName == 'as' || attr.nodeName == 'id';
  }

  decodeAttribute(dec, attr, obj) {
    if (!this.isIgnoredAttribute(dec, attr, obj)) {
      let name = attr.nodeName;
      let value = this.convertAttributeFrowangml(dec, attr, obj);
      let fieldname = this.getFieldName(name);

      if (this.isReference(obj, fieldname, value, false)) {
        let tmp = dec.getObject(value);

        if (tmp == null) {
          wangLog.warn('wangObjectCodec.decode: No object for ' + this.getName() + '.' + name + '=' + value);
          return;
        }

        value = tmp;
      }

      if (!this.isExcluded(obj, name, value, false)) {
        obj[name] = value;
      }
    }
  }

  decodeChildren(dec, node, obj) {
    let child = node.firstChild;

    while (child != null) {
      let tmp = child.nextSibling;

      if (child.nodeType == wangConstants.NODETYPE_ELEMENT && !this.processInclude(dec, child, obj)) {
        this.decodeChild(dec, child, obj);
      }

      child = tmp;
    }
  }

  decodeChild(dec, child, obj) {
    let fieldname = this.getFieldName(child.getAttribute('as'));

    if (fieldname == null || !this.isExcluded(obj, fieldname, child, false)) {
      let template = this.getFieldTemplate(obj, fieldname, child);
      let value = null;

      if (child.nodeName == 'add') {
        value = child.getAttribute('value');

        if (value == null && wangObjectCodec.allowEval) {
          value = wangUtils.eval(wangUtils.getTextContent(child));
        }
      } else {
        value = dec.decode(child, template);
      }

      try {
        this.addObjectValue(obj, fieldname, value, template);
      } catch (e) {
        throw new Error(e.message + ' for ' + child.nodeName);
      }
    }
  }

  getFieldTemplate(obj, fieldname, child) {
    let template = obj[fieldname];

    if (template instanceof Array && template.length > 0) {
      template = null;
    }

    return template;
  }

  addObjectValue(obj, fieldname, value, template) {
    if (value != null && value != template) {
      if (fieldname != null && fieldname.length > 0) {
        obj[fieldname] = value;
      } else {
        obj.push(value);
      }
    }
  }

  processInclude(dec, node, into) {
    if (node.nodeName == 'include') {
      let name = node.getAttribute('name');

      if (name != null) {
        try {
          let xml = wangUtils.load(name).getDocumentElement();

          if (xml != null) {
            dec.decode(xml, into);
          }
        } catch (e) {
          /* ignore */
        }
      }

      return true;
    }

    return false;
  }

  beforeDecode(dec, node, obj) {
    return node;
  }

  afterDecode(dec, node, obj) {
    return obj;
  }
}
