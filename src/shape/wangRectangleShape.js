import { wangShape } from '@wangGraph/shape/wangShape';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangRectangleShape extends wangShape {
  constructor(bounds, fill, stroke, strokewidth) {
    super();
    this.bounds = bounds;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
  }

  isHtmlAllowed() {
    let events = true;

    if (this.style != null) {
      events = wangUtils.getValue(this.style, wangConstants.STYLE_POINTER_EVENTS, '1') == '1';
    }

    return (
      !this.isRounded &&
      !this.glass &&
      this.rotation == 0 &&
      (events || (this.fill != null && this.fill != wangConstants.NONE))
    );
  }

  paintBackground(c, x, y, w, h) {
    let events = true;

    if (this.style != null) {
      events = wangUtils.getValue(this.style, wangConstants.STYLE_POINTER_EVENTS, '1') == '1';
    }

    if (
      events ||
      (this.fill != null && this.fill != wangConstants.NONE) ||
      (this.stroke != null && this.stroke != wangConstants.NONE)
    ) {
      if (!events && (this.fill == null || this.fill == wangConstants.NONE)) {
        c.pointerEvents = false;
      }

      if (this.isRounded) {
        let r = 0;

        if (wangUtils.getValue(this.style, wangConstants.STYLE_ABSOLUTE_ARCSIZE, 0) == '1') {
          r = Math.min(
            w / 2,
            Math.min(h / 2, wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.LINE_ARCSIZE) / 2)
          );
        } else {
          let f =
            wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.RECTANGLE_ROUNDING_FACTOR * 100) /
            100;
          r = Math.min(w * f, h * f);
        }

        c.roundrect(x, y, w, h, r, r);
      } else {
        c.rect(x, y, w, h);
      }

      c.fillAndStroke();
    }
  }

  isRoundable(c, x, y, w, h) {
    return true;
  }

  paintForeground(c, x, y, w, h) {
    if (this.glass && !this.outline && this.fill != null && this.fill != wangConstants.NONE) {
      this.paintGlassEffect(c, x, y, w, h, this.getArcSize(w + this.strokewidth, h + this.strokewidth));
    }
  }
}
