import { wangAbstractCanvas2D } from '@wangGraph/util/wangAbstractCanvas2D';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangClient } from '@wangGraph/wangClient';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangSvgCanvas2D extends wangAbstractCanvas2D {
  useDomParser = typeof DOMParser === 'function' && typeof XMLSerializer === 'function';
  node = null;
  matchHtmlAlignment = true;
  textEnabled = true;
  foEnabled = true;
  foAltText = '[Object]';
  foOffset = 0;
  textOffset = 0;
  imageOffset = 0;
  strokeTolerance = 0;
  minStrokeWidth = 1;
  refCount = 0;
  lineHeightCorrection = 1;
  pointerEventsValue = 'all';
  fontMetricsPadding = 10;
  cacheOffsetSize = true;

  constructor(root, styleEnabled) {
    super();
    this.root = root;
    this.gradients = [];
    this.defs = null;
    this.styleEnabled = styleEnabled != null ? styleEnabled : false;
    let svg = null;

    if (root.ownerDocument != document) {
      let node = root;

      while (node != null && node.nodeName != 'svg') {
        node = node.parentNode;
      }

      svg = node;
    }

    if (svg != null) {
      let tmp = svg.getElementsByTagName('defs');

      if (tmp.length > 0) {
        this.defs = svg.getElementsByTagName('defs')[0];
      }

      if (this.defs == null) {
        this.defs = this.createElement('defs');

        if (svg.firstChild != null) {
          svg.insertBefore(this.defs, svg.firstChild);
        } else {
          svg.appendChild(this.defs);
        }
      }

      if (this.styleEnabled) {
        this.defs.appendChild(this.createStyle());
      }
    }
  }

  format(value) {
    return parseFloat(parseFloat(value).toFixed(2));
  }

  getBaseUrl() {
    let href = window.location.href;
    let hash = href.lastIndexOf('#');

    if (hash > 0) {
      href = href.substring(0, hash);
    }

    return href;
  }

  reset() {
    super.reset();
    this.gradients = [];
  }

  createStyle(x) {
    let style = this.createElement('style');
    style.setAttribute('type', 'text/css');
    wangUtils.write(
      style,
      'svg{font-family:' +
        wangConstants.DEFAULT_FONTFAMILY +
        ';font-size:' +
        wangConstants.DEFAULT_FONTSIZE +
        ';fill:none;stroke-miterlimit:10}'
    );
    return style;
  }

  createElement(tagName, namespace) {
    if (this.root.ownerDocument.createElementNS != null) {
      return this.root.ownerDocument.createElementNS(namespace || wangConstants.NS_SVG, tagName);
    } else {
      let elt = this.root.ownerDocument.createElement(tagName);

      if (namespace != null) {
        elt.setAttribute('xmlns', namespace);
      }

      return elt;
    }
  }

  getAlternateText(fo, x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation) {
    return str != null ? this.foAltText : null;
  }

  createAlternateContent(fo, x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation) {
    let text = this.getAlternateText(fo, x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation);
    let s = this.state;

    if (text != null && s.fontSize > 0) {
      let dy = valign == wangConstants.ALIGN_TOP ? 1 : valign == wangConstants.ALIGN_BOTTOM ? 0 : 0.3;
      let anchor = align == wangConstants.ALIGN_RIGHT ? 'end' : align == wangConstants.ALIGN_LEFT ? 'start' : 'middle';
      let alt = this.createElement('text');
      alt.setAttribute('x', Math.round(x + s.dx));
      alt.setAttribute('y', Math.round(y + s.dy + dy * s.fontSize));
      alt.setAttribute('fill', s.fontColor || 'black');
      alt.setAttribute('font-family', s.fontFamily);
      alt.setAttribute('font-size', Math.round(s.fontSize) + 'px');

      if (anchor != 'start') {
        alt.setAttribute('text-anchor', anchor);
      }

      if ((s.fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
        alt.setAttribute('font-weight', 'bold');
      }

      if ((s.fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
        alt.setAttribute('font-style', 'italic');
      }

      let txtDecor = [];

      if ((s.fontStyle & wangConstants.FONT_UNDERLINE) == wangConstants.FONT_UNDERLINE) {
        txtDecor.push('underline');
      }

      if ((s.fontStyle & wangConstants.FONT_STRIKETHROUGH) == wangConstants.FONT_STRIKETHROUGH) {
        txtDecor.push('line-through');
      }

      if (txtDecor.length > 0) {
        alt.setAttribute('text-decoration', txtDecor.join(' '));
      }

      wangUtils.write(alt, text);
      return alt;
    } else {
      return null;
    }
  }

  createGradientId(start, end, alpha1, alpha2, direction) {
    if (start.charAt(0) == '#') {
      start = start.substring(1);
    }

    if (end.charAt(0) == '#') {
      end = end.substring(1);
    }

    start = start.toLowerCase() + '-' + alpha1;
    end = end.toLowerCase() + '-' + alpha2;
    let dir = null;

    if (direction == null || direction == wangConstants.DIRECTION_SOUTH) {
      dir = 's';
    } else if (direction == wangConstants.DIRECTION_EAST) {
      dir = 'e';
    } else {
      let tmp = start;
      start = end;
      end = tmp;

      if (direction == wangConstants.DIRECTION_NORTH) {
        dir = 's';
      } else if (direction == wangConstants.DIRECTION_WEST) {
        dir = 'e';
      }
    }

    return 'wang-gradient-' + start + '-' + end + '-' + dir;
  }

  getSvgGradient(start, end, alpha1, alpha2, direction) {
    let id = this.createGradientId(start, end, alpha1, alpha2, direction);
    let gradient = this.gradients[id];

    if (gradient == null) {
      let svg = this.root.ownerSVGElement;
      let counter = 0;
      let tmpId = id + '-' + counter;

      if (svg != null) {
        gradient = svg.ownerDocument.getElementById(tmpId);

        while (gradient != null && gradient.ownerSVGElement != svg) {
          tmpId = id + '-' + counter++;
          gradient = svg.ownerDocument.getElementById(tmpId);
        }
      } else {
        tmpId = 'id' + ++this.refCount;
      }

      if (gradient == null) {
        gradient = this.createSvgGradient(start, end, alpha1, alpha2, direction);
        gradient.setAttribute('id', tmpId);

        if (this.defs != null) {
          this.defs.appendChild(gradient);
        } else {
          svg.appendChild(gradient);
        }
      }

      this.gradients[id] = gradient;
    }

    return gradient.getAttribute('id');
  }

  createSvgGradient(start, end, alpha1, alpha2, direction) {
    let gradient = this.createElement('linearGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '0%');

    if (direction == null || direction == wangConstants.DIRECTION_SOUTH) {
      gradient.setAttribute('y2', '100%');
    } else if (direction == wangConstants.DIRECTION_EAST) {
      gradient.setAttribute('x2', '100%');
    } else if (direction == wangConstants.DIRECTION_NORTH) {
      gradient.setAttribute('y1', '100%');
    } else if (direction == wangConstants.DIRECTION_WEST) {
      gradient.setAttribute('x1', '100%');
    }

    let op = alpha1 < 1 ? ';stop-opacity:' + alpha1 : '';
    let stop = this.createElement('stop');
    stop.setAttribute('offset', '0%');
    stop.setAttribute('style', 'stop-color:' + start + op);
    gradient.appendChild(stop);
    op = alpha2 < 1 ? ';stop-opacity:' + alpha2 : '';
    stop = this.createElement('stop');
    stop.setAttribute('offset', '100%');
    stop.setAttribute('style', 'stop-color:' + end + op);
    gradient.appendChild(stop);
    return gradient;
  }

  addNode(filled, stroked) {
    let node = this.node;
    let s = this.state;

    if (node != null) {
      if (node.nodeName == 'path') {
        if (this.path != null && this.path.length > 0) {
          node.setAttribute('d', this.path.join(' '));
        } else {
          return;
        }
      }

      if (filled && s.fillColor != null) {
        this.updateFill();
      } else if (!this.styleEnabled) {
        if (node.nodeName == 'ellipse' && wangClient.IS_FF) {
          node.setAttribute('fill', 'transparent');
        } else {
          node.setAttribute('fill', 'none');
        }

        filled = false;
      }

      if (stroked && s.strokeColor != null) {
        this.updateStroke();
      } else if (!this.styleEnabled) {
        node.setAttribute('stroke', 'none');
      }

      if (s.transform != null && s.transform.length > 0) {
        node.setAttribute('transform', s.transform);
      }

      if (s.shadow) {
        this.root.appendChild(this.createShadow(node));
      }

      if (this.strokeTolerance > 0 && !filled) {
        this.root.appendChild(this.createTolerance(node));
      }

      if (this.pointerEvents) {
        node.setAttribute('pointer-events', this.pointerEventsValue);
      } else if (!this.pointerEvents && this.originalRoot == null) {
        node.setAttribute('pointer-events', 'none');
      }

      if (
        (node.nodeName != 'rect' && node.nodeName != 'path' && node.nodeName != 'ellipse') ||
        (node.getAttribute('fill') != 'none' && node.getAttribute('fill') != 'transparent') ||
        node.getAttribute('stroke') != 'none' ||
        node.getAttribute('pointer-events') != 'none'
      ) {
        this.root.appendChild(node);
      }

      this.node = null;
    }
  }

  updateFill() {
    let s = this.state;

    if (s.alpha < 1 || s.fillAlpha < 1) {
      this.node.setAttribute('fill-opacity', s.alpha * s.fillAlpha);
    }

    if (s.fillColor != null) {
      if (s.gradientColor != null) {
        let id = this.getSvgGradient(
          String(s.fillColor),
          String(s.gradientColor),
          s.gradientFillAlpha,
          s.gradientAlpha,
          s.gradientDirection
        );

        if (!wangClient.IS_CHROMEAPP && !wangClient.IS_IE11 && !wangClient.IS_EDGE && this.root.ownerDocument == document) {
          let base = this.getBaseUrl().replace(/([\(\)])/g, '\\$1');
          this.node.setAttribute('fill', 'url(' + base + '#' + id + ')');
        } else {
          this.node.setAttribute('fill', 'url(#' + id + ')');
        }
      } else {
        this.node.setAttribute('fill', String(s.fillColor).toLowerCase());
      }
    }
  }

  getCurrentStrokeWidth() {
    return Math.max(this.minStrokeWidth, Math.max(0.01, this.format(this.state.strokeWidth * this.state.scale)));
  }

  updateStroke() {
    let s = this.state;
    this.node.setAttribute('stroke', String(s.strokeColor).toLowerCase());

    if (s.alpha < 1 || s.strokeAlpha < 1) {
      this.node.setAttribute('stroke-opacity', s.alpha * s.strokeAlpha);
    }

    let sw = this.getCurrentStrokeWidth();

    if (sw != 1) {
      this.node.setAttribute('stroke-width', sw);
    }

    if (this.node.nodeName == 'path') {
      this.updateStrokeAttributes();
    }

    if (s.dashed) {
      this.node.setAttribute('stroke-dasharray', this.createDashPattern((s.fixDash ? 1 : s.strokeWidth) * s.scale));
    }
  }

  updateStrokeAttributes() {
    let s = this.state;

    if (s.lineJoin != null && s.lineJoin != 'miter') {
      this.node.setAttribute('stroke-linejoin', s.lineJoin);
    }

    if (s.lineCap != null) {
      let value = s.lineCap;

      if (value == 'flat') {
        value = 'butt';
      }

      if (value != 'butt') {
        this.node.setAttribute('stroke-linecap', value);
      }
    }

    if (s.miterLimit != null && (!this.styleEnabled || s.miterLimit != 10)) {
      this.node.setAttribute('stroke-miterlimit', s.miterLimit);
    }
  }

  createDashPattern(scale) {
    let pat = [];

    if (typeof this.state.dashPattern === 'string') {
      let dash = this.state.dashPattern.split(' ');

      if (dash.length > 0) {
        for (let i = 0; i < dash.length; i++) {
          pat[i] = Number(dash[i]) * scale;
        }
      }
    }

    return pat.join(' ');
  }

  createTolerance(node) {
    let tol = node.cloneNode(true);
    let sw = parseFloat(tol.getAttribute('stroke-width') || 1) + this.strokeTolerance;
    tol.setAttribute('pointer-events', 'stroke');
    tol.setAttribute('visibility', 'hidden');
    tol.removeAttribute('stroke-dasharray');
    tol.setAttribute('stroke-width', sw);
    tol.setAttribute('fill', 'none');
    tol.setAttribute('stroke', wangClient.IS_OT ? 'none' : 'white');
    return tol;
  }

  createShadow(node) {
    let shadow = node.cloneNode(true);
    let s = this.state;

    if (shadow.getAttribute('fill') != 'none' && (!wangClient.IS_FF || shadow.getAttribute('fill') != 'transparent')) {
      shadow.setAttribute('fill', s.shadowColor);
    }

    if (shadow.getAttribute('stroke') != 'none') {
      shadow.setAttribute('stroke', s.shadowColor);
    }

    shadow.setAttribute(
      'transform',
      'translate(' +
        this.format(s.shadowDx * s.scale) +
        ',' +
        this.format(s.shadowDy * s.scale) +
        ')' +
        (s.transform || '')
    );
    shadow.setAttribute('opacity', s.shadowAlpha);
    return shadow;
  }

  setLink(link) {
    if (link == null) {
      this.root = this.originalRoot;
    } else {
      this.originalRoot = this.root;
      let node = this.createElement('a');

      if (node.setAttributeNS == null || (this.root.ownerDocument != document && document.documentMode == null)) {
        node.setAttribute('xlink:href', link);
      } else {
        node.setAttributeNS(wangConstants.NS_XLINK, 'xlink:href', link);
      }

      this.root.appendChild(node);
      this.root = node;
    }
  }

  rotate(theta, flipH, flipV, cx, cy) {
    if (theta != 0 || flipH || flipV) {
      let s = this.state;
      cx += s.dx;
      cy += s.dy;
      cx *= s.scale;
      cy *= s.scale;
      s.transform = s.transform || '';

      if (flipH && flipV) {
        theta += 180;
      } else if (flipH != flipV) {
        let tx = flipH ? cx : 0;
        let sx = flipH ? -1 : 1;
        let ty = flipV ? cy : 0;
        let sy = flipV ? -1 : 1;
        s.transform +=
          'translate(' +
          this.format(tx) +
          ',' +
          this.format(ty) +
          ')' +
          'scale(' +
          this.format(sx) +
          ',' +
          this.format(sy) +
          ')' +
          'translate(' +
          this.format(-tx) +
          ',' +
          this.format(-ty) +
          ')';
      }

      if (flipH ? !flipV : flipV) {
        theta *= -1;
      }

      if (theta != 0) {
        s.transform += 'rotate(' + this.format(theta) + ',' + this.format(cx) + ',' + this.format(cy) + ')';
      }

      s.rotation = s.rotation + theta;
      s.rotationCx = cx;
      s.rotationCy = cy;
    }
  }

  begin() {
    super.begin();
    this.node = this.createElement('path');
  }

  rect(x, y, w, h) {
    let s = this.state;
    let n = this.createElement('rect');
    n.setAttribute('x', this.format((x + s.dx) * s.scale));
    n.setAttribute('y', this.format((y + s.dy) * s.scale));
    n.setAttribute('width', this.format(w * s.scale));
    n.setAttribute('height', this.format(h * s.scale));
    this.node = n;
  }

  roundrect(x, y, w, h, dx, dy) {
    this.rect(x, y, w, h);

    if (dx > 0) {
      this.node.setAttribute('rx', this.format(dx * this.state.scale));
    }

    if (dy > 0) {
      this.node.setAttribute('ry', this.format(dy * this.state.scale));
    }
  }

  ellipse(x, y, w, h) {
    let s = this.state;
    let n = this.createElement('ellipse');
    n.setAttribute('cx', this.format((x + w / 2 + s.dx) * s.scale));
    n.setAttribute('cy', this.format((y + h / 2 + s.dy) * s.scale));
    n.setAttribute('rx', (w / 2) * s.scale);
    n.setAttribute('ry', (h / 2) * s.scale);
    this.node = n;
  }

  image(x, y, w, h, src, aspect, flipH, flipV) {
    src = this.converter.convert(src);
    aspect = aspect != null ? aspect : true;
    flipH = flipH != null ? flipH : false;
    flipV = flipV != null ? flipV : false;
    let s = this.state;
    x += s.dx;
    y += s.dy;
    let node = this.createElement('image');
    node.setAttribute('x', this.format(x * s.scale) + this.imageOffset);
    node.setAttribute('y', this.format(y * s.scale) + this.imageOffset);
    node.setAttribute('width', this.format(w * s.scale));
    node.setAttribute('height', this.format(h * s.scale));

    if (node.setAttributeNS == null) {
      node.setAttribute('xlink:href', src);
    } else {
      node.setAttributeNS(wangConstants.NS_XLINK, 'xlink:href', src);
    }

    if (!aspect) {
      node.setAttribute('preserveAspectRatio', 'none');
    }

    if (s.alpha < 1 || s.fillAlpha < 1) {
      node.setAttribute('opacity', s.alpha * s.fillAlpha);
    }

    let tr = this.state.transform || '';

    if (flipH || flipV) {
      let sx = 1;
      let sy = 1;
      let dx = 0;
      let dy = 0;

      if (flipH) {
        sx = -1;
        dx = -w - 2 * x;
      }

      if (flipV) {
        sy = -1;
        dy = -h - 2 * y;
      }

      tr += 'scale(' + sx + ',' + sy + ')translate(' + dx * s.scale + ',' + dy * s.scale + ')';
    }

    if (tr.length > 0) {
      node.setAttribute('transform', tr);
    }

    if (!this.pointerEvents) {
      node.setAttribute('pointer-events', 'none');
    }

    this.root.appendChild(node);
  }

  convertHtml(val) {
    if (this.useDomParser) {
      let doc = new DOMParser().parseFromString(val, 'text/html');

      if (doc != null) {
        val = new XMLSerializer().serializeToString(doc.body);

        if (val.substring(0, 5) == '<body') {
          val = val.substring(val.indexOf('>', 5) + 1);
        }

        if (val.substring(val.length - 7, val.length) == '</body>') {
          val = val.substring(0, val.length - 7);
        }
      }
    } else if (document.implementation != null && document.implementation.createDocument != null) {
      let xd = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
      let xb = xd.createElement('body');
      xd.documentElement.appendChild(xb);
      let div = document.createElement('div');
      div.innerHTML = val;
      let child = div.firstChild;

      while (child != null) {
        let next = child.nextSibling;
        xb.appendChild(xd.adoptNode(child));
        child = next;
      }

      return xb.innerHTML;
    } else {
      let ta = document.createElement('textarea');
      ta.innerHTML = val
        .replace(/&amp;/g, '&amp;amp;')
        .replace(/&#60;/g, '&amp;lt;')
        .replace(/&#62;/g, '&amp;gt;')
        .replace(/&lt;/g, '&amp;lt;')
        .replace(/&gt;/g, '&amp;gt;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      val = ta.value
        .replace(/&/g, '&amp;')
        .replace(/&amp;lt;/g, '&lt;')
        .replace(/&amp;gt;/g, '&gt;')
        .replace(/&amp;amp;/g, '&amp;')
        .replace(/<br>/g, '<br />')
        .replace(/<hr>/g, '<hr />')
        .replace(/(<img[^>]+)>/gm, '$1 />');
    }

    return val;
  }

  createDiv(str) {
    let val = str;

    if (!wangUtils.isNode(val)) {
      val = '<div><div>' + this.convertHtml(val) + '</div></div>';
    }

    if (!wangClient.IS_IE11 && document.createElementNS) {
      let div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');

      if (wangUtils.isNode(val)) {
        let div2 = document.createElement('div');
        let div3 = div2.cloneNode(false);

        if (this.root.ownerDocument != document) {
          div2.appendChild(val.cloneNode(true));
        } else {
          div2.appendChild(val);
        }

        div3.appendChild(div2);
        div.appendChild(div3);
      } else {
        div.innerHTML = val;
      }

      return div;
    } else {
      if (wangUtils.isNode(val)) {
        val = '<div><div>' + wangUtils.getXml(val) + '</div></div>';
      }

      val = '<div xmlns="http://www.w3.org/1999/xhtml">' + val + '</div>';
      return wangUtils.parseXml(val).documentElement;
    }
  }

  updateText(x, y, w, h, align, valign, wrap, overflow, clip, rotation, node) {
    if (node != null && node.firstChild != null && node.firstChild.firstChild != null) {
      this.updateTextNodes(x, y, w, h, align, valign, wrap, overflow, clip, rotation, node.firstChild);
    }
  }

  addForeignObject(x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation, dir, div, root) {
    let group = this.createElement('g');
    let fo = this.createElement('foreignObject');
    fo.setAttribute('style', 'overflow: visible; text-align: left;');
    fo.setAttribute('pointer-events', 'none');

    if (div.ownerDocument != document) {
      div = wangUtils.importNodeImplementation(fo.ownerDocument, div, true);
    }

    fo.appendChild(div);
    group.appendChild(fo);
    this.updateTextNodes(x, y, w, h, align, valign, wrap, overflow, clip, rotation, group);

    if (this.root.ownerDocument != document) {
      let alt = this.createAlternateContent(fo, x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation);

      if (alt != null) {
        fo.setAttribute('requiredFeatures', 'http://www.w3.org/TR/SVG11/feature#Extensibility');
        let sw = this.createElement('switch');
        sw.appendChild(fo);
        sw.appendChild(alt);
        group.appendChild(sw);
      }
    }

    root.appendChild(group);
  }

  updateTextNodes(x, y, w, h, align, valign, wrap, overflow, clip, rotation, g) {
    let s = this.state.scale;
    wangSvgCanvas2D.createCss(
      w + 2,
      h,
      align,
      valign,
      wrap,
      overflow,
      clip,
      this.state.fontBackgroundColor != null ? this.state.fontBackgroundColor : null,
      this.state.fontBorderColor != null ? this.state.fontBorderColor : null,
      'display: flex; align-items: unsafe ' +
        (valign == wangConstants.ALIGN_TOP ? 'flex-start' : valign == wangConstants.ALIGN_BOTTOM ? 'flex-end' : 'center') +
        '; ' +
        'justify-content: unsafe ' +
        (align == wangConstants.ALIGN_LEFT ? 'flex-start' : align == wangConstants.ALIGN_RIGHT ? 'flex-end' : 'center') +
        '; ',
      this.getTextCss(),
      s,
      (dx, dy, flex, item, block) => {
        x += this.state.dx;
        y += this.state.dy;
        let fo = g.firstChild;
        let div = fo.firstChild;
        let box = div.firstChild;
        let text = box.firstChild;
        let r = (this.rotateHtml ? this.state.rotation : 0) + (rotation != null ? rotation : 0);
        let t =
          (this.foOffset != 0 ? 'translate(' + this.foOffset + ' ' + this.foOffset + ')' : '') +
          (s != 1 ? 'scale(' + s + ')' : '');
        text.setAttribute('style', block);
        box.setAttribute('style', item);
        fo.setAttribute('width', Math.ceil((1 / Math.min(1, s)) * 100) + '%');
        fo.setAttribute('height', Math.ceil((1 / Math.min(1, s)) * 100) + '%');
        let yp = Math.round(y + dy);

        if (yp < 0) {
          fo.setAttribute('y', yp);
        } else {
          fo.removeAttribute('y');
          flex += 'padding-top: ' + yp + 'px; ';
        }

        div.setAttribute('style', flex + 'margin-left: ' + Math.round(x + dx) + 'px;');
        t += r != 0 ? 'rotate(' + r + ' ' + x + ' ' + y + ')' : '';

        if (t != '') {
          g.setAttribute('transform', t);
        } else {
          g.removeAttribute('transform');
        }

        if (this.state.alpha != 1) {
          g.setAttribute('opacity', this.state.alpha);
        } else {
          g.removeAttribute('opacity');
        }
      }
    );
  }

  static createCss(w, h, align, valign, wrap, overflow, clip, bg, border, flex, block, s, callback) {
    let item =
      'box-sizing: border-box; font-size: 0; text-align: ' +
      (align == wangConstants.ALIGN_LEFT ? 'left' : align == wangConstants.ALIGN_RIGHT ? 'right' : 'center') +
      '; ';
    let pt = wangUtils.getAlignmentAsPoint(align, valign);
    let ofl = 'overflow: hidden; ';
    let fw = 'width: 1px; ';
    let fh = 'height: 1px; ';
    let dx = pt.x * w;
    let dy = pt.y * h;

    if (clip) {
      fw = 'width: ' + Math.round(w) + 'px; ';
      item += 'max-height: ' + Math.round(h) + 'px; ';
      dy = 0;
    } else if (overflow == 'fill') {
      fw = 'width: ' + Math.round(w) + 'px; ';
      fh = 'height: ' + Math.round(h) + 'px; ';
      block += 'width: 100%; height: 100%; ';
      item += fw + fh;
    } else if (overflow == 'width') {
      fw = 'width: ' + Math.round(w) + 'px; ';
      block += 'width: 100%; ';
      item += fw;
      dy = 0;

      if (h > 0) {
        item += 'max-height: ' + Math.round(h) + 'px; ';
      }
    } else {
      ofl = '';
      dy = 0;
    }

    let bgc = '';

    if (bg != null) {
      bgc += 'background-color: ' + bg + '; ';
    }

    if (border != null) {
      bgc += 'border: 1px solid ' + border + '; ';
    }

    if (ofl == '' || clip) {
      block += bgc;
    } else {
      item += bgc;
    }

    if (wrap && w > 0) {
      block += 'white-space: normal; word-wrap: ' + wangConstants.WORD_WRAP + '; ';
      fw = 'width: ' + Math.round(w) + 'px; ';

      if (ofl != '' && overflow != 'fill') {
        dy = 0;
      }
    } else {
      block += 'white-space: nowrap; ';

      if (ofl == '') {
        dx = 0;
      }
    }

    callback(dx, dy, flex + fw + fh, item + ofl, block, ofl);
  }

  getTextCss() {
    let s = this.state;
    let lh = wangConstants.ABSOLUTE_LINE_HEIGHT
      ? s.fontSize * wangConstants.LINE_HEIGHT + 'px'
      : wangConstants.LINE_HEIGHT * this.lineHeightCorrection;
    let css =
      'display: inline-block; font-size: ' +
      s.fontSize +
      'px; ' +
      'font-family: ' +
      s.fontFamily +
      '; color: ' +
      s.fontColor +
      '; line-height: ' +
      lh +
      '; pointer-events: ' +
      (this.pointerEvents ? this.pointerEventsValue : 'none') +
      '; ';

    if ((s.fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
      css += 'font-weight: bold; ';
    }

    if ((s.fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
      css += 'font-style: italic; ';
    }

    let deco = [];

    if ((s.fontStyle & wangConstants.FONT_UNDERLINE) == wangConstants.FONT_UNDERLINE) {
      deco.push('underline');
    }

    if ((s.fontStyle & wangConstants.FONT_STRIKETHROUGH) == wangConstants.FONT_STRIKETHROUGH) {
      deco.push('line-through');
    }

    if (deco.length > 0) {
      css += 'text-decoration: ' + deco.join(' ') + '; ';
    }

    return css;
  }

  text(x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation, dir) {
    if (this.textEnabled && str != null) {
      rotation = rotation != null ? rotation : 0;

      if (this.foEnabled && format == 'html') {
        let div = this.createDiv(str);

        if (div != null) {
          if (dir != null) {
            div.setAttribute('dir', dir);
          }

          this.addForeignObject(
            x,
            y,
            w,
            h,
            str,
            align,
            valign,
            wrap,
            format,
            overflow,
            clip,
            rotation,
            dir,
            div,
            this.root
          );
        }
      } else {
        this.plainText(
          x + this.state.dx,
          y + this.state.dy,
          w,
          h,
          str,
          align,
          valign,
          wrap,
          overflow,
          clip,
          rotation,
          dir
        );
      }
    }
  }

  createClip(x, y, w, h) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    let id = 'wang-clip-' + x + '-' + y + '-' + w + '-' + h;
    let counter = 0;
    let tmp = id + '-' + counter;

    while (document.getElementById(tmp) != null) {
      tmp = id + '-' + ++counter;
    }

    let clip = this.createElement('clipPath');
    clip.setAttribute('id', tmp);
    let rect = this.createElement('rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    clip.appendChild(rect);
    return clip;
  }

  plainText(x, y, w, h, str, align, valign, wrap, overflow, clip, rotation, dir) {
    rotation = rotation != null ? rotation : 0;
    let s = this.state;
    let size = s.fontSize;
    let node = this.createElement('g');
    let tr = s.transform || '';
    this.updateFont(node);

    if (rotation != 0) {
      tr += 'rotate(' + rotation + ',' + this.format(x * s.scale) + ',' + this.format(y * s.scale) + ')';
    }

    if (dir != null) {
      node.setAttribute('direction', dir);
    }

    if (clip && w > 0 && h > 0) {
      let cx = x;
      let cy = y;

      if (align == wangConstants.ALIGN_CENTER) {
        cx -= w / 2;
      } else if (align == wangConstants.ALIGN_RIGHT) {
        cx -= w;
      }

      if (overflow != 'fill') {
        if (valign == wangConstants.ALIGN_MIDDLE) {
          cy -= h / 2;
        } else if (valign == wangConstants.ALIGN_BOTTOM) {
          cy -= h;
        }
      }

      let c = this.createClip(cx * s.scale - 2, cy * s.scale - 2, w * s.scale + 4, h * s.scale + 4);

      if (this.defs != null) {
        this.defs.appendChild(c);
      } else {
        this.root.appendChild(c);
      }

      if (!wangClient.IS_CHROMEAPP && !wangClient.IS_IE11 && !wangClient.IS_EDGE && this.root.ownerDocument == document) {
        let base = this.getBaseUrl().replace(/([\(\)])/g, '\\$1');
        node.setAttribute('clip-path', 'url(' + base + '#' + c.getAttribute('id') + ')');
      } else {
        node.setAttribute('clip-path', 'url(#' + c.getAttribute('id') + ')');
      }
    }

    let anchor = align == wangConstants.ALIGN_RIGHT ? 'end' : align == wangConstants.ALIGN_CENTER ? 'middle' : 'start';

    if (anchor != 'start') {
      node.setAttribute('text-anchor', anchor);
    }

    if (!this.styleEnabled || size != wangConstants.DEFAULT_FONTSIZE) {
      node.setAttribute('font-size', size * s.scale + 'px');
    }

    if (tr.length > 0) {
      node.setAttribute('transform', tr);
    }

    if (s.alpha < 1) {
      node.setAttribute('opacity', s.alpha);
    }

    let lines = str.split('\n');
    let lh = Math.round(size * wangConstants.LINE_HEIGHT);
    let textHeight = size + (lines.length - 1) * lh;
    let cy = y + size - 1;

    if (valign == wangConstants.ALIGN_MIDDLE) {
      if (overflow == 'fill') {
        cy -= h / 2;
      } else {
        let dy = (this.matchHtmlAlignment && clip && h > 0 ? Math.min(textHeight, h) : textHeight) / 2;
        cy -= dy;
      }
    } else if (valign == wangConstants.ALIGN_BOTTOM) {
      if (overflow == 'fill') {
        cy -= h;
      } else {
        let dy = this.matchHtmlAlignment && clip && h > 0 ? Math.min(textHeight, h) : textHeight;
        cy -= dy + 1;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 0 && wangUtils.trim(lines[i]).length > 0) {
        let text = this.createElement('text');
        text.setAttribute('x', this.format(x * s.scale) + this.textOffset);
        text.setAttribute('y', this.format(cy * s.scale) + this.textOffset);
        wangUtils.write(text, lines[i]);
        node.appendChild(text);
      }

      cy += lh;
    }

    this.root.appendChild(node);
    this.addTextBackground(node, str, x, y, w, overflow == 'fill' ? h : textHeight, align, valign, overflow);
  }

  updateFont(node) {
    let s = this.state;
    node.setAttribute('fill', s.fontColor);

    if (!this.styleEnabled || s.fontFamily != wangConstants.DEFAULT_FONTFAMILY) {
      node.setAttribute('font-family', s.fontFamily);
    }

    if ((s.fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
      node.setAttribute('font-weight', 'bold');
    }

    if ((s.fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
      node.setAttribute('font-style', 'italic');
    }

    let txtDecor = [];

    if ((s.fontStyle & wangConstants.FONT_UNDERLINE) == wangConstants.FONT_UNDERLINE) {
      txtDecor.push('underline');
    }

    if ((s.fontStyle & wangConstants.FONT_STRIKETHROUGH) == wangConstants.FONT_STRIKETHROUGH) {
      txtDecor.push('line-through');
    }

    if (txtDecor.length > 0) {
      node.setAttribute('text-decoration', txtDecor.join(' '));
    }
  }

  addTextBackground(node, str, x, y, w, h, align, valign, overflow) {
    let s = this.state;

    if (s.fontBackgroundColor != null || s.fontBorderColor != null) {
      let bbox = null;

      if (overflow == 'fill' || overflow == 'width') {
        if (align == wangConstants.ALIGN_CENTER) {
          x -= w / 2;
        } else if (align == wangConstants.ALIGN_RIGHT) {
          x -= w;
        }

        if (valign == wangConstants.ALIGN_MIDDLE) {
          y -= h / 2;
        } else if (valign == wangConstants.ALIGN_BOTTOM) {
          y -= h;
        }

        bbox = new wangRectangle((x + 1) * s.scale, y * s.scale, (w - 2) * s.scale, (h + 2) * s.scale);
      } else if (node.getBBox != null && this.root.ownerDocument == document) {
        try {
          bbox = node.getBBox();
          bbox = new wangRectangle(bbox.x, bbox.y + 1, bbox.width, bbox.height);
        } catch (e) {
          /* ignore */
        }
      } else {
        let div = document.createElement('div');
        div.style.lineHeight = wangConstants.ABSOLUTE_LINE_HEIGHT
          ? s.fontSize * wangConstants.LINE_HEIGHT + 'px'
          : wangConstants.LINE_HEIGHT;
        div.style.fontSize = s.fontSize + 'px';
        div.style.fontFamily = s.fontFamily;
        div.style.whiteSpace = 'nowrap';
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.display = wangClient.IS_QUIRKS ? 'inline' : 'inline-block';
        div.style.zoom = '1';

        if ((s.fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
          div.style.fontWeight = 'bold';
        }

        if ((s.fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
          div.style.fontStyle = 'italic';
        }

        str = wangUtils.htmlEntities(str, false);
        div.innerHTML = str.replace(/\n/g, '<br/>');
        document.body.appendChild(div);
        let w = div.offsetWidth;
        let h = div.offsetHeight;
        div.parentNode.removeChild(div);

        if (align == wangConstants.ALIGN_CENTER) {
          x -= w / 2;
        } else if (align == wangConstants.ALIGN_RIGHT) {
          x -= w;
        }

        if (valign == wangConstants.ALIGN_MIDDLE) {
          y -= h / 2;
        } else if (valign == wangConstants.ALIGN_BOTTOM) {
          y -= h;
        }

        bbox = new wangRectangle((x + 1) * s.scale, (y + 2) * s.scale, w * s.scale, (h + 1) * s.scale);
      }

      if (bbox != null) {
        let n = this.createElement('rect');
        n.setAttribute('fill', s.fontBackgroundColor || 'none');
        n.setAttribute('stroke', s.fontBorderColor || 'none');
        n.setAttribute('x', Math.floor(bbox.x - 1));
        n.setAttribute('y', Math.floor(bbox.y - 1));
        n.setAttribute('width', Math.ceil(bbox.width + 2));
        n.setAttribute('height', Math.ceil(bbox.height));
        let sw = s.fontBorderColor != null ? Math.max(1, this.format(s.scale)) : 0;
        n.setAttribute('stroke-width', sw);

        if (this.root.ownerDocument == document && wangUtils.mod(sw, 2) == 1) {
          n.setAttribute('transform', 'translate(0.5, 0.5)');
        }

        node.insertBefore(n, node.firstChild);
      }
    }
  }

  stroke() {
    this.addNode(false, true);
  }

  fill() {
    this.addNode(true, false);
  }

  fillAndStroke() {
    this.addNode(true, true);
  }
}
