import { wangShape } from '@wangGraph/shape/wangShape';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangArrowConnector extends wangShape {
  useSvgBoundingBox = true;

  constructor(points, fill, stroke, strokewidth, arrowWidth, spacing, endSize) {
    super();
    this.points = points;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
    this.arrowWidth = arrowWidth != null ? arrowWidth : wangConstants.ARROW_WIDTH;
    this.arrowSpacing = spacing != null ? spacing : wangConstants.ARROW_SPACING;
    this.startSize = wangConstants.ARROW_SIZE / 5;
    this.endSize = wangConstants.ARROW_SIZE / 5;
  }

  resetStyles() {
    super.resetStyles();
    this.arrowSpacing = wangConstants.ARROW_SPACING;
  }

  apply(state) {
    super.apply(state);

    if (this.style != null) {
      this.startSize = wangUtils.getNumber(this.style, wangConstants.STYLE_STARTSIZE, wangConstants.ARROW_SIZE / 5) * 3;
      this.endSize = wangUtils.getNumber(this.style, wangConstants.STYLE_ENDSIZE, wangConstants.ARROW_SIZE / 5) * 3;
    }
  }

  augmentBoundingBox(bbox) {
    super.augmentBoundingBox(bbox);
    let w = this.getEdgeWidth();

    if (this.isMarkerStart()) {
      w = Math.max(w, this.getStartArrowWidth());
    }

    if (this.isMarkerEnd()) {
      w = Math.max(w, this.getEndArrowWidth());
    }

    bbox.grow((w / 2 + this.strokewidth) * this.scale);
  }

  paintEdgeShape(c, pts) {
    let strokeWidth = this.strokewidth;

    if (this.outline) {
      strokeWidth = Math.max(1, wangUtils.getNumber(this.style, wangConstants.STYLE_STROKEWIDTH, this.strokewidth));
    }

    let startWidth = this.getStartArrowWidth() + strokeWidth;
    let endWidth = this.getEndArrowWidth() + strokeWidth;
    let edgeWidth = this.outline ? this.getEdgeWidth() + strokeWidth : this.getEdgeWidth();
    let openEnded = this.isOpenEnded();
    let markerStart = this.isMarkerStart();
    let markerEnd = this.isMarkerEnd();
    let spacing = openEnded ? 0 : this.arrowSpacing + strokeWidth / 2;
    let startSize = this.startSize + strokeWidth;
    let endSize = this.endSize + strokeWidth;
    let isRounded = this.isArrowRounded();
    let pe = pts[pts.length - 1];
    let i0 = 1;

    while (i0 < pts.length - 1 && pts[i0].x == pts[0].x && pts[i0].y == pts[0].y) {
      i0++;
    }

    let dx = pts[i0].x - pts[0].x;
    let dy = pts[i0].y - pts[0].y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist == 0) {
      return;
    }

    let nx = dx / dist;
    let nx2,
      nx1 = nx;
    let ny = dy / dist;
    let ny2,
      ny1 = ny;
    let orthx = edgeWidth * ny;
    let orthy = -edgeWidth * nx;
    let fns = [];

    if (isRounded) {
      c.setLineJoin('round');
    } else if (pts.length > 2) {
      c.setMiterLimit(1.42);
    }

    c.begin();
    let startNx = nx;
    let startNy = ny;

    if (markerStart && !openEnded) {
      this.paintMarker(c, pts[0].x, pts[0].y, nx, ny, startSize, startWidth, edgeWidth, spacing, true);
    } else {
      let outStartX = pts[0].x + orthx / 2 + spacing * nx;
      let outStartY = pts[0].y + orthy / 2 + spacing * ny;
      let inEndX = pts[0].x - orthx / 2 + spacing * nx;
      let inEndY = pts[0].y - orthy / 2 + spacing * ny;

      if (openEnded) {
        c.moveTo(outStartX, outStartY);
        fns.push(function () {
          c.lineTo(inEndX, inEndY);
        });
      } else {
        c.moveTo(inEndX, inEndY);
        c.lineTo(outStartX, outStartY);
      }
    }

    let dx1 = 0;
    let dy1 = 0;
    let dist1 = 0;

    for (let i = 0; i < pts.length - 2; i++) {
      let pos = wangUtils.relativeCcw(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, pts[i + 2].x, pts[i + 2].y);
      dx1 = pts[i + 2].x - pts[i + 1].x;
      dy1 = pts[i + 2].y - pts[i + 1].y;
      dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

      if (dist1 != 0) {
        nx1 = dx1 / dist1;
        ny1 = dy1 / dist1;
        let tmp1 = nx * nx1 + ny * ny1;
        let tmp = Math.max(Math.sqrt((tmp1 + 1) / 2), 0.04);
        nx2 = nx + nx1;
        ny2 = ny + ny1;
        let dist2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);

        if (dist2 != 0) {
          nx2 = nx2 / dist2;
          ny2 = ny2 / dist2;
          let strokeWidthFactor = Math.max(tmp, Math.min(this.strokewidth / 200 + 0.04, 0.35));
          let angleFactor = pos != 0 && isRounded ? Math.max(0.1, strokeWidthFactor) : Math.max(tmp, 0.06);
          let outX = pts[i + 1].x + (ny2 * edgeWidth) / 2 / angleFactor;
          let outY = pts[i + 1].y - (nx2 * edgeWidth) / 2 / angleFactor;
          let inX = pts[i + 1].x - (ny2 * edgeWidth) / 2 / angleFactor;
          let inY = pts[i + 1].y + (nx2 * edgeWidth) / 2 / angleFactor;

          if (pos == 0 || !isRounded) {
            c.lineTo(outX, outY);

            (function (x, y) {
              fns.push(function () {
                c.lineTo(x, y);
              });
            })(inX, inY);
          } else if (pos == -1) {
            let c1x = inX + ny * edgeWidth;
            let c1y = inY - nx * edgeWidth;
            let c2x = inX + ny1 * edgeWidth;
            let c2y = inY - nx1 * edgeWidth;
            c.lineTo(c1x, c1y);
            c.quadTo(outX, outY, c2x, c2y);

            (function (x, y) {
              fns.push(function () {
                c.lineTo(x, y);
              });
            })(inX, inY);
          } else {
            c.lineTo(outX, outY);

            (function (x, y) {
              let c1x = outX - ny * edgeWidth;
              let c1y = outY + nx * edgeWidth;
              let c2x = outX - ny1 * edgeWidth;
              let c2y = outY + nx1 * edgeWidth;
              fns.push(function () {
                c.quadTo(x, y, c1x, c1y);
              });
              fns.push(function () {
                c.lineTo(c2x, c2y);
              });
            })(inX, inY);
          }

          nx = nx1;
          ny = ny1;
        }
      }
    }

    orthx = edgeWidth * ny1;
    orthy = -edgeWidth * nx1;

    if (markerEnd && !openEnded) {
      this.paintMarker(c, pe.x, pe.y, -nx, -ny, endSize, endWidth, edgeWidth, spacing, false);
    } else {
      c.lineTo(pe.x - spacing * nx1 + orthx / 2, pe.y - spacing * ny1 + orthy / 2);
      let inStartX = pe.x - spacing * nx1 - orthx / 2;
      let inStartY = pe.y - spacing * ny1 - orthy / 2;

      if (!openEnded) {
        c.lineTo(inStartX, inStartY);
      } else {
        c.moveTo(inStartX, inStartY);
        fns.splice(0, 0, function () {
          c.moveTo(inStartX, inStartY);
        });
      }
    }

    for (let i = fns.length - 1; i >= 0; i--) {
      fns[i]();
    }

    if (openEnded) {
      c.end();
      c.stroke();
    } else {
      c.close();
      c.fillAndStroke();
    }

    c.setShadow(false);
    c.setMiterLimit(4);

    if (isRounded) {
      c.setLineJoin('flat');
    }

    if (pts.length > 2) {
      c.setMiterLimit(4);

      if (markerStart && !openEnded) {
        c.begin();
        this.paintMarker(c, pts[0].x, pts[0].y, startNx, startNy, startSize, startWidth, edgeWidth, spacing, true);
        c.stroke();
        c.end();
      }

      if (markerEnd && !openEnded) {
        c.begin();
        this.paintMarker(c, pe.x, pe.y, -nx, -ny, endSize, endWidth, edgeWidth, spacing, true);
        c.stroke();
        c.end();
      }
    }
  }

  paintMarker(c, ptX, ptY, nx, ny, size, arrowWidth, edgeWidth, spacing, initialMove) {
    let widthArrowRatio = edgeWidth / arrowWidth;
    let orthx = (edgeWidth * ny) / 2;
    let orthy = (-edgeWidth * nx) / 2;
    let spaceX = (spacing + size) * nx;
    let spaceY = (spacing + size) * ny;

    if (initialMove) {
      c.moveTo(ptX - orthx + spaceX, ptY - orthy + spaceY);
    } else {
      c.lineTo(ptX - orthx + spaceX, ptY - orthy + spaceY);
    }

    c.lineTo(ptX - orthx / widthArrowRatio + spaceX, ptY - orthy / widthArrowRatio + spaceY);
    c.lineTo(ptX + spacing * nx, ptY + spacing * ny);
    c.lineTo(ptX + orthx / widthArrowRatio + spaceX, ptY + orthy / widthArrowRatio + spaceY);
    c.lineTo(ptX + orthx + spaceX, ptY + orthy + spaceY);
  }

  isArrowRounded() {
    return this.isRounded;
  }

  getStartArrowWidth() {
    return wangConstants.ARROW_WIDTH;
  }

  getEndArrowWidth() {
    return wangConstants.ARROW_WIDTH;
  }

  getEdgeWidth() {
    return wangConstants.ARROW_WIDTH / 3;
  }

  isOpenEnded() {
    return false;
  }

  isMarkerStart() {
    return wangUtils.getValue(this.style, wangConstants.STYLE_STARTARROW, wangConstants.NONE) != wangConstants.NONE;
  }

  isMarkerEnd() {
    return wangUtils.getValue(this.style, wangConstants.STYLE_ENDARROW, wangConstants.NONE) != wangConstants.NONE;
  }
}
