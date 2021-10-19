import { wangAbstractCanvas2D } from '@wangGraph/util/wangAbstractCanvas2D';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangXmlCanvas2D extends wangAbstractCanvas2D {
  textEnabled = true;
  compressed = true;

  constructor(root) {
    super();
    this.root = root;
    this.writeDefaults();
  }

  writeDefaults() {
    let elem;
    elem = this.createElement('fontfamily');
    elem.setAttribute('family', wangConstants.DEFAULT_FONTFAMILY);
    this.root.appendChild(elem);
    elem = this.createElement('fontsize');
    elem.setAttribute('size', wangConstants.DEFAULT_FONTSIZE);
    this.root.appendChild(elem);
    elem = this.createElement('shadowcolor');
    elem.setAttribute('color', wangConstants.SHADOWCOLOR);
    this.root.appendChild(elem);
    elem = this.createElement('shadowalpha');
    elem.setAttribute('alpha', wangConstants.SHADOW_OPACITY);
    this.root.appendChild(elem);
    elem = this.createElement('shadowoffset');
    elem.setAttribute('dx', wangConstants.SHADOW_OFFSET_X);
    elem.setAttribute('dy', wangConstants.SHADOW_OFFSET_Y);
    this.root.appendChild(elem);
  }

  format(value) {
    return parseFloat(parseFloat(value).toFixed(2));
  }

  createElement(name) {
    return this.root.ownerDocument.createElement(name);
  }

  save() {
    if (this.compressed) {
      super.save();
    }

    this.root.appendChild(this.createElement('save'));
  }

  restore() {
    if (this.compressed) {
      super.restore();
    }

    this.root.appendChild(this.createElement('restore'));
  }

  scale(value) {
    let elem = this.createElement('scale');
    elem.setAttribute('scale', value);
    this.root.appendChild(elem);
  }

  translate(dx, dy) {
    let elem = this.createElement('translate');
    elem.setAttribute('dx', this.format(dx));
    elem.setAttribute('dy', this.format(dy));
    this.root.appendChild(elem);
  }

  rotate(theta, flipH, flipV, cx, cy) {
    let elem = this.createElement('rotate');

    if (theta != 0 || flipH || flipV) {
      elem.setAttribute('theta', this.format(theta));
      elem.setAttribute('flipH', flipH ? '1' : '0');
      elem.setAttribute('flipV', flipV ? '1' : '0');
      elem.setAttribute('cx', this.format(cx));
      elem.setAttribute('cy', this.format(cy));
      this.root.appendChild(elem);
    }
  }

  setAlpha(value) {
    if (this.compressed) {
      if (this.state.alpha == value) {
        return;
      }

      super.setAlpha(value);
    }

    let elem = this.createElement('alpha');
    elem.setAttribute('alpha', this.format(value));
    this.root.appendChild(elem);
  }

  setFillAlpha(value) {
    if (this.compressed) {
      if (this.state.fillAlpha == value) {
        return;
      }

      super.setFillAlpha(value);
    }

    let elem = this.createElement('fillalpha');
    elem.setAttribute('alpha', this.format(value));
    this.root.appendChild(elem);
  }

  setStrokeAlpha(value) {
    if (this.compressed) {
      if (this.state.strokeAlpha == value) {
        return;
      }

      super.setStrokeAlpha(value);
    }

    let elem = this.createElement('strokealpha');
    elem.setAttribute('alpha', this.format(value));
    this.root.appendChild(elem);
  }

  setFillColor(value) {
    if (value == wangConstants.NONE) {
      value = null;
    }

    if (this.compressed) {
      if (this.state.fillColor == value) {
        return;
      }

      super.setFillColor(value);
    }

    let elem = this.createElement('fillcolor');
    elem.setAttribute('color', value != null ? value : wangConstants.NONE);
    this.root.appendChild(elem);
  }

  setGradient(color1, color2, x, y, w, h, direction, alpha1, alpha2) {
    if (color1 != null && color2 != null) {
      super.setGradient(color1, color2, x, y, w, h, direction, alpha1, alpha2);
      let elem = this.createElement('gradient');
      elem.setAttribute('c1', color1);
      elem.setAttribute('c2', color2);
      elem.setAttribute('x', this.format(x));
      elem.setAttribute('y', this.format(y));
      elem.setAttribute('w', this.format(w));
      elem.setAttribute('h', this.format(h));

      if (direction != null) {
        elem.setAttribute('direction', direction);
      }

      if (alpha1 != null) {
        elem.setAttribute('alpha1', alpha1);
      }

      if (alpha2 != null) {
        elem.setAttribute('alpha2', alpha2);
      }

      this.root.appendChild(elem);
    }
  }

  setStrokeColor(value) {
    if (value == wangConstants.NONE) {
      value = null;
    }

    if (this.compressed) {
      if (this.state.strokeColor == value) {
        return;
      }

      super.setStrokeColor(value);
    }

    let elem = this.createElement('strokecolor');
    elem.setAttribute('color', value != null ? value : wangConstants.NONE);
    this.root.appendChild(elem);
  }

  setStrokeWidth(value) {
    if (this.compressed) {
      if (this.state.strokeWidth == value) {
        return;
      }

      super.setStrokeWidth(value);
    }

    let elem = this.createElement('strokewidth');
    elem.setAttribute('width', this.format(value));
    this.root.appendChild(elem);
  }

  setDashed(value, fixDash) {
    if (this.compressed) {
      if (this.state.dashed == value) {
        return;
      }

      super.setDashed(value, fixDash);
    }

    let elem = this.createElement('dashed');
    elem.setAttribute('dashed', value ? '1' : '0');

    if (fixDash != null) {
      elem.setAttribute('fixDash', fixDash ? '1' : '0');
    }

    this.root.appendChild(elem);
  }

  setDashPattern(value) {
    if (this.compressed) {
      if (this.state.dashPattern == value) {
        return;
      }

      super.setDashPattern(value);
    }

    let elem = this.createElement('dashpattern');
    elem.setAttribute('pattern', value);
    this.root.appendChild(elem);
  }

  setLineCap(value) {
    if (this.compressed) {
      if (this.state.lineCap == value) {
        return;
      }

      super.setLineCap(value);
    }

    let elem = this.createElement('linecap');
    elem.setAttribute('cap', value);
    this.root.appendChild(elem);
  }

  setLineJoin(value) {
    if (this.compressed) {
      if (this.state.lineJoin == value) {
        return;
      }

      super.setLineJoin(value);
    }

    let elem = this.createElement('linejoin');
    elem.setAttribute('join', value);
    this.root.appendChild(elem);
  }

  setMiterLimit(value) {
    if (this.compressed) {
      if (this.state.miterLimit == value) {
        return;
      }

      super.setMiterLimit(value);
    }

    let elem = this.createElement('miterlimit');
    elem.setAttribute('limit', value);
    this.root.appendChild(elem);
  }

  setFontColor(value) {
    if (this.textEnabled) {
      if (value == wangConstants.NONE) {
        value = null;
      }

      if (this.compressed) {
        if (this.state.fontColor == value) {
          return;
        }

        super.setFontColor(value);
      }

      let elem = this.createElement('fontcolor');
      elem.setAttribute('color', value != null ? value : wangConstants.NONE);
      this.root.appendChild(elem);
    }
  }

  setFontBackgroundColor(value) {
    if (this.textEnabled) {
      if (value == wangConstants.NONE) {
        value = null;
      }

      if (this.compressed) {
        if (this.state.fontBackgroundColor == value) {
          return;
        }

        super.setFontBackgroundColor(value);
      }

      let elem = this.createElement('fontbackgroundcolor');
      elem.setAttribute('color', value != null ? value : wangConstants.NONE);
      this.root.appendChild(elem);
    }
  }

  setFontBorderColor(value) {
    if (this.textEnabled) {
      if (value == wangConstants.NONE) {
        value = null;
      }

      if (this.compressed) {
        if (this.state.fontBorderColor == value) {
          return;
        }

        super.setFontBorderColor(value);
      }

      let elem = this.createElement('fontbordercolor');
      elem.setAttribute('color', value != null ? value : wangConstants.NONE);
      this.root.appendChild(elem);
    }
  }

  setFontSize(value) {
    if (this.textEnabled) {
      if (this.compressed) {
        if (this.state.fontSize == value) {
          return;
        }

        super.setFontSize(value);
      }

      let elem = this.createElement('fontsize');
      elem.setAttribute('size', value);
      this.root.appendChild(elem);
    }
  }

  setFontFamily(value) {
    if (this.textEnabled) {
      if (this.compressed) {
        if (this.state.fontFamily == value) {
          return;
        }

        super.setFontFamily(value);
      }

      let elem = this.createElement('fontfamily');
      elem.setAttribute('family', value);
      this.root.appendChild(elem);
    }
  }

  setFontStyle(value) {
    if (this.textEnabled) {
      if (value == null) {
        value = 0;
      }

      if (this.compressed) {
        if (this.state.fontStyle == value) {
          return;
        }

        super.setFontStyle(value);
      }

      let elem = this.createElement('fontstyle');
      elem.setAttribute('style', value);
      this.root.appendChild(elem);
    }
  }

  setShadow(value) {
    if (this.compressed) {
      if (this.state.shadow == value) {
        return;
      }

      super.setShadow(value);
    }

    let elem = this.createElement('shadow');
    elem.setAttribute('enabled', value ? '1' : '0');
    this.root.appendChild(elem);
  }

  setShadowColor(value) {
    if (this.compressed) {
      if (value == wangConstants.NONE) {
        value = null;
      }

      if (this.state.shadowColor == value) {
        return;
      }

      super.setShadowColor(value);
    }

    let elem = this.createElement('shadowcolor');
    elem.setAttribute('color', value != null ? value : wangConstants.NONE);
    this.root.appendChild(elem);
  }

  setShadowAlpha(value) {
    if (this.compressed) {
      if (this.state.shadowAlpha == value) {
        return;
      }

      super.setShadowAlpha(value);
    }

    let elem = this.createElement('shadowalpha');
    elem.setAttribute('alpha', value);
    this.root.appendChild(elem);
  }

  setShadowOffset(dx, dy) {
    if (this.compressed) {
      if (this.state.shadowDx == dx && this.state.shadowDy == dy) {
        return;
      }

      super.setShadowOffset(dx, dy);
    }

    let elem = this.createElement('shadowoffset');
    elem.setAttribute('dx', dx);
    elem.setAttribute('dy', dy);
    this.root.appendChild(elem);
  }

  rect(x, y, w, h) {
    let elem = this.createElement('rect');
    elem.setAttribute('x', this.format(x));
    elem.setAttribute('y', this.format(y));
    elem.setAttribute('w', this.format(w));
    elem.setAttribute('h', this.format(h));
    this.root.appendChild(elem);
  }

  roundrect(x, y, w, h, dx, dy) {
    let elem = this.createElement('roundrect');
    elem.setAttribute('x', this.format(x));
    elem.setAttribute('y', this.format(y));
    elem.setAttribute('w', this.format(w));
    elem.setAttribute('h', this.format(h));
    elem.setAttribute('dx', this.format(dx));
    elem.setAttribute('dy', this.format(dy));
    this.root.appendChild(elem);
  }

  ellipse(x, y, w, h) {
    let elem = this.createElement('ellipse');
    elem.setAttribute('x', this.format(x));
    elem.setAttribute('y', this.format(y));
    elem.setAttribute('w', this.format(w));
    elem.setAttribute('h', this.format(h));
    this.root.appendChild(elem);
  }

  image(x, y, w, h, src, aspect, flipH, flipV) {
    src = this.converter.convert(src);
    let elem = this.createElement('image');
    elem.setAttribute('x', this.format(x));
    elem.setAttribute('y', this.format(y));
    elem.setAttribute('w', this.format(w));
    elem.setAttribute('h', this.format(h));
    elem.setAttribute('src', src);
    elem.setAttribute('aspect', aspect ? '1' : '0');
    elem.setAttribute('flipH', flipH ? '1' : '0');
    elem.setAttribute('flipV', flipV ? '1' : '0');
    this.root.appendChild(elem);
  }

  begin() {
    this.root.appendChild(this.createElement('begin'));
    this.lastX = 0;
    this.lastY = 0;
  }

  moveTo(x, y) {
    let elem = this.createElement('move');
    elem.setAttribute('x', this.format(x));
    elem.setAttribute('y', this.format(y));
    this.root.appendChild(elem);
    this.lastX = x;
    this.lastY = y;
  }

  lineTo(x, y) {
    let elem = this.createElement('line');
    elem.setAttribute('x', this.format(x));
    elem.setAttribute('y', this.format(y));
    this.root.appendChild(elem);
    this.lastX = x;
    this.lastY = y;
  }

  quadTo(x1, y1, x2, y2) {
    let elem = this.createElement('quad');
    elem.setAttribute('x1', this.format(x1));
    elem.setAttribute('y1', this.format(y1));
    elem.setAttribute('x2', this.format(x2));
    elem.setAttribute('y2', this.format(y2));
    this.root.appendChild(elem);
    this.lastX = x2;
    this.lastY = y2;
  }

  curveTo(x1, y1, x2, y2, x3, y3) {
    let elem = this.createElement('curve');
    elem.setAttribute('x1', this.format(x1));
    elem.setAttribute('y1', this.format(y1));
    elem.setAttribute('x2', this.format(x2));
    elem.setAttribute('y2', this.format(y2));
    elem.setAttribute('x3', this.format(x3));
    elem.setAttribute('y3', this.format(y3));
    this.root.appendChild(elem);
    this.lastX = x3;
    this.lastY = y3;
  }

  close() {
    this.root.appendChild(this.createElement('close'));
  }

  text(x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation, dir) {
    if (this.textEnabled && str != null) {
      if (wangUtils.isNode(str)) {
        str = wangUtils.getOuterHtml(str);
      }

      let elem = this.createElement('text');
      elem.setAttribute('x', this.format(x));
      elem.setAttribute('y', this.format(y));
      elem.setAttribute('w', this.format(w));
      elem.setAttribute('h', this.format(h));
      elem.setAttribute('str', str);

      if (align != null) {
        elem.setAttribute('align', align);
      }

      if (valign != null) {
        elem.setAttribute('valign', valign);
      }

      elem.setAttribute('wrap', wrap ? '1' : '0');

      if (format == null) {
        format = '';
      }

      elem.setAttribute('format', format);

      if (overflow != null) {
        elem.setAttribute('overflow', overflow);
      }

      if (clip != null) {
        elem.setAttribute('clip', clip ? '1' : '0');
      }

      if (rotation != null) {
        elem.setAttribute('rotation', rotation);
      }

      if (dir != null) {
        elem.setAttribute('dir', dir);
      }

      this.root.appendChild(elem);
    }
  }

  stroke() {
    this.root.appendChild(this.createElement('stroke'));
  }

  fill() {
    this.root.appendChild(this.createElement('fill'));
  }

  fillAndStroke() {
    this.root.appendChild(this.createElement('fillstroke'));
  }
}
