import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangVmlCanvas2D } from '@wangGraph/util/wangVmlCanvas2D';
import { wangSvgCanvas2D } from '@wangGraph/util/wangSvgCanvas2D';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangClient } from '@wangGraph/wangClient';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangShape {
  dialect = null;
  scale = 1;
  antiAlias = true;
  minSvgStrokeWidth = 1;
  bounds = null;
  points = null;
  node = null;
  state = null;
  style = null;
  boundingBox = null;
  svgStrokeTolerance = 8;
  pointerEvents = true;
  svgPointerEvents = 'all';
  shapePointerEvents = false;
  stencilPointerEvents = false;
  vmlScale = 1;
  outline = false;
  visible = true;
  useSvgBoundingBox = false;
  verticalTextRotation = -90;

  constructor(stencil) {
    this.stencil = stencil;
    this.initStyles();
  }

  init(container) {
    if (this.node == null) {
      this.node = this.create(container);

      if (container != null) {
        container.appendChild(this.node);
      }
    }
  }

  initStyles(container) {
    this.strokewidth = 1;
    this.rotation = 0;
    this.opacity = 100;
    this.fillOpacity = 100;
    this.strokeOpacity = 100;
    this.flipH = false;
    this.flipV = false;
  }

  isParseVml() {
    return true;
  }

  isHtmlAllowed() {
    return false;
  }

  getSvgScreenOffset() {
    let sw =
      this.stencil && this.stencil.strokewidth != 'inherit' ? Number(this.stencil.strokewidth) : this.strokewidth;
    return wangUtils.mod(Math.max(1, Math.round(sw * this.scale)), 2) == 1 ? 0.5 : 0;
  }

  create(container) {
    let node = null;

    if (container != null && container.ownerSVGElement != null) {
      node = this.createSvg(container);
    } else if (this.dialect != wangConstants.DIALECT_VML && this.isHtmlAllowed()) {
      node = this.createHtml(container);
    } else {
      node = this.createVml(container);
    }

    return node;
  }

  createSvg() {
    return document.createElementNS(wangConstants.NS_SVG, 'g');
  }

  createVml() {
    let node = document.createElement(wangClient.VML_PREFIX + ':group');
    node.style.position = 'absolute';
    return node;
  }

  createHtml() {
    let node = document.createElement('div');
    node.style.position = 'absolute';
    return node;
  }

  reconfigure() {
    this.redraw();
  }

  redraw() {
    this.updateBoundsFromPoints();

    if (this.visible && this.checkBounds()) {
      this.node.style.visibility = 'visible';
      this.clear();

      if (this.node.nodeName == 'DIV' && this.isHtmlAllowed()) {
        this.redrawHtmlShape();
      } else {
        this.redrawShape();
      }

      this.updateBoundingBox();
    } else {
      this.node.style.visibility = 'hidden';
      this.boundingBox = null;
    }
  }

  clear() {
    if (this.node.ownerSVGElement != null) {
      while (this.node.lastChild != null) {
        this.node.removeChild(this.node.lastChild);
      }
    } else {
      this.node.style.cssText = 'position:absolute;' + (this.cursor != null ? 'cursor:' + this.cursor + ';' : '');
      this.node.innerHTML = '';
    }
  }

  updateBoundsFromPoints() {
    let pts = this.points;

    if (pts != null && pts.length > 0 && pts[0] != null) {
      this.bounds = new wangRectangle(Number(pts[0].x), Number(pts[0].y), 1, 1);

      for (let i = 1; i < this.points.length; i++) {
        if (pts[i] != null) {
          this.bounds.add(new wangRectangle(Number(pts[i].x), Number(pts[i].y), 1, 1));
        }
      }
    }
  }

  getLabelBounds(rect) {
    let d = wangUtils.getValue(this.style, wangConstants.STYLE_DIRECTION, wangConstants.DIRECTION_EAST);
    let bounds = rect;

    if (
      d != wangConstants.DIRECTION_SOUTH &&
      d != wangConstants.DIRECTION_NORTH &&
      this.state != null &&
      this.state.text != null &&
      this.state.text.isPaintBoundsInverted()
    ) {
      bounds = bounds.clone();
      let tmp = bounds.width;
      bounds.width = bounds.height;
      bounds.height = tmp;
    }

    let m = this.getLabelMargins(bounds);

    if (m != null) {
      let flipH = wangUtils.getValue(this.style, wangConstants.STYLE_FLIPH, false) == '1';
      let flipV = wangUtils.getValue(this.style, wangConstants.STYLE_FLIPV, false) == '1';

      if (this.state != null && this.state.text != null && this.state.text.isPaintBoundsInverted()) {
        let tmp = m.x;
        m.x = m.height;
        m.height = m.width;
        m.width = m.y;
        m.y = tmp;
        tmp = flipH;
        flipH = flipV;
        flipV = tmp;
      }

      return wangUtils.getDirectedBounds(rect, m, this.style, flipH, flipV);
    }

    return rect;
  }

  getLabelMargins(rect) {
    return null;
  }

  checkBounds() {
    return (
      !isNaN(this.scale) &&
      isFinite(this.scale) &&
      this.scale > 0 &&
      this.bounds != null &&
      !isNaN(this.bounds.x) &&
      !isNaN(this.bounds.y) &&
      !isNaN(this.bounds.width) &&
      !isNaN(this.bounds.height) &&
      this.bounds.width > 0 &&
      this.bounds.height > 0
    );
  }

  createVmlGroup() {
    let node = document.createElement(wangClient.VML_PREFIX + ':group');
    node.style.position = 'absolute';
    node.style.width = this.node.style.width;
    node.style.height = this.node.style.height;
    return node;
  }

  redrawShape() {
    let canvas = this.createCanvas();

    if (canvas != null) {
      canvas.pointerEvents = this.pointerEvents;
      this.paint(canvas);

      if (this.node != canvas.root) {
        this.node.insertAdjacentHTML('beforeend', canvas.root.outerHTML);
      }

      if (this.node.nodeName == 'DIV' && document.documentMode == 8) {
        this.node.style.filter = '';
        wangUtils.addTransparentBackgroundFilter(this.node);
      }

      this.destroyCanvas(canvas);
    }
  }

  createCanvas() {
    let canvas = null;

    if (this.node.ownerSVGElement != null) {
      canvas = this.createSvgCanvas();
    }

    if (canvas != null && this.outline) {
      canvas.setStrokeWidth(this.strokewidth);
      canvas.setStrokeColor(this.stroke);

      if (this.isDashed != null) {
        canvas.setDashed(this.isDashed);
      }

      canvas.setStrokeWidth = function () {};

      canvas.setStrokeColor = function () {};

      canvas.setFillColor = function () {};

      canvas.setGradient = function () {};

      canvas.setDashed = function () {};

      canvas.text = function () {};
    }

    return canvas;
  }

  createSvgCanvas() {
    let canvas = new wangSvgCanvas2D(this.node, false);
    canvas.strokeTolerance = this.pointerEvents ? this.svgStrokeTolerance : 0;
    canvas.pointerEventsValue = this.svgPointerEvents;
    let off = this.getSvgScreenOffset();

    if (off != 0) {
      this.node.setAttribute('transform', 'translate(' + off + ',' + off + ')');
    } else {
      this.node.removeAttribute('transform');
    }

    canvas.minStrokeWidth = this.minSvgStrokeWidth;

    if (!this.antiAlias) {
      canvas.format = function (value) {
        return Math.round(parseFloat(value));
      };
    }

    return canvas;
  }

  createVmlCanvas() {
    let node = document.documentMode == 8 && this.isParseVml() ? this.createVmlGroup() : this.node;
    let canvas = new wangVmlCanvas2D(node, false);

    if (node.tagUrn != '') {
      let w = Math.max(1, Math.round(this.bounds.width));
      let h = Math.max(1, Math.round(this.bounds.height));
      node.coordsize = w * this.vmlScale + ',' + h * this.vmlScale;
      canvas.scale(this.vmlScale);
      canvas.vmlScale = this.vmlScale;
    }

    let s = this.scale;
    canvas.translate(-Math.round(this.bounds.x / s), -Math.round(this.bounds.y / s));
    return canvas;
  }

  updateVmlContainer() {
    this.node.style.left = Math.round(this.bounds.x) + 'px';
    this.node.style.top = Math.round(this.bounds.y) + 'px';
    let w = Math.max(1, Math.round(this.bounds.width));
    let h = Math.max(1, Math.round(this.bounds.height));
    this.node.style.width = w + 'px';
    this.node.style.height = h + 'px';
    this.node.style.overflow = 'visible';
  }

  redrawHtmlShape() {
    this.updateHtmlBounds(this.node);
    this.updateHtmlFilters(this.node);
    this.updateHtmlColors(this.node);
  }

  updateHtmlFilters(node) {
    let f = '';

    if (this.opacity < 100) {
      f += 'alpha(opacity=' + this.opacity + ')';
    }

    if (this.isShadow) {
      f +=
        'progid:DXImageTransform.Microsoft.dropShadow (' +
        "OffX='" +
        Math.round(wangConstants.SHADOW_OFFSET_X * this.scale) +
        "', " +
        "OffY='" +
        Math.round(wangConstants.SHADOW_OFFSET_Y * this.scale) +
        "', " +
        "Color='" +
        wangConstants.VML_SHADOWCOLOR +
        "')";
    }

    if (this.fill != null && this.fill != wangConstants.NONE && this.gradient && this.gradient != wangConstants.NONE) {
      let start = this.fill;
      let end = this.gradient;
      let type = '0';
      let lookup = {
        east: 0,
        south: 1,
        west: 2,
        north: 3
      };
      let dir = this.direction != null ? lookup[this.direction] : 0;

      if (this.gradientDirection != null) {
        dir = wangUtils.mod(dir + lookup[this.gradientDirection] - 1, 4);
      }

      if (dir == 1) {
        type = '1';
        let tmp = start;
        start = end;
        end = tmp;
      } else if (dir == 2) {
        let tmp = start;
        start = end;
        end = tmp;
      } else if (dir == 3) {
        type = '1';
      }

      f +=
        'progid:DXImageTransform.Microsoft.gradient(' +
        "startColorStr='" +
        start +
        "', endColorStr='" +
        end +
        "', gradientType='" +
        type +
        "')";
    }

    node.style.filter = f;
  }

  updateHtmlColors(node) {
    let color = this.stroke;

    if (color != null && color != wangConstants.NONE) {
      node.style.borderColor = color;

      if (this.isDashed) {
        node.style.borderStyle = 'dashed';
      } else if (this.strokewidth > 0) {
        node.style.borderStyle = 'solid';
      }

      node.style.borderWidth = Math.max(1, Math.ceil(this.strokewidth * this.scale)) + 'px';
    } else {
      node.style.borderWidth = '0px';
    }

    color = this.outline ? null : this.fill;

    if (color != null && color != wangConstants.NONE) {
      node.style.backgroundColor = color;
      node.style.backgroundImage = 'none';
    } else if (this.pointerEvents) {
      node.style.backgroundColor = 'transparent';
    } else if (document.documentMode == 8) {
      wangUtils.addTransparentBackgroundFilter(node);
    } else {
      this.setTransparentBackgroundImage(node);
    }
  }

  updateHtmlBounds(node) {
    let sw = document.documentMode >= 9 ? 0 : Math.ceil(this.strokewidth * this.scale);
    node.style.borderWidth = Math.max(1, sw) + 'px';
    node.style.overflow = 'hidden';
    node.style.left = Math.round(this.bounds.x - sw / 2) + 'px';
    node.style.top = Math.round(this.bounds.y - sw / 2) + 'px';

    if (document.compatMode == 'CSS1Compat') {
      sw = -sw;
    }

    node.style.width = Math.round(Math.max(0, this.bounds.width + sw)) + 'px';
    node.style.height = Math.round(Math.max(0, this.bounds.height + sw)) + 'px';
  }

  destroyCanvas(canvas) {
    if (canvas instanceof wangSvgCanvas2D) {
      for (let key in canvas.gradients) {
        let gradient = canvas.gradients[key];

        if (gradient != null) {
          gradient.wangRefCount = (gradient.wangRefCount || 0) + 1;
        }
      }

      this.releaseSvgGradients(this.oldGradients);
      this.oldGradients = canvas.gradients;
    }
  }

  paint(c) {
    let strokeDrawn = false;

    if (c != null && this.outline) {
      let stroke = c.stroke;

      c.stroke = function () {
        strokeDrawn = true;
        stroke.apply(this, arguments);
      };

      let fillAndStroke = c.fillAndStroke;

      c.fillAndStroke = function () {
        strokeDrawn = true;
        fillAndStroke.apply(this, arguments);
      };
    }

    let s = this.scale;
    let x = this.bounds.x / s;
    let y = this.bounds.y / s;
    let w = this.bounds.width / s;
    let h = this.bounds.height / s;

    if (this.isPaintBoundsInverted()) {
      let t = (w - h) / 2;
      x += t;
      y -= t;
      let tmp = w;
      w = h;
      h = tmp;
    }

    this.updateTransform(c, x, y, w, h);
    this.configureCanvas(c, x, y, w, h);
    let bg = null;

    if (
      (this.stencil == null && this.points == null && this.shapePointerEvents) ||
      (this.stencil != null && this.stencilPointerEvents)
    ) {
      let bb = this.createBoundingBox();

      if (this.dialect == wangConstants.DIALECT_SVG) {
        bg = this.createTransparentSvgRectangle(bb.x, bb.y, bb.width, bb.height);
        this.node.appendChild(bg);
      } else {
        let rect = c.createRect('rect', bb.x / s, bb.y / s, bb.width / s, bb.height / s);
        rect.appendChild(c.createTransparentFill());
        rect.stroked = 'false';
        c.root.appendChild(rect);
      }
    }

    if (this.stencil != null) {
      this.stencil.drawShape(c, this, x, y, w, h);
    } else {
      c.setStrokeWidth(this.strokewidth);

      if (this.points != null) {
        let pts = [];

        for (let i = 0; i < this.points.length; i++) {
          if (this.points[i] != null) {
            pts.push(new wangPoint(this.points[i].x / s, this.points[i].y / s));
          }
        }

        this.paintEdgeShape(c, pts);
      } else {
        this.paintVertexShape(c, x, y, w, h);
      }
    }

    if (bg != null && c.state != null && c.state.transform != null) {
      bg.setAttribute('transform', c.state.transform);
    }

    if (c != null && this.outline && !strokeDrawn) {
      c.rect(x, y, w, h);
      c.stroke();
    }
  }

  configureCanvas(c, x, y, w, h) {
    let dash = null;

    if (this.style != null) {
      dash = this.style['dashPattern'];
    }

    c.setAlpha(this.opacity / 100);
    c.setFillAlpha(this.fillOpacity / 100);
    c.setStrokeAlpha(this.strokeOpacity / 100);

    if (this.isShadow != null) {
      c.setShadow(this.isShadow);
    }

    if (this.isDashed != null) {
      c.setDashed(
        this.isDashed,
        this.style != null ? wangUtils.getValue(this.style, wangConstants.STYLE_FIX_DASH, false) == 1 : false
      );
    }

    if (dash != null) {
      c.setDashPattern(dash);
    }

    if (this.fill != null && this.fill != wangConstants.NONE && this.gradient && this.gradient != wangConstants.NONE) {
      let b = this.getGradientBounds(c, x, y, w, h);
      c.setGradient(this.fill, this.gradient, b.x, b.y, b.width, b.height, this.gradientDirection);
    } else {
      c.setFillColor(this.fill);
    }

    c.setStrokeColor(this.stroke);
  }

  getGradientBounds(c, x, y, w, h) {
    return new wangRectangle(x, y, w, h);
  }

  updateTransform(c, x, y, w, h) {
    c.scale(this.scale);
    c.rotate(this.getShapeRotation(), this.flipH, this.flipV, x + w / 2, y + h / 2);
  }

  paintVertexShape(c, x, y, w, h) {
    this.paintBackground(c, x, y, w, h);

    if (
      !this.outline ||
      this.style == null ||
      wangUtils.getValue(this.style, wangConstants.STYLE_BACKGROUND_OUTLINE, 0) == 0
    ) {
      c.setShadow(false);
      this.paintForeground(c, x, y, w, h);
    }
  }

  paintBackground(c, x, y, w, h) {}

  paintForeground(c, x, y, w, h) {}

  paintEdgeShape(c, pts) {}

  getArcSize(w, h) {
    let r = 0;

    if (wangUtils.getValue(this.style, wangConstants.STYLE_ABSOLUTE_ARCSIZE, 0) == '1') {
      r = Math.min(
        w / 2,
        Math.min(h / 2, wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.LINE_ARCSIZE) / 2)
      );
    } else {
      let f =
        wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.RECTANGLE_ROUNDING_FACTOR * 100) / 100;
      r = Math.min(w * f, h * f);
    }

    return r;
  }

  paintGlassEffect(c, x, y, w, h, arc) {
    let sw = Math.ceil(this.strokewidth / 2);
    let size = 0.4;
    c.setGradient('#ffffff', '#ffffff', x, y, w, h * 0.6, 'south', 0.9, 0.1);
    c.begin();
    arc += 2 * sw;

    if (this.isRounded) {
      c.moveTo(x - sw + arc, y - sw);
      c.quadTo(x - sw, y - sw, x - sw, y - sw + arc);
      c.lineTo(x - sw, y + h * size);
      c.quadTo(x + w * 0.5, y + h * 0.7, x + w + sw, y + h * size);
      c.lineTo(x + w + sw, y - sw + arc);
      c.quadTo(x + w + sw, y - sw, x + w + sw - arc, y - sw);
    } else {
      c.moveTo(x - sw, y - sw);
      c.lineTo(x - sw, y + h * size);
      c.quadTo(x + w * 0.5, y + h * 0.7, x + w + sw, y + h * size);
      c.lineTo(x + w + sw, y - sw);
    }

    c.close();
    c.fill();
  }

  addPoints(c, pts, rounded, arcSize, close, exclude, initialMove) {
    if (pts != null && pts.length > 0) {
      initialMove = initialMove != null ? initialMove : true;
      let pe = pts[pts.length - 1];

      if (close && rounded) {
        pts = pts.slice();
        let p0 = pts[0];
        let wp = new wangPoint(pe.x + (p0.x - pe.x) / 2, pe.y + (p0.y - pe.y) / 2);
        pts.splice(0, 0, wp);
      }

      let pt = pts[0];
      let i = 1;

      if (initialMove) {
        c.moveTo(pt.x, pt.y);
      } else {
        c.lineTo(pt.x, pt.y);
      }

      while (i < (close ? pts.length : pts.length - 1)) {
        let tmp = pts[wangUtils.mod(i, pts.length)];
        let dx = pt.x - tmp.x;
        let dy = pt.y - tmp.y;

        if (rounded && (dx != 0 || dy != 0) && (exclude == null || wangUtils.indexOf(exclude, i - 1) < 0)) {
          let dist = Math.sqrt(dx * dx + dy * dy);
          let nx1 = (dx * Math.min(arcSize, dist / 2)) / dist;
          let ny1 = (dy * Math.min(arcSize, dist / 2)) / dist;
          let x1 = tmp.x + nx1;
          let y1 = tmp.y + ny1;
          c.lineTo(x1, y1);
          let next = pts[wangUtils.mod(i + 1, pts.length)];

          while (i < pts.length - 2 && Math.round(next.x - tmp.x) == 0 && Math.round(next.y - tmp.y) == 0) {
            next = pts[wangUtils.mod(i + 2, pts.length)];
            i++;
          }

          dx = next.x - tmp.x;
          dy = next.y - tmp.y;
          dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          let nx2 = (dx * Math.min(arcSize, dist / 2)) / dist;
          let ny2 = (dy * Math.min(arcSize, dist / 2)) / dist;
          let x2 = tmp.x + nx2;
          let y2 = tmp.y + ny2;
          c.quadTo(tmp.x, tmp.y, x2, y2);
          tmp = new wangPoint(x2, y2);
        } else {
          c.lineTo(tmp.x, tmp.y);
        }

        pt = tmp;
        i++;
      }

      if (close) {
        c.close();
      } else {
        c.lineTo(pe.x, pe.y);
      }
    }
  }

  resetStyles() {
    this.initStyles();
    this.spacing = 0;
    delete this.fill;
    delete this.gradient;
    delete this.gradientDirection;
    delete this.stroke;
    delete this.startSize;
    delete this.endSize;
    delete this.startArrow;
    delete this.endArrow;
    delete this.direction;
    delete this.isShadow;
    delete this.isDashed;
    delete this.isRounded;
    delete this.glass;
  }

  apply(state) {
    this.state = state;
    this.style = state.style;

    if (this.style != null) {
      this.fill = wangUtils.getValue(this.style, wangConstants.STYLE_FILLCOLOR, this.fill);
      this.gradient = wangUtils.getValue(this.style, wangConstants.STYLE_GRADIENTCOLOR, this.gradient);
      this.gradientDirection = wangUtils.getValue(
        this.style,
        wangConstants.STYLE_GRADIENT_DIRECTION,
        this.gradientDirection
      );
      this.opacity = wangUtils.getValue(this.style, wangConstants.STYLE_OPACITY, this.opacity);
      this.fillOpacity = wangUtils.getValue(this.style, wangConstants.STYLE_FILL_OPACITY, this.fillOpacity);
      this.strokeOpacity = wangUtils.getValue(this.style, wangConstants.STYLE_STROKE_OPACITY, this.strokeOpacity);
      this.stroke = wangUtils.getValue(this.style, wangConstants.STYLE_STROKECOLOR, this.stroke);
      this.strokewidth = wangUtils.getNumber(this.style, wangConstants.STYLE_STROKEWIDTH, this.strokewidth);
      this.spacing = wangUtils.getValue(this.style, wangConstants.STYLE_SPACING, this.spacing);
      this.startSize = wangUtils.getNumber(this.style, wangConstants.STYLE_STARTSIZE, this.startSize);
      this.endSize = wangUtils.getNumber(this.style, wangConstants.STYLE_ENDSIZE, this.endSize);
      this.startArrow = wangUtils.getValue(this.style, wangConstants.STYLE_STARTARROW, this.startArrow);
      this.endArrow = wangUtils.getValue(this.style, wangConstants.STYLE_ENDARROW, this.endArrow);
      this.rotation = wangUtils.getValue(this.style, wangConstants.STYLE_ROTATION, this.rotation);
      this.direction = wangUtils.getValue(this.style, wangConstants.STYLE_DIRECTION, this.direction);
      this.flipH = wangUtils.getValue(this.style, wangConstants.STYLE_FLIPH, 0) == 1;
      this.flipV = wangUtils.getValue(this.style, wangConstants.STYLE_FLIPV, 0) == 1;

      if (this.stencil != null) {
        this.flipH = wangUtils.getValue(this.style, 'stencilFlipH', 0) == 1 || this.flipH;
        this.flipV = wangUtils.getValue(this.style, 'stencilFlipV', 0) == 1 || this.flipV;
      }

      if (this.direction == wangConstants.DIRECTION_NORTH || this.direction == wangConstants.DIRECTION_SOUTH) {
        let tmp = this.flipH;
        this.flipH = this.flipV;
        this.flipV = tmp;
      }

      this.isShadow = wangUtils.getValue(this.style, wangConstants.STYLE_SHADOW, this.isShadow) == 1;
      this.isDashed = wangUtils.getValue(this.style, wangConstants.STYLE_DASHED, this.isDashed) == 1;
      this.isRounded = wangUtils.getValue(this.style, wangConstants.STYLE_ROUNDED, this.isRounded) == 1;
      this.glass = wangUtils.getValue(this.style, wangConstants.STYLE_GLASS, this.glass) == 1;

      if (this.fill == wangConstants.NONE) {
        this.fill = null;
      }

      if (this.gradient == wangConstants.NONE) {
        this.gradient = null;
      }

      if (this.stroke == wangConstants.NONE) {
        this.stroke = null;
      }
    }
  }

  setCursor(cursor) {
    if (cursor == null) {
      cursor = '';
    }

    this.cursor = cursor;

    if (this.node != null) {
      this.node.style.cursor = cursor;
    }
  }

  getCursor() {
    return this.cursor;
  }

  isRoundable() {
    return false;
  }

  updateBoundingBox() {
    if (this.useSvgBoundingBox && this.node != null && this.node.ownerSVGElement != null) {
      try {
        let b = this.node.getBBox();

        if (b.width > 0 && b.height > 0) {
          this.boundingBox = new wangRectangle(b.x, b.y, b.width, b.height);
          this.boundingBox.grow((this.strokewidth * this.scale) / 2);
          return;
        }
      } catch (e) {
        /* ignore */
      }
    }

    if (this.bounds != null) {
      let bbox = this.createBoundingBox();

      if (bbox != null) {
        this.augmentBoundingBox(bbox);
        let rot = this.getShapeRotation();

        if (rot != 0) {
          bbox = wangUtils.getBoundingBox(bbox, rot);
        }
      }

      this.boundingBox = bbox;
    }
  }

  createBoundingBox() {
    let bb = this.bounds.clone();

    if (
      (this.stencil != null &&
        (this.direction == wangConstants.DIRECTION_NORTH || this.direction == wangConstants.DIRECTION_SOUTH)) ||
      this.isPaintBoundsInverted()
    ) {
      bb.rotate90();
    }

    return bb;
  }

  augmentBoundingBox(bbox) {
    if (this.isShadow) {
      bbox.width += Math.ceil(wangConstants.SHADOW_OFFSET_X * this.scale);
      bbox.height += Math.ceil(wangConstants.SHADOW_OFFSET_Y * this.scale);
    }

    bbox.grow((this.strokewidth * this.scale) / 2);
  }

  isPaintBoundsInverted() {
    return (
      this.stencil == null &&
      (this.direction == wangConstants.DIRECTION_NORTH || this.direction == wangConstants.DIRECTION_SOUTH)
    );
  }

  getRotation() {
    return this.rotation != null ? this.rotation : 0;
  }

  getTextRotation() {
    let rot = this.getRotation();

    if (wangUtils.getValue(this.style, wangConstants.STYLE_HORIZONTAL, 1) != 1) {
      rot += this.verticalTextRotation;
    }

    return rot;
  }

  getShapeRotation() {
    let rot = this.getRotation();

    if (this.direction != null) {
      if (this.direction == wangConstants.DIRECTION_NORTH) {
        rot += 270;
      } else if (this.direction == wangConstants.DIRECTION_WEST) {
        rot += 180;
      } else if (this.direction == wangConstants.DIRECTION_SOUTH) {
        rot += 90;
      }
    }

    return rot;
  }

  createTransparentSvgRectangle(x, y, w, h) {
    let rect = document.createElementNS(wangConstants.NS_SVG, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', 'none');
    rect.setAttribute('pointer-events', 'all');
    return rect;
  }

  setTransparentBackgroundImage(node) {
    node.style.backgroundImage = "url('" + wangClient.imageBasePath + "/transparent.gif')";
  }

  releaseSvgGradients(grads) {
    if (grads != null) {
      for (let key in grads) {
        let gradient = grads[key];

        if (gradient != null) {
          gradient.wangRefCount = (gradient.wangRefCount || 0) - 1;

          if (gradient.wangRefCount == 0 && gradient.parentNode != null) {
            gradient.parentNode.removeChild(gradient);
          }
        }
      }
    }
  }

  destroy() {
    if (this.node != null) {
      wangEvent.release(this.node);

      if (this.node.parentNode != null) {
        this.node.parentNode.removeChild(this.node);
      }

      this.node = null;
    }

    this.releaseSvgGradients(this.oldGradients);
    this.oldGradients = null;
  }
}
