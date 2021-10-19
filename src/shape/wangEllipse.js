import { wangShape } from '@wangGraph/shape/wangShape';

export class wangEllipse extends wangShape {
  constructor(bounds, fill, stroke, strokewidth) {
    super();
    this.bounds = bounds;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
  }

  paintVertexShape(c, x, y, w, h) {
    c.ellipse(x, y, w, h);
    c.fillAndStroke();
  }
}
