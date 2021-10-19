import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangCellOverlay extends wangEventSource {
  defaultOverlap = 0.5;

  constructor(image, tooltip, align, verticalAlign, offset, cursor) {
    super();
    this.image = image;
    this.tooltip = tooltip;
    this.align = align != null ? align : this.align;
    this.verticalAlign = verticalAlign != null ? verticalAlign : this.verticalAlign;
    this.offset = offset != null ? offset : new wangPoint();
    this.cursor = cursor != null ? cursor : 'help';
  }

  getBounds(state) {
    let isEdge = state.view.graph.getModel().isEdge(state.cell);
    let s = state.view.scale;
    let pt = null;
    let w = this.image.width;
    let h = this.image.height;

    if (isEdge) {
      let pts = state.absolutePoints;

      if (pts.length % 2 == 1) {
        pt = pts[Math.floor(pts.length / 2)];
      } else {
        let idx = pts.length / 2;
        let p0 = pts[idx - 1];
        let p1 = pts[idx];
        pt = new wangPoint(p0.x + (p1.x - p0.x) / 2, p0.y + (p1.y - p0.y) / 2);
      }
    } else {
      pt = new wangPoint();

      if (this.align == wangConstants.ALIGN_LEFT) {
        pt.x = state.x;
      } else if (this.align == wangConstants.ALIGN_CENTER) {
        pt.x = state.x + state.width / 2;
      } else {
        pt.x = state.x + state.width;
      }

      if (this.verticalAlign == wangConstants.ALIGN_TOP) {
        pt.y = state.y;
      } else if (this.verticalAlign == wangConstants.ALIGN_MIDDLE) {
        pt.y = state.y + state.height / 2;
      } else {
        pt.y = state.y + state.height;
      }
    }

    return new wangRectangle(
      Math.round(pt.x - (w * this.defaultOverlap - this.offset.x) * s),
      Math.round(pt.y - (h * this.defaultOverlap - this.offset.y) * s),
      w * s,
      h * s
    );
  }

  toString() {
    return this.tooltip;
  }
}
