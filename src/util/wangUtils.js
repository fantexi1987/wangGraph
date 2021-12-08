import { wangDragSource } from '@wangGraph/util/wangDragSource';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangWindow } from '@wangGraph/util/wangWindow';
import { wangCodec } from '@wangGraph/io/wangCodec';
import { wangTemporaryCellStates } from '@wangGraph/view/wangTemporaryCellStates';
import { wangCellPath } from '@wangGraph/model/wangCellPath';
import { wangEffects } from '@wangGraph/util/wangEffects';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';
import { wangXmlRequest } from '@wangGraph/util/wangXmlRequest';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangClient } from '@wangGraph/wangClient';

export class wangUtils {
  static errorResource = wangClient.language != 'none' ? 'error' : '';
  static closeResource = wangClient.language != 'none' ? 'close' : '';
  static errorImage = wangClient.imageBasePath + '/error.gif';

  static removeCursors(element) {
    if (element.style != null) {
      element.style.cursor = '';
    }

    let children = element.childNodes;

    if (children != null) {
      let childCount = children.length;

      for (let i = 0; i < childCount; i += 1) {
        wangUtils.removeCursors(children[i]);
      }
    }
  }

  static getCurrentStyle(element) {
    return element != null ? window.getComputedStyle(element, '') : null;
  }

  static parseCssNumber(value) {
    if (value == 'thin') {
      value = '2';
    } else if (value == 'medium') {
      value = '4';
    } else if (value == 'thick') {
      value = '6';
    }

    value = parseFloat(value);

    if (isNaN(value)) {
      value = 0;
    }

    return value;
  }

  static setPrefixedStyle = (function () {
    let prefix = null;

    if (wangClient.IS_OT) {
      prefix = 'O';
    } else if (wangClient.IS_SF || wangClient.IS_GC) {
      prefix = 'Webkit';
    } else if (wangClient.IS_MT) {
      prefix = 'Moz';
    }

    return function (style, name, value) {
      style[name] = value;

      if (prefix != null && name.length > 0) {
        name = prefix + name.substring(0, 1).toUpperCase() + name.substring(1);
        style[name] = value;
      }
    };
  })();

  static hasScrollbars(node) {
    let style = wangUtils.getCurrentStyle(node);
    return style != null && (style.overflow == 'scroll' || style.overflow == 'auto');
  }

  static bind(scope, funct) {
    return function () {
      return funct.apply(scope, arguments);
    };
  }

  static eval(expr) {
    let result = null;

    if (expr.indexOf('function') >= 0) {
      try {
        eval('let _wangJavaScriptExpression=' + expr);
        // eslint-disable-next-line no-undef
        result = _wangJavaScriptExpression;
        // eslint-disable-next-line no-undef
        _wangJavaScriptExpression = null;
      } catch (e) {
        wangLog.warn(e.message + ' while evaluating ' + expr);
      }
    } else {
      try {
        result = eval(expr);
      } catch (e) {
        wangLog.warn(e.message + ' while evaluating ' + expr);
      }
    }

    return result;
  }

  static findNode(node, attr, value) {
    if (node.nodeType == wangConstants.NODETYPE_ELEMENT) {
      let tmp = node.getAttribute(attr);

      if (tmp != null && tmp == value) {
        return node;
      }
    }

    node = node.firstChild;

    while (node != null) {
      let result = wangUtils.findNode(node, attr, value);

      if (result != null) {
        return result;
      }

      node = node.nextSibling;
    }

    return null;
  }

  static getFunctionName(f) {
    let str = null;

    if (f != null) {
      if (f.name != null) {
        str = f.name;
      } else {
        str = wangUtils.trim(f.toString());

        if (/^function\s/.test(str)) {
          str = wangUtils.ltrim(str.substring(9));
          let idx2 = str.indexOf('(');

          if (idx2 > 0) {
            str = str.substring(0, idx2);
          }
        }
      }
    }

    return str;
  }

  static indexOf(array, obj) {
    if (array != null && obj != null) {
      for (let i = 0; i < array.length; i++) {
        if (array[i] == obj) {
          return i;
        }
      }
    }

    return -1;
  }

  static forEach(array, fn) {
    if (array != null && fn != null) {
      for (let i = 0; i < array.length; i++) {
        fn(array[i]);
      }
    }

    return array;
  }

  static remove(obj, array) {
    let result = null;

    if (typeof array == 'object') {
      let index = wangUtils.indexOf(array, obj);

      while (index >= 0) {
        array.splice(index, 1);
        result = obj;
        index = wangUtils.indexOf(array, obj);
      }
    }

    for (let key in array) {
      if (array[key] == obj) {
        delete array[key];
        result = obj;
      }
    }

    return result;
  }

  static isNode(value, nodeName, attributeName, attributeValue) {
    if (
      value != null &&
      !isNaN(value.nodeType) &&
      (nodeName == null || value.nodeName.toLowerCase() == nodeName.toLowerCase())
    ) {
      return attributeName == null || value.getAttribute(attributeName) == attributeValue;
    }

    return false;
  }

  static isAncestorNode(ancestor, child) {
    let parent = child;

    while (parent != null) {
      if (parent == ancestor) {
        return true;
      }

      parent = parent.parentNode;
    }

    return false;
  }

  static getChildNodes(node, nodeType) {
    nodeType = nodeType || wangConstants.NODETYPE_ELEMENT;
    let children = [];
    let tmp = node.firstChild;

    while (tmp != null) {
      if (tmp.nodeType == nodeType) {
        children.push(tmp);
      }

      tmp = tmp.nextSibling;
    }

    return children;
  }

  static importNode(doc, node, allChildren) {
    return doc.importNode(node, allChildren);
  }

  static importNodeImplementation(doc, node, allChildren) {
    switch (node.nodeType) {
      case 1: {
        let newNode = doc.createElement(node.nodeName);

        if (node.attributes && node.attributes.length > 0) {
          for (let i = 0; i < node.attributes.length; i++) {
            newNode.setAttribute(node.attributes[i].nodeName, node.getAttribute(node.attributes[i].nodeName));
          }
        }

        if (allChildren && node.childNodes && node.childNodes.length > 0) {
          for (let i = 0; i < node.childNodes.length; i++) {
            newNode.appendChild(wangUtils.importNodeImplementation(doc, node.childNodes[i], allChildren));
          }
        }

        return newNode;
      }

      case 3:
      case 4:
      case 8: {
        return doc.createTextNode(node.nodeValue != null ? node.nodeValue : node.value);
      }
    }
  }

  static createXmlDocument() {
    let doc = null;

    if (document.implementation && document.implementation.createDocument) {
      doc = document.implementation.createDocument('', '', null);
    } else if ('ActiveXObject' in window) {
      doc = wangUtils.createMsXmlDocument();
    }

    return doc;
  }

  static createMsXmlDocument() {
    // eslint-disable-next-line no-undef
    let doc = new ActiveXObject('Microsoft.XMLDOM');
    doc.async = false;
    doc.validateOnParse = false;
    doc.resolveExternals = false;
    return doc;
  }

  static parseXml(xml) {
    let parser = new DOMParser();
    return parser.parseFromString(xml, 'text/xml');
  }

