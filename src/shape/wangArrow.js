import { wangShape } from '@wangGraph/shape/wangShape';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangArrow extends wangShape {
  constructor(points, fill, stroke, strokewidth, arrowWidth, spacing, endSize) {
    super();
    this.points = points;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
    this.arrowWidth = arrowWidth != null ? arrowWidth : wangConstants.ARROW_WIDTH;
    this.spacing = spacing != null ? spacing : wangConstants.ARROW_SPACING;
    this.endSize = endSize != null ? endSize : wangConstants.ARROW_SIZE;
  }

  augmentBoundingBox(bbox) {
    super.augmentBoundingBox(bbox);
    let w = Math.max(this.arrowWidth, this.endSize);
    bbox.grow((w / 2 + this.strokewidth) * this.scale);
  }

  paintEdgeShape(c, pts) {
    let spacing = wangConstants.ARROW_SPACING;
    let width = wangConstants.ARROW_WIDTH;
    let arrow = wangConstants.ARROW_SIZE;
    let p0 = pts[0];
    let pe = pts[pts.length - 1];
    let dx = pe.x - p0.x;
    let dy = pe.y - p0.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let length = dist - 2 * spacing - arrow;
    let nx = dx / dist;
    let ny = dy / dist;
    let basex = length * nx;
    let basey = length * ny;
    let floorx = (width * ny) / 3;
    let floory = (-width * nx) / 3;
    let p0x = p0.x - floorx / 2 + spacing * nx;
    let p0y = p0.y - floory / 2 + spacing * ny;
    let p1x = p0x + floorx;
    let p1y = p0y + floory;
    let p2x = p1x + basex;
    let p2y = p1y + basey;
    let p3x = p2x + floorx;
    let p3y = p2y + floory;
    let p5x = p3x - 3 * floorx;
    let p5y = p3y - 3 * floory;
    c.begin();
    c.moveTo(p0x, p0y);
    c.lineTo(p1x, p1y);
    c.lineTo(p2x, p2y);
    c.lineTo(p3x, p3y);
    c.lineTo(pe.x - spacing * nx, pe.y - spacing * ny);
    c.lineTo(p5x, p5y);
    c.lineTo(p5x + floorx, p5y + floory);
    c.close();
    c.fillAndStroke();
  }
}
