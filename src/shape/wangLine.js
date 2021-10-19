import { wangShape } from '@wangGraph/shape/wangShape';

export class wangLine extends wangShape {
  constructor(bounds, stroke, strokewidth, vertical) {
    super();
    this.bounds = bounds;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
    this.vertical = vertical != null ? vertical : this.vertical;
  }

  paintVertexShape(c, x, y, w, h) {
    c.begin();

    if (this.vertical) {
      let mid = x + w / 2;
      c.moveTo(mid, y);
      c.lineTo(mid, y + h);
    } else {
      let mid = y + h / 2;
      c.moveTo(x, mid);
      c.lineTo(x + w, mid);
    }

    c.stroke();
  }
}
