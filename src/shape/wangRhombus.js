import { wangShape } from '@wangGraph/shape/wangShape';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangRhombus extends wangShape {
  constructor(bounds, fill, stroke, strokewidth) {
    super();
    this.bounds = bounds;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
  }

  isRoundable() {
    return true;
  }

  paintVertexShape(c, x, y, w, h) {
    let hw = w / 2;
    let hh = h / 2;
    let arcSize = wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.LINE_ARCSIZE) / 2;
    c.begin();
    this.addPoints(
      c,
      [new wangPoint(x + hw, y), new wangPoint(x + w, y + hh), new wangPoint(x + hw, y + h), new wangPoint(x, y + hh)],
      this.isRounded,
      arcSize,
      true
    );
    c.fillAndStroke();
  }
}