  static clearSelection = (function () {
    if (document.selection) {
      return function () {
        document.selection.empty();
      };
    } else if (window.getSelection) {
      return function () {
        if (window.getSelection().empty) {
          window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {
          window.getSelection().removeAllRanges();
        }
      };
    } else {
      return function () {};
    }
  })();

  static removeWhitespace(node, before) {
    let tmp = before ? node.previousSibling : node.nextSibling;

    while (tmp != null && tmp.nodeType == wangConstants.NODETYPE_TEXT) {
      let next = before ? tmp.previousSibling : tmp.nextSibling;
      let text = wangUtils.getTextContent(tmp);

      if (wangUtils.trim(text).length == 0) {
        tmp.parentNode.removeChild(tmp);
      }

      tmp = next;
    }
  }

  static htmlEntities(s, newline) {
    s = String(s || '');
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/"/g, '&quot;');
    s = s.replace(/\'/g, '&#39;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');

    if (newline == null || newline) {
      s = s.replace(/\n/g, '&#xa;');
    }

    return s;
  }

  static isVml(node) {
    return node != null && node.tagUrn == 'urn:schemas-microsoft-com:vml';
  }

  static getXml(node, linefeed) {
    let xml = '';

    if (wangClient.IS_IE11) {
      xml = wangUtils.getPrettyXml(node, '', '', '');
    } else if (window.XMLSerializer != null) {
      let xmlSerializer = new XMLSerializer();
      xml = xmlSerializer.serializeToString(node);
    } else if (node.xml != null) {
      xml = node.xml
        .replace(/\r\n\t[\t]*/g, '')
        .replace(/>\r\n/g, '>')
        .replace(/\r\n/g, '\n');
    }

    linefeed = linefeed || '&#xa;';
    xml = xml.replace(/\n/g, linefeed);
    return xml;
  }

  static getPrettyXml(node, tab, indent, newline, ns) {
    let result = [];

    if (node != null) {
      tab = tab != null ? tab : '  ';
      indent = indent != null ? indent : '';
      newline = newline != null ? newline : '\n';

      if (node.namespaceURI != null && node.namespaceURI != ns) {
        ns = node.namespaceURI;

        if (node.getAttribute('xmlns') == null) {
          node.setAttribute('xmlns', node.namespaceURI);
        }
      }

      if (node.nodeType == wangConstants.NODETYPE_DOCUMENT) {
        result.push(wangUtils.getPrettyXml(node.documentElement, tab, indent, newline, ns));
      } else if (node.nodeType == wangConstants.NODETYPE_DOCUMENT_FRAGMENT) {
        let tmp = node.firstChild;

        if (tmp != null) {
          while (tmp != null) {
            result.push(wangUtils.getPrettyXml(tmp, tab, indent, newline, ns));
            tmp = tmp.nextSibling;
          }
        }
      } else if (node.nodeType == wangConstants.NODETYPE_COMMENT) {
        let value = wangUtils.getTextContent(node);

        if (value.length > 0) {
          result.push(indent + '<!--' + value + '-->' + newline);
        }
      } else if (node.nodeType == wangConstants.NODETYPE_TEXT) {
        let value = wangUtils.getTextContent(node);

        if (value.length > 0) {
          result.push(indent + wangUtils.htmlEntities(wangUtils.trim(value), false) + newline);
        }
      } else if (node.nodeType == wangConstants.NODETYPE_CDATA) {
        let value = wangUtils.getTextContent(node);

        if (value.length > 0) {
          result.push(indent + '<![CDATA[' + value + ']]' + newline);
        }
      } else {
        result.push(indent + '<' + node.nodeName);
        let attrs = node.attributes;

        if (attrs != null) {
          for (let i = 0; i < attrs.length; i++) {
            let val = wangUtils.htmlEntities(attrs[i].value);
            result.push(' ' + attrs[i].nodeName + '="' + val + '"');
          }
        }

        let tmp = node.firstChild;

        if (tmp != null) {
          result.push('>' + newline);

          while (tmp != null) {
            result.push(wangUtils.getPrettyXml(tmp, tab, indent + tab, newline, ns));
            tmp = tmp.nextSibling;
          }

          result.push(indent + '</' + node.nodeName + '>' + newline);
        } else {
          result.push(' />' + newline);
        }
      }
    }

    return result.join('');
  }

  static extractTextWithWhitespace(elems) {
    let blocks = ['BLOCKQUOTE', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'OL', 'P', 'PRE', 'TABLE', 'UL'];
    let ret = [];

    function doExtract(elts) {
      if (elts.length == 1 && (elts[0].nodeName == 'BR' || elts[0].innerHTML == '\n')) {
        return;
      }

      for (let i = 0; i < elts.length; i++) {
        let elem = elts[i];

        if (
          elem.nodeName == 'BR' ||
          elem.innerHTML == '\n' ||
          ((elts.length == 1 || i == 0) && elem.nodeName == 'DIV' && elem.innerHTML.toLowerCase() == '<br>')
        ) {
          ret.push('\n');
        } else {
          if (elem.nodeType === 3 || elem.nodeType === 4) {
            if (elem.nodeValue.length > 0) {
              ret.push(elem.nodeValue);
            }
          } else if (elem.nodeType !== 8 && elem.childNodes.length > 0) {
            doExtract(elem.childNodes);
          }

          if (i < elts.length - 1 && wangUtils.indexOf(blocks, elts[i + 1].nodeName) >= 0) {
            ret.push('\n');
          }
        }
      }
    }

    doExtract(elems);
    return ret.join('');
  }

  static replaceTrailingNewlines(str, pattern) {
    let postfix = '';

    while (str.length > 0 && str.charAt(str.length - 1) == '\n') {
      str = str.substring(0, str.length - 1);
      postfix += pattern;
    }

    return str + postfix;
  }

  static getTextContent(node) {
    return node != null ? node[node.textContent === undefined ? 'text' : 'textContent'] : '';
  }

  static setTextContent(node, text) {
    if (node.innerText !== undefined) {
      node.innerText = text;
    } else {
      node[node.textContent === undefined ? 'text' : 'textContent'] = text;
    }
  }

  static getInnerHtml(node) {
    if (node != null) {
      let serializer = new XMLSerializer();
      return serializer.serializeToString(node);
    }

    return '';
  }

  static getOuterHtml(node) {
    if (node != null) {
      let serializer = new XMLSerializer();
      return serializer.serializeToString(node);
    }

    return '';
  }

  static write(parent, text) {
    let doc = parent.ownerDocument;
    let node = doc.createTextNode(text);

    if (parent != null) {
      parent.appendChild(node);
    }

    return node;
  }

  static writeln(parent, text) {
    let doc = parent.ownerDocument;
    let node = doc.createTextNode(text);

    if (parent != null) {
      parent.appendChild(node);
      parent.appendChild(document.createElement('br'));
    }

    return node;
  }

  static br(parent, count) {
    count = count || 1;
    let br = null;

    for (let i = 0; i < count; i++) {
      if (parent != null) {
        br = parent.ownerDocument.createElement('br');
        parent.appendChild(br);
      }
    }

    return br;
  }

  static button(label, funct, doc) {
    doc = doc != null ? doc : document;
    let button = doc.createElement('button');
    wangUtils.write(button, label);
    wangEvent.addListener(button, 'click', function (evt) {
      funct(evt);
    });
    return button;
  }

  static para(parent, text) {
    let p = document.createElement('p');
    wangUtils.write(p, text);

    if (parent != null) {
      parent.appendChild(p);
    }

    return p;
  }

  static addTransparentBackgroundFilter(node) {
    node.style.filter +=
      "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" +
      wangClient.imageBasePath +
      "/transparent.gif', sizingMethod='scale')";
  }

  static linkAction(parent, text, editor, action, pad) {
    return wangUtils.link(
      parent,
      text,
      function () {
        editor.execute(action);
      },
      pad
    );
  }

  static linkInvoke(parent, text, editor, functName, arg, pad) {
    return wangUtils.link(
      parent,
      text,
      function () {
        editor[functName](arg);
      },
      pad
    );
  }

  static link(parent, text, funct, pad) {
    let a = document.createElement('span');
    a.style.color = 'blue';
    a.style.textDecoration = 'underline';
    a.style.cursor = 'pointer';

    if (pad != null) {
      a.style.paddingLeft = pad + 'px';
    }

    wangEvent.addListener(a, 'click', funct);
    wangUtils.write(a, text);

    if (parent != null) {
      parent.appendChild(a);
    }

    return a;
  }

  static getDocumentSize() {
    let b = document.body;
    let d = document.documentElement;

    try {
      return new wangRectangle(0, 0, b.clientWidth || d.clientWidth, Math.max(b.clientHeight || 0, d.clientHeight));
    } catch (e) {
      return new wangRectangle();
    }
  }

  static fit(node) {
    let ds = wangUtils.getDocumentSize();
    let left = parseInt(node.offsetLeft);
    let width = parseInt(node.offsetWidth);
    let offset = wangUtils.getDocumentScrollOrigin(node.ownerDocument);
    let sl = offset.x;
    let st = offset.y;
    let b = document.body;
    let d = document.documentElement;
    let right = sl + ds.width;

    if (left + width > right) {
      node.style.left = Math.max(sl, right - width) + 'px';
    }

    let top = parseInt(node.offsetTop);
    let height = parseInt(node.offsetHeight);
    let bottom = st + ds.height;

    if (top + height > bottom) {
      node.style.top = Math.max(st, bottom - height) + 'px';
    }
  }

  static load(url) {
    let req = new wangXmlRequest(url, null, 'GET', false);
    req.send();
    return req;
  }

  static get(url, onload, onerror, binary, timeout, ontimeout, headers) {
    let req = new wangXmlRequest(url, null, 'GET');
    let setRequestHeaders = req.setRequestHeaders;

    if (headers) {
      req.setRequestHeaders = function (request, params) {
        setRequestHeaders.apply(this, arguments);

        for (let key in headers) {
          request.setRequestHeader(key, headers[key]);
        }
      };
    }

    if (binary != null) {
      req.setBinary(binary);
    }

    req.send(onload, onerror, timeout, ontimeout);
    return req;
  }

  static getAll(urls, onload, onerror) {
    let remain = urls.length;
    let result = [];
    let errors = 0;

    let err = function () {
      if (errors == 0 && onerror != null) {
        onerror();
      }

      errors++;
    };

    for (let i = 0; i < urls.length; i++) {
      (function (url, index) {
        wangUtils.get(
          url,
          function (req) {
            let status = req.getStatus();

            if (status < 200 || status > 299) {
              err();
            } else {
              result[index] = req;
              remain--;

              if (remain == 0) {
                onload(result);
              }
            }
          },
          err
        );
      })(urls[i], i);
    }

    if (remain == 0) {
      onload(result);
    }
  }

  static post(url, params, onload, onerror) {
    return new wangXmlRequest(url, params).send(onload, onerror);
  }

  static submit(url, params, doc, target) {
    return new wangXmlRequest(url, params).simulate(doc, target);
  }

  static loadInto(url, doc, onload) {
    doc.addEventListener('load', onload, false);
    doc.load(url);
  }

  static getValue(array, key, defaultValue) {
    let value = array != null ? array[key] : null;

    if (value == null) {
      value = defaultValue;
    }

    return value;
  }

  static getNumber(array, key, defaultValue) {
    let value = array != null ? array[key] : null;

    if (value == null) {
      value = defaultValue || 0;
    }

    return Number(value);
  }

  static getColor(array, key, defaultValue) {
    let value = array != null ? array[key] : null;

    if (value == null) {
      value = defaultValue;
    } else if (value == wangConstants.NONE) {
      value = null;
    }

    return value;
  }

  static clone(obj, transients, shallow) {
    shallow = shallow != null ? shallow : false;
    let clone = null;

    if (obj != null && typeof obj.constructor == 'function') {
      clone = new obj.constructor();

      for (let i in obj) {
        if (i != wangObjectIdentity.FIELD_NAME && (transients == null || wangUtils.indexOf(transients, i) < 0)) {
          if (!shallow && typeof obj[i] == 'object') {
            clone[i] = wangUtils.clone(obj[i]);
          } else {
            clone[i] = obj[i];
          }
        }
      }
    }

    return clone;
  }

  static equalPoints(a, b) {
    if ((a == null && b != null) || (a != null && b == null) || (a != null && b != null && a.length != b.length)) {
      return false;
    } else if (a != null && b != null) {
      for (let i = 0; i < a.length; i++) {
        if (
          (a[i] != null && b[i] == null) ||
          (a[i] == null && b[i] != null) ||
          (a[i] != null && b[i] != null && (a[i].x != b[i].x || a[i].y != b[i].y))
        ) {
          return false;
        }
      }
    }

    return true;
  }

  static equalEntries(a, b) {
    let count = 0;

    if ((a == null && b != null) || (a != null && b == null) || (a != null && b != null && a.length != b.length)) {
      return false;
    } else if (a != null && b != null) {
      for (let key in b) {
        count++;
      }

      for (let key in a) {
        count--;

        if ((!wangUtils.isNaN(a[key]) || !wangUtils.isNaN(b[key])) && a[key] != b[key]) {
          return false;
        }
      }
    }

    return count == 0;
  }

  static removeDuplicates(arr) {
    let dict = new wangDictionary();
    let result = [];

    for (let i = 0; i < arr.length; i++) {
      if (!dict.get(arr[i])) {
        result.push(arr[i]);
        dict.put(arr[i], true);
      }
    }

    return result;
  }

  static isNaN(value) {
    return typeof value == 'number' && isNaN(value);
  }

  static extend(ctor, superCtor) {
    let f = function () {};

    f.prototype = superCtor.prototype;
    ctor.prototype = new f();
    ctor.prototype.constructor = ctor;
  }

  static toString(obj) {
    let output = '';

    for (let i in obj) {
      try {
        if (obj[i] == null) {
          output += i + ' = [null]\n';
        } else if (typeof obj[i] == 'function') {
          output += i + ' => [Function]\n';
        } else if (typeof obj[i] == 'object') {
          let ctor = wangUtils.getFunctionName(obj[i].constructor);
          output += i + ' => [' + ctor + ']\n';
        } else {
          output += i + ' = ' + obj[i] + '\n';
        }
      } catch (e) {
        output += i + '=' + e.message;
      }
    }

    return output;
  }

  static toRadians(deg) {
    return (Math.PI * deg) / 180;
  }

  static toDegree(rad) {
    return (rad * 180) / Math.PI;
  }

  static arcToCurves(x0, y0, r1, r2, angle, largeArcFlag, sweepFlag, x, y) {
    x -= x0;
    y -= y0;

    if (r1 === 0 || r2 === 0) {
      return result;
    }

    let fS = sweepFlag;
    let psai = angle;
    r1 = Math.abs(r1);
    r2 = Math.abs(r2);
    let ctx = -x / 2;
    let cty = -y / 2;
    let cpsi = Math.cos((psai * Math.PI) / 180);
    let spsi = Math.sin((psai * Math.PI) / 180);
    let rxd = cpsi * ctx + spsi * cty;
    let ryd = -1 * spsi * ctx + cpsi * cty;
    let rxdd = rxd * rxd;
    let rydd = ryd * ryd;
    let r1x = r1 * r1;
    let r2y = r2 * r2;
    let lamda = rxdd / r1x + rydd / r2y;
    let sds;

    if (lamda > 1) {
      r1 = Math.sqrt(lamda) * r1;
      r2 = Math.sqrt(lamda) * r2;
      sds = 0;
    } else {
      let seif = 1;

      if (largeArcFlag === fS) {
        seif = -1;
      }

      sds = seif * Math.sqrt((r1x * r2y - r1x * rydd - r2y * rxdd) / (r1x * rydd + r2y * rxdd));
    }

    let txd = (sds * r1 * ryd) / r2;
    let tyd = (-1 * sds * r2 * rxd) / r1;
    let tx = cpsi * txd - spsi * tyd + x / 2;
    let ty = spsi * txd + cpsi * tyd + y / 2;
    let rad = Math.atan2((ryd - tyd) / r2, (rxd - txd) / r1) - Math.atan2(0, 1);
    let s1 = rad >= 0 ? rad : 2 * Math.PI + rad;
    rad = Math.atan2((-ryd - tyd) / r2, (-rxd - txd) / r1) - Math.atan2((ryd - tyd) / r2, (rxd - txd) / r1);
    let dr = rad >= 0 ? rad : 2 * Math.PI + rad;

    if (fS == 0 && dr > 0) {
      dr -= 2 * Math.PI;
    } else if (fS != 0 && dr < 0) {
      dr += 2 * Math.PI;
    }

    let sse = (dr * 2) / Math.PI;
    let seg = Math.ceil(sse < 0 ? -1 * sse : sse);
    let segr = dr / seg;
    let t = ((8 / 3) * Math.sin(segr / 4) * Math.sin(segr / 4)) / Math.sin(segr / 2);
    let cpsir1 = cpsi * r1;
    let cpsir2 = cpsi * r2;
    let spsir1 = spsi * r1;
    let spsir2 = spsi * r2;
    let mc = Math.cos(s1);
    let ms = Math.sin(s1);
    let x2 = -t * (cpsir1 * ms + spsir2 * mc);
    let y2 = -t * (spsir1 * ms - cpsir2 * mc);
    let x3 = 0;
    let y3 = 0;
    let result = [];

    for (let n = 0; n < seg; ++n) {
      s1 += segr;
      mc = Math.cos(s1);
      ms = Math.sin(s1);
      x3 = cpsir1 * mc - spsir2 * ms + tx;
      y3 = spsir1 * mc + cpsir2 * ms + ty;
      let dx = -t * (cpsir1 * ms + spsir2 * mc);
      let dy = -t * (spsir1 * ms - cpsir2 * mc);
      let index = n * 6;
      result[index] = Number(x2 + x0);
      result[index + 1] = Number(y2 + y0);
      result[index + 2] = Number(x3 - dx + x0);
      result[index + 3] = Number(y3 - dy + y0);
      result[index + 4] = Number(x3 + x0);
      result[index + 5] = Number(y3 + y0);
      x2 = x3 + dx;
      y2 = y3 + dy;
    }

    return result;
  }

  static getBoundingBox(rect, rotation, cx) {
    let result = null;

    if (rect != null && rotation != null && rotation != 0) {
      let rad = wangUtils.toRadians(rotation);
      let cos = Math.cos(rad);
      let sin = Math.sin(rad);
      cx = cx != null ? cx : new wangPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      let p1 = new wangPoint(rect.x, rect.y);
      let p2 = new wangPoint(rect.x + rect.width, rect.y);
      let p3 = new wangPoint(p2.x, rect.y + rect.height);
      let p4 = new wangPoint(rect.x, p3.y);
      p1 = wangUtils.getRotatedPoint(p1, cos, sin, cx);
      p2 = wangUtils.getRotatedPoint(p2, cos, sin, cx);
      p3 = wangUtils.getRotatedPoint(p3, cos, sin, cx);
      p4 = wangUtils.getRotatedPoint(p4, cos, sin, cx);
      result = new wangRectangle(p1.x, p1.y, 0, 0);
      result.add(new wangRectangle(p2.x, p2.y, 0, 0));
      result.add(new wangRectangle(p3.x, p3.y, 0, 0));
      result.add(new wangRectangle(p4.x, p4.y, 0, 0));
    }

    return result;
  }

  static getRotatedPoint(pt, cos, sin, c) {
    c = c != null ? c : new wangPoint();
    let x = pt.x - c.x;
    let y = pt.y - c.y;
    let x1 = x * cos - y * sin;
    let y1 = y * cos + x * sin;
    return new wangPoint(x1 + c.x, y1 + c.y);
  }

  static getPortConstraints(terminal, edge, source, defaultValue) {
    let value = wangUtils.getValue(
      terminal.style,
      wangConstants.STYLE_PORT_CONSTRAINT,
      wangUtils.getValue(
        edge.style,
        source ? wangConstants.STYLE_SOURCE_PORT_CONSTRAINT : wangConstants.STYLE_TARGET_PORT_CONSTRAINT,
        null
      )
    );

    if (value == null) {
      return defaultValue;
    } else {
      let directions = value.toString();
      let returnValue = wangConstants.DIRECTION_MASK_NONE;
      let constraintRotationEnabled = wangUtils.getValue(
        terminal.style,
        wangConstants.STYLE_PORT_CONSTRAINT_ROTATION,
        0
      );
      let rotation = 0;

      if (constraintRotationEnabled == 1) {
        rotation = wangUtils.getValue(terminal.style, wangConstants.STYLE_ROTATION, 0);
      }

      let quad = 0;

      if (rotation > 45) {
        quad = 1;

        if (rotation >= 135) {
          quad = 2;
        }
      } else if (rotation < -45) {
        quad = 3;

        if (rotation <= -135) {
          quad = 2;
        }
      }

      if (directions.indexOf(wangConstants.DIRECTION_NORTH) >= 0) {
        switch (quad) {
          case 0:
            returnValue |= wangConstants.DIRECTION_MASK_NORTH;
            break;

          case 1:
            returnValue |= wangConstants.DIRECTION_MASK_EAST;
            break;

          case 2:
            returnValue |= wangConstants.DIRECTION_MASK_SOUTH;
            break;

          case 3:
            returnValue |= wangConstants.DIRECTION_MASK_WEST;
            break;
        }
      }

      if (directions.indexOf(wangConstants.DIRECTION_WEST) >= 0) {
        switch (quad) {
          case 0:
            returnValue |= wangConstants.DIRECTION_MASK_WEST;
            break;

          case 1:
            returnValue |= wangConstants.DIRECTION_MASK_NORTH;
            break;

          case 2:
            returnValue |= wangConstants.DIRECTION_MASK_EAST;
            break;

          case 3:
            returnValue |= wangConstants.DIRECTION_MASK_SOUTH;
            break;
        }
      }

      if (directions.indexOf(wangConstants.DIRECTION_SOUTH) >= 0) {
        switch (quad) {
          case 0:
            returnValue |= wangConstants.DIRECTION_MASK_SOUTH;
            break;

          case 1:
            returnValue |= wangConstants.DIRECTION_MASK_WEST;
            break;

          case 2:
            returnValue |= wangConstants.DIRECTION_MASK_NORTH;
            break;

          case 3:
            returnValue |= wangConstants.DIRECTION_MASK_EAST;
            break;
        }
      }

      if (directions.indexOf(wangConstants.DIRECTION_EAST) >= 0) {
        switch (quad) {
          case 0:
            returnValue |= wangConstants.DIRECTION_MASK_EAST;
            break;

          case 1:
            returnValue |= wangConstants.DIRECTION_MASK_SOUTH;
            break;

          case 2:
            returnValue |= wangConstants.DIRECTION_MASK_WEST;
            break;

          case 3:
            returnValue |= wangConstants.DIRECTION_MASK_NORTH;
            break;
        }
      }

      return returnValue;
    }
  }

  static reversePortConstraints(constraint) {
    let result = 0;
    result = (constraint & wangConstants.DIRECTION_MASK_WEST) << 3;
    result |= (constraint & wangConstants.DIRECTION_MASK_NORTH) << 1;
    result |= (constraint & wangConstants.DIRECTION_MASK_SOUTH) >> 1;
    result |= (constraint & wangConstants.DIRECTION_MASK_EAST) >> 3;
    return result;
  }

  static findNearestSegment(state, x, y) {
    let index = -1;

    if (state.absolutePoints.length > 0) {
      let last = state.absolutePoints[0];
      let min = null;

      for (let i = 1; i < state.absolutePoints.length; i++) {
        let current = state.absolutePoints[i];
        let dist = wangUtils.ptSegDistSq(last.x, last.y, current.x, current.y, x, y);

        if (min == null || dist < min) {
          min = dist;
          index = i - 1;
        }

        last = current;
      }
    }

    return index;
  }

  static getDirectedBounds(rect, m, style, flipH, flipV) {
    let d = wangUtils.getValue(style, wangConstants.STYLE_DIRECTION, wangConstants.DIRECTION_EAST);
    flipH = flipH != null ? flipH : wangUtils.getValue(style, wangConstants.STYLE_FLIPH, false);
    flipV = flipV != null ? flipV : wangUtils.getValue(style, wangConstants.STYLE_FLIPV, false);
    m.x = Math.round(Math.max(0, Math.min(rect.width, m.x)));
    m.y = Math.round(Math.max(0, Math.min(rect.height, m.y)));
    m.width = Math.round(Math.max(0, Math.min(rect.width, m.width)));
    m.height = Math.round(Math.max(0, Math.min(rect.height, m.height)));

    if (
      (flipV && (d == wangConstants.DIRECTION_SOUTH || d == wangConstants.DIRECTION_NORTH)) ||
      (flipH && (d == wangConstants.DIRECTION_EAST || d == wangConstants.DIRECTION_WEST))
    ) {
      let tmp = m.x;
      m.x = m.width;
      m.width = tmp;
    }

    if (
      (flipH && (d == wangConstants.DIRECTION_SOUTH || d == wangConstants.DIRECTION_NORTH)) ||
      (flipV && (d == wangConstants.DIRECTION_EAST || d == wangConstants.DIRECTION_WEST))
    ) {
      let tmp = m.y;
      m.y = m.height;
      m.height = tmp;
    }

    let m2 = wangRectangle.fromRectangle(m);

    if (d == wangConstants.DIRECTION_SOUTH) {
      m2.y = m.x;
      m2.x = m.height;
      m2.width = m.y;
      m2.height = m.width;
    } else if (d == wangConstants.DIRECTION_WEST) {
      m2.y = m.height;
      m2.x = m.width;
      m2.width = m.x;
      m2.height = m.y;
    } else if (d == wangConstants.DIRECTION_NORTH) {
      m2.y = m.width;
      m2.x = m.y;
      m2.width = m.height;
      m2.height = m.x;
    }

    return new wangRectangle(
      rect.x + m2.x,
      rect.y + m2.y,
      rect.width - m2.width - m2.x,
      rect.height - m2.height - m2.y
    );
  }

  static getPerimeterPoint(pts, center, point) {
    let min = null;

    for (let i = 0; i < pts.length - 1; i++) {
      let pt = wangUtils.intersection(
        pts[i].x,
        pts[i].y,
        pts[i + 1].x,
        pts[i + 1].y,
        center.x,
        center.y,
        point.x,
        point.y
      );

      if (pt != null) {
        let dx = point.x - pt.x;
        let dy = point.y - pt.y;
        let ip = {
          p: pt,
          distSq: dy * dy + dx * dx
        };

        if (ip != null && (min == null || min.distSq > ip.distSq)) {
          min = ip;
        }
      }
    }

    return min != null ? min.p : null;
  }

  static rectangleIntersectsSegment(bounds, p1, p2) {
    let top = bounds.y;
    let left = bounds.x;
    let bottom = top + bounds.height;
    let right = left + bounds.width;
    let minX = p1.x;
    let maxX = p2.x;

    if (p1.x > p2.x) {
      minX = p2.x;
      maxX = p1.x;
    }

    if (maxX > right) {
      maxX = right;
    }

    if (minX < left) {
      minX = left;
    }

    if (minX > maxX) {
      return false;
    }

    let minY = p1.y;
    let maxY = p2.y;
    let dx = p2.x - p1.x;

    if (Math.abs(dx) > 0.0000001) {
      let a = (p2.y - p1.y) / dx;
      let b = p1.y - a * p1.x;
      minY = a * minX + b;
      maxY = a * maxX + b;
    }

    if (minY > maxY) {
      let tmp = maxY;
      maxY = minY;
      minY = tmp;
    }

    if (maxY > bottom) {
      maxY = bottom;
    }

    if (minY < top) {
      minY = top;
    }

    if (minY > maxY) {
      return false;
    }

    return true;
  }

  static contains(bounds, x, y) {
    return bounds.x <= x && bounds.x + bounds.width >= x && bounds.y <= y && bounds.y + bounds.height >= y;
  }

  static intersects(a, b) {
    let tw = a.width;
    let th = a.height;
    let rw = b.width;
    let rh = b.height;

    if (rw <= 0 || rh <= 0 || tw <= 0 || th <= 0) {
      return false;
    }

    let tx = a.x;
    let ty = a.y;
    let rx = b.x;
    let ry = b.y;
    rw += rx;
    rh += ry;
    tw += tx;
    th += ty;
    return (rw < rx || rw > tx) && (rh < ry || rh > ty) && (tw < tx || tw > rx) && (th < ty || th > ry);
  }

  static intersectsHotspot(state, x, y, hotspot, min, max) {
    hotspot = hotspot != null ? hotspot : 1;
    min = min != null ? min : 0;
    max = max != null ? max : 0;

    if (hotspot > 0) {
      let cx = state.getCenterX();
      let cy = state.getCenterY();
      let w = state.width;
      let h = state.height;
      let start = wangUtils.getValue(state.style, wangConstants.STYLE_STARTSIZE) * state.view.scale;

      if (start > 0) {
        if (wangUtils.getValue(state.style, wangConstants.STYLE_HORIZONTAL, true)) {
          cy = state.y + start / 2;
          h = start;
        } else {
          cx = state.x + start / 2;
          w = start;
        }
      }

      w = Math.max(min, w * hotspot);
      h = Math.max(min, h * hotspot);

      if (max > 0) {
        w = Math.min(w, max);
        h = Math.min(h, max);
      }

      let rect = new wangRectangle(cx - w / 2, cy - h / 2, w, h);
      let alpha = wangUtils.toRadians(wangUtils.getValue(state.style, wangConstants.STYLE_ROTATION) || 0);

      if (alpha != 0) {
        let cos = Math.cos(-alpha);
        let sin = Math.sin(-alpha);
        let cx = new wangPoint(state.getCenterX(), state.getCenterY());
        let pt = wangUtils.getRotatedPoint(new wangPoint(x, y), cos, sin, cx);
        x = pt.x;
        y = pt.y;
      }

      return wangUtils.contains(rect, x, y);
    }

    return true;
  }

  static getOffset(container, scrollOffset) {
    let offsetLeft = 0;
    let offsetTop = 0;
    let fixed = false;
    let node = container;
    let b = document.body;
    let d = document.documentElement;

    while (node != null && node != b && node != d && !fixed) {
      let style = wangUtils.getCurrentStyle(node);

      if (style != null) {
        fixed = fixed || style.position == 'fixed';
      }

      node = node.parentNode;
    }

    if (!scrollOffset && !fixed) {
      let offset = wangUtils.getDocumentScrollOrigin(container.ownerDocument);
      offsetLeft += offset.x;
      offsetTop += offset.y;
    }

    let r = container.getBoundingClientRect();

    if (r != null) {
      offsetLeft += r.left;
      offsetTop += r.top;
    }

    return new wangPoint(offsetLeft, offsetTop);
  }

  static getDocumentScrollOrigin(doc) {
    if (wangClient.IS_QUIRKS) {
      return new wangPoint(doc.body.scrollLeft, doc.body.scrollTop);
    } else {
      let wnd = doc.defaultView || doc.parentWindow;
      let x =
        wnd != null && window.pageXOffset !== undefined
          ? window.pageXOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
      let y =
        wnd != null && window.pageYOffset !== undefined
          ? window.pageYOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollTop;
      return new wangPoint(x, y);
    }
  }

  static getScrollOrigin(node, includeAncestors, includeDocument) {
    includeAncestors = includeAncestors != null ? includeAncestors : false;
    includeDocument = includeDocument != null ? includeDocument : true;
    let doc = node != null ? node.ownerDocument : document;
    let b = doc.body;
    let d = doc.documentElement;
    let result = new wangPoint();
    let fixed = false;

    while (node != null && node != b && node != d) {
      if (!isNaN(node.scrollLeft) && !isNaN(node.scrollTop)) {
        result.x += node.scrollLeft;
        result.y += node.scrollTop;
      }

      let style = wangUtils.getCurrentStyle(node);

      if (style != null) {
        fixed = fixed || style.position == 'fixed';
      }

      node = includeAncestors ? node.parentNode : null;
    }

    if (!fixed && includeDocument) {
      let origin = wangUtils.getDocumentScrollOrigin(doc);
      result.x += origin.x;
      result.y += origin.y;
    }

    return result;
  }

  static convertPoint(container, x, y) {
    let origin = wangUtils.getScrollOrigin(container, false);
    let offset = wangUtils.getOffset(container);
    offset.x -= origin.x;
    offset.y -= origin.y;
    return new wangPoint(x - offset.x, y - offset.y);
  }

  static ltrim(str, chars) {
    chars = chars || '\\s';
    return str != null ? str.replace(new RegExp('^[' + chars + ']+', 'g'), '') : null;
  }

  static rtrim(str, chars) {
    chars = chars || '\\s';
    return str != null ? str.replace(new RegExp('[' + chars + ']+$', 'g'), '') : null;
  }

  static trim(str, chars) {
    return wangUtils.ltrim(wangUtils.rtrim(str, chars), chars);
  }

  static isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n) && (typeof n != 'string' || n.toLowerCase().indexOf('0x') < 0);
  }

