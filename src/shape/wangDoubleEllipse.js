import { wangShape } from '@wangGraph/shape/wangShape';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangDoubleEllipse extends wangShape {
  vmlScale = 10;

  constructor(bounds, fill, stroke, strokewidth) {
    super();
    this.bounds = bounds;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
  }

  paintBackground(c, x, y, w, h) {
    c.ellipse(x, y, w, h);
    c.fillAndStroke();
  }

  paintForeground(c, x, y, w, h) {
    if (!this.outline) {
      let margin = wangUtils.getValue(
        this.style,
        wangConstants.STYLE_MARGIN,
        Math.min(3 + this.strokewidth, Math.min(w / 5, h / 5))
      );
      x += margin;
      y += margin;
      w -= 2 * margin;
      h -= 2 * margin;

      if (w > 0 && h > 0) {
        c.ellipse(x, y, w, h);
      }

      c.stroke();
    }
  }

  getLabelBounds(rect) {
    let margin =
      wangUtils.getValue(
        this.style,
        wangConstants.STYLE_MARGIN,
        Math.min(3 + this.strokewidth, Math.min(rect.width / 5 / this.scale, rect.height / 5 / this.scale))
      ) * this.scale;
    return new wangRectangle(rect.x + margin, rect.y + margin, rect.width - 2 * margin, rect.height - 2 * margin);
  }
}
