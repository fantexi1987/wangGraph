import { wangShape } from '@wangGraph/shape/wangShape';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangSwimlane extends wangShape {
  imageSize = 16;

  constructor(bounds, fill, stroke, strokewidth) {
    super();
    this.bounds = bounds;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
  }

  isRoundable(c, x, y, w, h) {
    return true;
  }

  getTitleSize() {
    return Math.max(0, wangUtils.getValue(this.style, wangConstants.STYLE_STARTSIZE, wangConstants.DEFAULT_STARTSIZE));
  }

  getLabelBounds(rect) {
    let start = this.getTitleSize();
    let bounds = new wangRectangle(rect.x, rect.y, rect.width, rect.height);
    let horizontal = this.isHorizontal();
    let flipH = wangUtils.getValue(this.style, wangConstants.STYLE_FLIPH, 0) == 1;
    let flipV = wangUtils.getValue(this.style, wangConstants.STYLE_FLIPV, 0) == 1;
    let shapeVertical = this.direction == wangConstants.DIRECTION_NORTH || this.direction == wangConstants.DIRECTION_SOUTH;
    let realHorizontal = horizontal == !shapeVertical;
    let realFlipH =
      !realHorizontal &&
      flipH != (this.direction == wangConstants.DIRECTION_SOUTH || this.direction == wangConstants.DIRECTION_WEST);
    let realFlipV =
      realHorizontal &&
      flipV != (this.direction == wangConstants.DIRECTION_SOUTH || this.direction == wangConstants.DIRECTION_WEST);

    if (!shapeVertical) {
      let tmp = Math.min(bounds.height, start * this.scale);

      if (realFlipH || realFlipV) {
        bounds.y += bounds.height - tmp;
      }

      bounds.height = tmp;
    } else {
      let tmp = Math.min(bounds.width, start * this.scale);

      if (realFlipH || realFlipV) {
        bounds.x += bounds.width - tmp;
      }

      bounds.width = tmp;
    }

    return bounds;
  }

  getGradientBounds(c, x, y, w, h) {
    let start = this.getTitleSize();

    if (this.isHorizontal()) {
      start = Math.min(start, h);
      return new wangRectangle(x, y, w, start);
    } else {
      start = Math.min(start, w);
      return new wangRectangle(x, y, start, h);
    }
  }

  getSwimlaneArcSize(w, h, start) {
    if (wangUtils.getValue(this.style, wangConstants.STYLE_ABSOLUTE_ARCSIZE, 0) == '1') {
      return Math.min(
        w / 2,
        Math.min(h / 2, wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.LINE_ARCSIZE) / 2)
      );
    } else {
      let f =
        wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.RECTANGLE_ROUNDING_FACTOR * 100) / 100;
      return start * f * 3;
    }
  }

  isHorizontal() {
    return wangUtils.getValue(this.style, wangConstants.STYLE_HORIZONTAL, 1) == 1;
  }

  paintVertexShape(c, x, y, w, h) {
    let start = this.getTitleSize();
    let fill = wangUtils.getValue(this.style, wangConstants.STYLE_SWIMLANE_FILLCOLOR, wangConstants.NONE);
    let swimlaneLine = wangUtils.getValue(this.style, wangConstants.STYLE_SWIMLANE_LINE, 1) == 1;
    let r = 0;

    if (this.isHorizontal()) {
      start = Math.min(start, h);
    } else {
      start = Math.min(start, w);
    }

    c.translate(x, y);

    if (!this.isRounded) {
      this.paintSwimlane(c, x, y, w, h, start, fill, swimlaneLine);
    } else {
      r = this.getSwimlaneArcSize(w, h, start);
      r = Math.min((this.isHorizontal() ? h : w) - start, Math.min(start, r));
      this.paintRoundedSwimlane(c, x, y, w, h, start, r, fill, swimlaneLine);
    }

    let sep = wangUtils.getValue(this.style, wangConstants.STYLE_SEPARATORCOLOR, wangConstants.NONE);
    this.paintSeparator(c, x, y, w, h, start, sep);

    if (this.image != null) {
      let bounds = this.getImageBounds(x, y, w, h);
      c.image(bounds.x - x, bounds.y - y, bounds.width, bounds.height, this.image, false, false, false);
    }

    if (this.glass) {
      c.setShadow(false);
      this.paintGlassEffect(c, 0, 0, w, start, r);
    }
  }

  paintSwimlane(c, x, y, w, h, start, fill, swimlaneLine) {
    c.begin();
    let events = true;

    if (this.style != null) {
      events = wangUtils.getValue(this.style, wangConstants.STYLE_POINTER_EVENTS, '1') == '1';
    }

    if (!events && (this.fill == null || this.fill == wangConstants.NONE)) {
      c.pointerEvents = false;
    }

    if (this.isHorizontal()) {
      c.moveTo(0, start);
      c.lineTo(0, 0);
      c.lineTo(w, 0);
      c.lineTo(w, start);
      c.fillAndStroke();

      if (start < h) {
        if (fill == wangConstants.NONE || !events) {
          c.pointerEvents = false;
        }

        if (fill != wangConstants.NONE) {
          c.setFillColor(fill);
        }

        c.begin();
        c.moveTo(0, start);
        c.lineTo(0, h);
        c.lineTo(w, h);
        c.lineTo(w, start);

        if (fill == wangConstants.NONE) {
          c.stroke();
        } else {
          c.fillAndStroke();
        }
      }
    } else {
      c.moveTo(start, 0);
      c.lineTo(0, 0);
      c.lineTo(0, h);
      c.lineTo(start, h);
      c.fillAndStroke();

      if (start < w) {
        if (fill == wangConstants.NONE || !events) {
          c.pointerEvents = false;
        }

        if (fill != wangConstants.NONE) {
          c.setFillColor(fill);
        }

        c.begin();
        c.moveTo(start, 0);
        c.lineTo(w, 0);
        c.lineTo(w, h);
        c.lineTo(start, h);

        if (fill == wangConstants.NONE) {
          c.stroke();
        } else {
          c.fillAndStroke();
        }
      }
    }

    if (swimlaneLine) {
      this.paintDivider(c, x, y, w, h, start, fill == wangConstants.NONE);
    }
  }

  paintRoundedSwimlane(c, x, y, w, h, start, r, fill, swimlaneLine) {
    c.begin();
    let events = true;

    if (this.style != null) {
      events = wangUtils.getValue(this.style, wangConstants.STYLE_POINTER_EVENTS, '1') == '1';
    }

    if (!events && (this.fill == null || this.fill == wangConstants.NONE)) {
      c.pointerEvents = false;
    }

    if (this.isHorizontal()) {
      c.moveTo(w, start);
      c.lineTo(w, r);
      c.quadTo(w, 0, w - Math.min(w / 2, r), 0);
      c.lineTo(Math.min(w / 2, r), 0);
      c.quadTo(0, 0, 0, r);
      c.lineTo(0, start);
      c.fillAndStroke();

      if (start < h) {
        if (fill == wangConstants.NONE || !events) {
          c.pointerEvents = false;
        }

        if (fill != wangConstants.NONE) {
          c.setFillColor(fill);
        }

        c.begin();
        c.moveTo(0, start);
        c.lineTo(0, h - r);
        c.quadTo(0, h, Math.min(w / 2, r), h);
        c.lineTo(w - Math.min(w / 2, r), h);
        c.quadTo(w, h, w, h - r);
        c.lineTo(w, start);

        if (fill == wangConstants.NONE) {
          c.stroke();
        } else {
          c.fillAndStroke();
        }
      }
    } else {
      c.moveTo(start, 0);
      c.lineTo(r, 0);
      c.quadTo(0, 0, 0, Math.min(h / 2, r));
      c.lineTo(0, h - Math.min(h / 2, r));
      c.quadTo(0, h, r, h);
      c.lineTo(start, h);
      c.fillAndStroke();

      if (start < w) {
        if (fill == wangConstants.NONE || !events) {
          c.pointerEvents = false;
        }

        if (fill != wangConstants.NONE) {
          c.setFillColor(fill);
        }

        c.begin();
        c.moveTo(start, h);
        c.lineTo(w - r, h);
        c.quadTo(w, h, w, h - Math.min(h / 2, r));
        c.lineTo(w, Math.min(h / 2, r));
        c.quadTo(w, 0, w - r, 0);
        c.lineTo(start, 0);

        if (fill == wangConstants.NONE) {
          c.stroke();
        } else {
          c.fillAndStroke();
        }
      }
    }

    if (swimlaneLine) {
      this.paintDivider(c, x, y, w, h, start, fill == wangConstants.NONE);
    }
  }

  paintDivider(c, x, y, w, h, start, shadow) {
    if (!shadow) {
      c.setShadow(false);
    }

    c.begin();

    if (this.isHorizontal()) {
      c.moveTo(0, start);
      c.lineTo(w, start);
    } else {
      c.moveTo(start, 0);
      c.lineTo(start, h);
    }

    c.stroke();
  }

  paintSeparator(c, x, y, w, h, start, color) {
    if (color != wangConstants.NONE) {
      c.setStrokeColor(color);
      c.setDashed(true);
      c.begin();

      if (this.isHorizontal()) {
        c.moveTo(w, start);
        c.lineTo(w, h);
      } else {
        c.moveTo(start, 0);
        c.lineTo(w, 0);
      }

      c.stroke();
      c.setDashed(false);
    }
  }

  getImageBounds(x, y, w, h) {
    if (this.isHorizontal()) {
      return new wangRectangle(x + w - this.imageSize, y, this.imageSize, this.imageSize);
    } else {
      return new wangRectangle(x, y, this.imageSize, this.imageSize);
    }
  }
}