  static isInteger(n) {
    return String(parseInt(n)) === String(n);
  }

  static mod(n, m) {
    return ((n % m) + m) % m;
  }

  static intersection(x0, y0, x1, y1, x2, y2, x3, y3) {
    let denom = (y3 - y2) * (x1 - x0) - (x3 - x2) * (y1 - y0);
    let nume_a = (x3 - x2) * (y0 - y2) - (y3 - y2) * (x0 - x2);
    let nume_b = (x1 - x0) * (y0 - y2) - (y1 - y0) * (x0 - x2);
    let ua = nume_a / denom;
    let ub = nume_b / denom;

    if (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0) {
      let x = x0 + ua * (x1 - x0);
      let y = y0 + ua * (y1 - y0);
      return new wangPoint(x, y);
    }

    return null;
  }

  static ptSegDistSq(x1, y1, x2, y2, px, py) {
    x2 -= x1;
    y2 -= y1;
    px -= x1;
    py -= y1;
    let dotprod = px * x2 + py * y2;
    let projlenSq;

    if (dotprod <= 0.0) {
      projlenSq = 0.0;
    } else {
      px = x2 - px;
      py = y2 - py;
      dotprod = px * x2 + py * y2;

      if (dotprod <= 0.0) {
        projlenSq = 0.0;
      } else {
        projlenSq = (dotprod * dotprod) / (x2 * x2 + y2 * y2);
      }
    }

    let lenSq = px * px + py * py - projlenSq;

    if (lenSq < 0) {
      lenSq = 0;
    }

    return lenSq;
  }

