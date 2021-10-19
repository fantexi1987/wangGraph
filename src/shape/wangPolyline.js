import { wangShape } from '@wangGraph/shape/wangShape';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangPolyline extends wangShape {
  constructor(points, stroke, strokewidth) {
    super();
    this.points = points;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
  }

  getRotation() {
    return 0;
  }

  getShapeRotation() {
    return 0;
  }

  isPaintBoundsInverted() {
    return false;
  }

  paintEdgeShape(c, pts) {
    let prev = c.pointerEventsValue;
    c.pointerEventsValue = 'stroke';

    if (this.style == null || this.style[wangConstants.STYLE_CURVED] != 1) {
      this.paintLine(c, pts, this.isRounded);
    } else {
      this.paintCurvedLine(c, pts);
    }

    c.pointerEventsValue = prev;
  }

  paintLine(c, pts, rounded) {
    let arcSize = wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.LINE_ARCSIZE) / 2;
    c.begin();
    this.addPoints(c, pts, rounded, arcSize, false);
    c.stroke();
  }

  paintCurvedLine(c, pts) {
    c.begin();
    let pt = pts[0];
    let n = pts.length;
    c.moveTo(pt.x, pt.y);

    for (let i = 1; i < n - 2; i++) {
      let p0 = pts[i];
      let p1 = pts[i + 1];
      let ix = (p0.x + p1.x) / 2;
      let iy = (p0.y + p1.y) / 2;
      c.quadTo(p0.x, p0.y, ix, iy);
    }

    let p0 = pts[n - 2];
    let p1 = pts[n - 1];
    c.quadTo(p0.x, p0.y, p1.x, p1.y);
    c.stroke();
  }
}
