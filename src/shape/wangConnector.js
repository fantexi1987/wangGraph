import { wangPolyline } from '@wangGraph/shape/wangPolyline';
import { wangMarker } from '@wangGraph/shape/wangMarker';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangConnector extends wangPolyline {
  constructor(points, stroke, strokewidth) {
    super(points, stroke, strokewidth);
  }

  updateBoundingBox() {
    this.useSvgBoundingBox = this.style != null && this.style[wangConstants.STYLE_CURVED] == 1;
    super.updateBoundingBox();
  }

  paintEdgeShape(c, pts) {
    let sourceMarker = this.createMarker(c, pts, true);
    let targetMarker = this.createMarker(c, pts, false);
    super.paintEdgeShape(c, pts);
    c.setFillColor(this.stroke);
    c.setShadow(false);
    c.setDashed(false);

    if (sourceMarker != null) {
      sourceMarker();
    }

    if (targetMarker != null) {
      targetMarker();
    }
  }

  createMarker(c, pts, source) {
    let result = null;
    let n = pts.length;
    let type = wangUtils.getValue(this.style, source ? wangConstants.STYLE_STARTARROW : wangConstants.STYLE_ENDARROW);
    let p0 = source ? pts[1] : pts[n - 2];
    let pe = source ? pts[0] : pts[n - 1];

    if (type != null && p0 != null && pe != null) {
      let count = 1;

      while (count < n - 1 && Math.round(p0.x - pe.x) == 0 && Math.round(p0.y - pe.y) == 0) {
        p0 = source ? pts[1 + count] : pts[n - 2 - count];
        count++;
      }

      let dx = pe.x - p0.x;
      let dy = pe.y - p0.y;
      let dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      let unitX = dx / dist;
      let unitY = dy / dist;
      let size = wangUtils.getNumber(
        this.style,
        source ? wangConstants.STYLE_STARTSIZE : wangConstants.STYLE_ENDSIZE,
        wangConstants.DEFAULT_MARKERSIZE
      );
      let filled = this.style[source ? wangConstants.STYLE_STARTFILL : wangConstants.STYLE_ENDFILL] != 0;
      result = wangMarker.createMarker(c, this, type, pe, unitX, unitY, size, source, this.strokewidth, filled);
    }

    return result;
  }

  augmentBoundingBox(bbox) {
    super.augmentBoundingBox(bbox);
    let size = 0;

    if (wangUtils.getValue(this.style, wangConstants.STYLE_STARTARROW, wangConstants.NONE) != wangConstants.NONE) {
      size = wangUtils.getNumber(this.style, wangConstants.STYLE_STARTSIZE, wangConstants.DEFAULT_MARKERSIZE) + 1;
    }

    if (wangUtils.getValue(this.style, wangConstants.STYLE_ENDARROW, wangConstants.NONE) != wangConstants.NONE) {
      size =
        Math.max(size, wangUtils.getNumber(this.style, wangConstants.STYLE_ENDSIZE, wangConstants.DEFAULT_MARKERSIZE)) +
        1;
    }

    bbox.grow(size * this.scale);
  }
}