  static ptLineDist(x1, y1, x2, y2, px, py) {
    return (
      Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) /
      Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1))
    );
  }

  static relativeCcw(x1, y1, x2, y2, px, py) {
    x2 -= x1;
    y2 -= y1;
    px -= x1;
    py -= y1;
    let ccw = px * y2 - py * x2;

    if (ccw == 0.0) {
      ccw = px * x2 + py * y2;

      if (ccw > 0.0) {
        px -= x2;
        py -= y2;
        ccw = px * x2 + py * y2;

        if (ccw < 0.0) {
          ccw = 0.0;
        }
      }
    }

    return ccw < 0.0 ? -1 : ccw > 0.0 ? 1 : 0;
  }

  static animateChanges(graph, changes) {
    wangEffects.animateChanges.apply(this, arguments);
  }

  static cascadeOpacity(graph, cell, opacity) {
    wangEffects.cascadeOpacity.apply(this, arguments);
  }

  static fadeOut(node, from, remove, step, delay, isEnabled) {
    wangEffects.fadeOut.apply(this, arguments);
  }

  static setOpacity(node, value) {
    if (wangUtils.isVml(node)) {
      if (value >= 100) {
        node.style.filter = '';
      } else {
        node.style.filter = 'alpha(opacity=' + value / 5 + ')';
      }
    } else {
      node.style.opacity = value / 100;
    }
  }

  static createImage(src) {
    let imageNode = null;
    imageNode = document.createElement('img');
    imageNode.setAttribute('src', src);
    imageNode.setAttribute('border', '0');
    return imageNode;
  }

  static sortCells(cells, ascending) {
    ascending = ascending != null ? ascending : true;
    let lookup = new wangDictionary();
    cells.sort(function (o1, o2) {
      let p1 = lookup.get(o1);

      if (p1 == null) {
        p1 = wangCellPath.create(o1).split(wangCellPath.PATH_SEPARATOR);
        lookup.put(o1, p1);
      }

      let p2 = lookup.get(o2);

      if (p2 == null) {
        p2 = wangCellPath.create(o2).split(wangCellPath.PATH_SEPARATOR);
        lookup.put(o2, p2);
      }

      let comp = wangCellPath.compare(p1, p2);
      return comp == 0 ? 0 : comp > 0 == ascending ? 1 : -1;
    });
    return cells;
  }

  static getStylename(style) {
    if (style != null) {
      let pairs = style.split(';');
      let stylename = pairs[0];

      if (stylename.indexOf('=') < 0) {
        return stylename;
      }
    }

    return '';
  }

  static getStylenames(style) {
    let result = [];

    if (style != null) {
      let pairs = style.split(';');

      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].indexOf('=') < 0) {
          result.push(pairs[i]);
        }
      }
    }

    return result;
  }

  static indexOfStylename(style, stylename) {
    if (style != null && stylename != null) {
      let tokens = style.split(';');
      let pos = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] == stylename) {
          return pos;
        }

        pos += tokens[i].length + 1;
      }
    }

    return -1;
  }

  static addStylename(style, stylename) {
    if (wangUtils.indexOfStylename(style, stylename) < 0) {
      if (style == null) {
        style = '';
      } else if (style.length > 0 && style.charAt(style.length - 1) != ';') {
        style += ';';
      }

      style += stylename;
    }

    return style;
  }

  static removeStylename(style, stylename) {
    let result = [];

    if (style != null) {
      let tokens = style.split(';');

      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] != stylename) {
          result.push(tokens[i]);
        }
      }
    }

    return result.join(';');
  }

  static removeAllStylenames(style) {
    let result = [];

    if (style != null) {
      let tokens = style.split(';');

      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].indexOf('=') >= 0) {
          result.push(tokens[i]);
        }
      }
    }

    return result.join(';');
  }

  static setCellStyles(model, cells, key, value) {
    if (cells != null && cells.length > 0) {
      model.beginUpdate();

      try {
        for (let i = 0; i < cells.length; i++) {
          if (cells[i] != null) {
            let style = wangUtils.setStyle(model.getStyle(cells[i]), key, value);
            model.setStyle(cells[i], style);
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }

  static setStyle(style, key, value) {
    let isValue = value != null && (typeof value.length == 'undefined' || value.length > 0);

    if (style == null || style.length == 0) {
      if (isValue) {
        style = key + '=' + value + ';';
      }
    } else {
      if (style.substring(0, key.length + 1) == key + '=') {
        let next = style.indexOf(';');

        if (isValue) {
          style = key + '=' + value + (next < 0 ? ';' : style.substring(next));
        } else {
          style = next < 0 || next == style.length - 1 ? '' : style.substring(next + 1);
        }
      } else {
        let index = style.indexOf(';' + key + '=');

        if (index < 0) {
          if (isValue) {
            let sep = style.charAt(style.length - 1) == ';' ? '' : ';';
            style = style + sep + key + '=' + value + ';';
          }
        } else {
          let next = style.indexOf(';', index + 1);

          if (isValue) {
            style = style.substring(0, index + 1) + key + '=' + value + (next < 0 ? ';' : style.substring(next));
          } else {
            style = style.substring(0, index) + (next < 0 ? ';' : style.substring(next));
          }
        }
      }
    }

    return style;
  }

  static setCellStyleFlags(model, cells, key, flag, value) {
    if (cells != null && cells.length > 0) {
      model.beginUpdate();

      try {
        for (let i = 0; i < cells.length; i++) {
          if (cells[i] != null) {
            let style = wangUtils.setStyleFlag(model.getStyle(cells[i]), key, flag, value);
            model.setStyle(cells[i], style);
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }

  static setStyleFlag(style, key, flag, value) {
    if (style == null || style.length == 0) {
      if (value || value == null) {
        style = key + '=' + flag;
      } else {
        style = key + '=0';
      }
    } else {
      let index = style.indexOf(key + '=');

      if (index < 0) {
        let sep = style.charAt(style.length - 1) == ';' ? '' : ';';

        if (value || value == null) {
          style = style + sep + key + '=' + flag;
        } else {
          style = style + sep + key + '=0';
        }
      } else {
        let cont = style.indexOf(';', index);
        let tmp = '';

        if (cont < 0) {
          tmp = style.substring(index + key.length + 1);
        } else {
          tmp = style.substring(index + key.length + 1, cont);
        }

        if (value == null) {
          tmp = parseInt(tmp) ^ flag;
        } else if (value) {
          tmp = parseInt(tmp) | flag;
        } else {
          tmp = parseInt(tmp) & ~flag;
        }

        style = style.substring(0, index) + key + '=' + tmp + (cont >= 0 ? style.substring(cont) : '');
      }
    }

    return style;
  }

  static getAlignmentAsPoint(align, valign) {
    let dx = -0.5;
    let dy = -0.5;

    if (align == wangConstants.ALIGN_LEFT) {
      dx = 0;
    } else if (align == wangConstants.ALIGN_RIGHT) {
      dx = -1;
    }

    if (valign == wangConstants.ALIGN_TOP) {
      dy = 0;
    } else if (valign == wangConstants.ALIGN_BOTTOM) {
      dy = -1;
    }

    return new wangPoint(dx, dy);
  }

  static getSizeForString(text, fontSize, fontFamily, textWidth, fontStyle) {
    fontSize = fontSize != null ? fontSize : wangConstants.DEFAULT_FONTSIZE;
    fontFamily = fontFamily != null ? fontFamily : wangConstants.DEFAULT_FONTFAMILY;
    let div = document.createElement('div');
    div.style.fontFamily = fontFamily;
    div.style.fontSize = Math.round(fontSize) + 'px';
    div.style.lineHeight = Math.round(fontSize * wangConstants.LINE_HEIGHT) + 'px';

    if (fontStyle != null) {
      if ((fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
        div.style.fontWeight = 'bold';
      }

      if ((fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
        div.style.fontStyle = 'italic';
      }

      let txtDecor = [];

      if ((fontStyle & wangConstants.FONT_UNDERLINE) == wangConstants.FONT_UNDERLINE) {
        txtDecor.push('underline');
      }

      if ((fontStyle & wangConstants.FONT_STRIKETHROUGH) == wangConstants.FONT_STRIKETHROUGH) {
        txtDecor.push('line-through');
      }

      if (txtDecor.length > 0) {
        div.style.textDecoration = txtDecor.join(' ');
      }
    }

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.display = wangClient.IS_QUIRKS ? 'inline' : 'inline-block';
    div.style.zoom = '1';

    if (textWidth != null) {
      div.style.width = textWidth + 'px';
      div.style.whiteSpace = 'normal';
    } else {
      div.style.whiteSpace = 'nowrap';
    }

    div.innerHTML = text;
    document.body.appendChild(div);
    let size = new wangRectangle(0, 0, div.offsetWidth, div.offsetHeight);
    document.body.removeChild(div);
    return size;
  }

  static getViewXml(graph, scale, cells, x0, y0) {
    x0 = x0 != null ? x0 : 0;
    y0 = y0 != null ? y0 : 0;
    scale = scale != null ? scale : 1;

    if (cells == null) {
      let model = graph.getModel();
      cells = [model.getRoot()];
    }

    let view = graph.getView();
    let result = null;
    let eventsEnabled = view.isEventsEnabled();
    view.setEventsEnabled(false);
    let drawPane = view.drawPane;
    let overlayPane = view.overlayPane;

    if (graph.dialect == wangConstants.DIALECT_SVG) {
      view.drawPane = document.createElementNS(wangConstants.NS_SVG, 'g');
      view.canvas.appendChild(view.drawPane);
      view.overlayPane = document.createElementNS(wangConstants.NS_SVG, 'g');
      view.canvas.appendChild(view.overlayPane);
    } else {
      view.drawPane = view.drawPane.cloneNode(false);
      view.canvas.appendChild(view.drawPane);
      view.overlayPane = view.overlayPane.cloneNode(false);
      view.canvas.appendChild(view.overlayPane);
    }

    let translate = view.getTranslate();
    view.translate = new wangPoint(x0, y0);
    let temp = new wangTemporaryCellStates(graph.getView(), scale, cells);

    try {
      let enc = new wangCodec();
      result = enc.encode(graph.getView());
    } finally {
      temp.destroy();
      view.translate = translate;
      view.canvas.removeChild(view.drawPane);
      view.canvas.removeChild(view.overlayPane);
      view.drawPane = drawPane;
      view.overlayPane = overlayPane;
      view.setEventsEnabled(eventsEnabled);
    }

    return result;
  }

  static getScaleForPageCount(pageCount, graph, pageFormat, border) {
    if (pageCount < 1) {
      return 1;
    }

    pageFormat = pageFormat != null ? pageFormat : wangConstants.PAGE_FORMAT_A4_PORTRAIT;
    border = border != null ? border : 0;
    let availablePageWidth = pageFormat.width - border * 2;
    let availablePageHeight = pageFormat.height - border * 2;
    let graphBounds = graph.getGraphBounds().clone();
    let sc = graph.getView().getScale();
    graphBounds.width /= sc;
    graphBounds.height /= sc;
    let graphWidth = graphBounds.width;
    let graphHeight = graphBounds.height;
    let scale = 1;
    let pageFormatAspectRatio = availablePageWidth / availablePageHeight;
    let graphAspectRatio = graphWidth / graphHeight;
    let pagesAspectRatio = graphAspectRatio / pageFormatAspectRatio;
    let pageRoot = Math.sqrt(pageCount);
    let pagesAspectRatioSqrt = Math.sqrt(pagesAspectRatio);
    let numRowPages = pageRoot * pagesAspectRatioSqrt;
    let numColumnPages = pageRoot / pagesAspectRatioSqrt;

    if (numRowPages < 1 && numColumnPages > pageCount) {
      let scaleChange = numColumnPages / pageCount;
      numColumnPages = pageCount;
      numRowPages /= scaleChange;
    }

    if (numColumnPages < 1 && numRowPages > pageCount) {
      let scaleChange = numRowPages / pageCount;
      numRowPages = pageCount;
      numColumnPages /= scaleChange;
    }

    let currentTotalPages = Math.ceil(numRowPages) * Math.ceil(numColumnPages);
    let numLoops = 0;

    while (currentTotalPages > pageCount) {
      let roundRowDownProportion = Math.floor(numRowPages) / numRowPages;
      let roundColumnDownProportion = Math.floor(numColumnPages) / numColumnPages;

      if (roundRowDownProportion == 1) {
        roundRowDownProportion = Math.floor(numRowPages - 1) / numRowPages;
      }

      if (roundColumnDownProportion == 1) {
        roundColumnDownProportion = Math.floor(numColumnPages - 1) / numColumnPages;
      }

      let scaleChange = 1;

      if (roundRowDownProportion > roundColumnDownProportion) {
        scaleChange = roundRowDownProportion;
      } else {
        scaleChange = roundColumnDownProportion;
      }

      numRowPages = numRowPages * scaleChange;
      numColumnPages = numColumnPages * scaleChange;
      currentTotalPages = Math.ceil(numRowPages) * Math.ceil(numColumnPages);
      numLoops++;

      if (numLoops > 10) {
        break;
      }
    }

    let posterWidth = availablePageWidth * numRowPages;
    scale = posterWidth / graphWidth;
    return scale * 0.99999;
  }

  static show(graph, doc, x0, y0, w, h) {
    x0 = x0 != null ? x0 : 0;
    y0 = y0 != null ? y0 : 0;

    if (doc == null) {
      let wnd = window.open();
      doc = wnd.document;
    } else {
      doc.open();
    }

    if (document.documentMode == 9) {
      doc.writeln('<!--[if IE]><meta http-equiv="X-UA-Compatible" content="IE=9"><![endif]-->');
    }

    let bounds = graph.getGraphBounds();
    let dx = Math.ceil(x0 - bounds.x);
    let dy = Math.ceil(y0 - bounds.y);

    if (w == null) {
      w = Math.ceil(bounds.width + x0) + Math.ceil(Math.ceil(bounds.x) - bounds.x);
    }

    if (h == null) {
      h = Math.ceil(bounds.height + y0) + Math.ceil(Math.ceil(bounds.y) - bounds.y);
    }

    if (document.documentMode == 11) {
      let html = '<html><head>';
      let base = document.getElementsByTagName('base');

      for (let i = 0; i < base.length; i++) {
        html += base[i].outerHTML;
      }

      html += '<style>';

      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          html += document.styleSheets[i].cssText;
        } catch (e) {
          /* ignore */
        }
      }

      html += '</style></head><body style="margin:0px;">';
      html +=
        '<div style="position:absolute;overflow:hidden;width:' +
        w +
        'px;height:' +
        h +
        'px;"><div style="position:relative;left:' +
        dx +
        'px;top:' +
        dy +
        'px;">';
      html += graph.container.innerHTML;
      html += '</div></div></body><html>';
      doc.writeln(html);
      doc.close();
    } else {
      doc.writeln('<html><head>');
      let base = document.getElementsByTagName('base');

      for (let i = 0; i < base.length; i++) {
        doc.writeln(wangUtils.getOuterHtml(base[i]));
      }

      let links = document.getElementsByTagName('link');

      for (let i = 0; i < links.length; i++) {
        doc.writeln(wangUtils.getOuterHtml(links[i]));
      }

      let styles = document.getElementsByTagName('style');

      for (let i = 0; i < styles.length; i++) {
        doc.writeln(wangUtils.getOuterHtml(styles[i]));
      }

      doc.writeln('</head><body style="margin:0px;"></body></html>');
      doc.close();
      let outer = doc.createElement('div');
      outer.position = 'absolute';
      outer.overflow = 'hidden';
      outer.style.width = w + 'px';
      outer.style.height = h + 'px';
      let div = doc.createElement('div');
      div.style.position = 'absolute';
      div.style.left = dx + 'px';
      div.style.top = dy + 'px';
      let node = graph.container.firstChild;
      let svg = null;

      while (node != null) {
        let clone = node.cloneNode(true);

        if (node == graph.view.drawPane.ownerSVGElement) {
          outer.appendChild(clone);
          svg = clone;
        } else {
          div.appendChild(clone);
        }

        node = node.nextSibling;
      }

      doc.body.appendChild(outer);

      if (div.firstChild != null) {
        doc.body.appendChild(div);
      }

      if (svg != null) {
        svg.style.minWidth = '';
        svg.style.minHeight = '';
        svg.firstChild.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');
      }
    }

    wangUtils.removeCursors(doc.body);
    return doc;
  }

  static printScreen(graph) {
    let wnd = window.open();
    let bounds = graph.getGraphBounds();
    wangUtils.show(graph, wnd.document);

    let print = function () {
      wnd.focus();
      wnd.print();
      wnd.close();
    };

    if (wangClient.IS_GC) {
      wnd.setTimeout(print, 500);
    } else {
      print();
    }
  }

  static popup(content, isInternalWindow) {
    if (isInternalWindow) {
      let div = document.createElement('div');
      div.style.overflow = 'scroll';
      div.style.width = '636px';
      div.style.height = '460px';
      let pre = document.createElement('pre');
      pre.innerHTML = wangUtils.htmlEntities(content, false).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
      div.appendChild(pre);
      let w = document.body.clientWidth;
      let h = Math.max(document.body.clientHeight || 0, document.documentElement.clientHeight);
      let wnd = new wangWindow('Popup Window', div, w / 2 - 320, h / 2 - 240, 640, 480, false, true);
      wnd.setClosable(true);
      wnd.setVisible(true);
    } else {
      if (wangClient.IS_NS) {
        let wnd = window.open();
        wnd.document.writeln('<pre>' + wangUtils.htmlEntities(content) + '</pre');
        wnd.document.close();
      } else {
        let wnd = window.open();
        let pre = wnd.document.createElement('pre');
        pre.innerHTML = wangUtils.htmlEntities(content, false).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
        wnd.document.body.appendChild(pre);
      }
    }
  }

  static alert(message) {
    alert(message);
  }

  static prompt(message, defaultValue) {
    return prompt(message, defaultValue != null ? defaultValue : '');
  }

  static confirm(message) {
    return confirm(message);
  }

  static error(message, width, close, icon) {
    let div = document.createElement('div');
    div.style.padding = '20px';
    let img = document.createElement('img');
    img.setAttribute('src', icon || wangUtils.errorImage);
    img.setAttribute('valign', 'bottom');
    img.style.verticalAlign = 'middle';
    div.appendChild(img);
    div.appendChild(document.createTextNode('\u00a0'));
    div.appendChild(document.createTextNode('\u00a0'));
    div.appendChild(document.createTextNode('\u00a0'));
    wangUtils.write(div, message);
    let w = document.body.clientWidth;
    let h = document.body.clientHeight || document.documentElement.clientHeight;
    let warn = new wangWindow(
      wangResources.get(wangUtils.errorResource) || wangUtils.errorResource,
      div,
      (w - width) / 2,
      h / 4,
      width,
      null,
      false,
      true
    );

    if (close) {
      wangUtils.br(div);
      let tmp = document.createElement('p');
      let button = document.createElement('button');
      button.setAttribute('style', 'float:right');
      wangEvent.addListener(button, 'click', function (evt) {
        warn.destroy();
      });
      wangUtils.write(button, wangResources.get(wangUtils.closeResource) || wangUtils.closeResource);
      tmp.appendChild(button);
      div.appendChild(tmp);
      wangUtils.br(div);
      warn.setClosable(true);
    }

    warn.setVisible(true);
    return warn;
  }

  static makeDraggable(
    element,
    graphF,
    funct,
    dragElement,
    dx,
    dy,
    autoscroll,
    scalePreview,
    highlightDropTargets,
    getDropTarget
  ) {
    let dragSource = new wangDragSource(element, funct);
    dragSource.dragOffset = new wangPoint(dx != null ? dx : 0, dy != null ? dy : wangConstants.TOOLTIP_VERTICAL_OFFSET);
    dragSource.autoscroll = autoscroll;
    dragSource.setGuidesEnabled(false);

    if (highlightDropTargets != null) {
      dragSource.highlightDropTargets = highlightDropTargets;
    }

    if (getDropTarget != null) {
      dragSource.getDropTarget = getDropTarget;
    }

    dragSource.getGraphForEvent = function (evt) {
      return typeof graphF == 'function' ? graphF(evt) : graphF;
    };

    if (dragElement != null) {
      dragSource.createDragElement = function () {
        return dragElement.cloneNode(true);
      };

      if (scalePreview) {
        dragSource.createPreviewElement = function (graph) {
          let elt = dragElement.cloneNode(true);
          let w = parseInt(elt.style.width);
          let h = parseInt(elt.style.height);
          elt.style.width = Math.round(w * graph.view.scale) + 'px';
          elt.style.height = Math.round(h * graph.view.scale) + 'px';
          return elt;
        };
      }
    }

    return dragSource;
  }
}
