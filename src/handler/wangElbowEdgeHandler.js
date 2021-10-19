import { wangEdgeHandler } from '@wangGraph/handler/wangEdgeHandler';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangEdgeStyle } from '@wangGraph/view/wangEdgeStyle';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangClient } from '@wangGraph/wangClient';

export class wangElbowEdgeHandler extends wangEdgeHandler {
  flipEnabled = true;
  doubleClickOrientationResource = wangClient.language != 'none' ? 'doubleClickOrientation' : '';

  constructor(state) {
    super(state);
  }

  createBends() {
    let bends = [];
    let bend = this.createHandleShape(0);
    this.initBend(bend);
    bend.setCursor(wangConstants.CURSOR_TERMINAL_HANDLE);
    bends.push(bend);
    bends.push(
      this.createVirtualBend((evt) => {
        if (!wangEvent.isConsumed(evt) && this.flipEnabled) {
          this.graph.flipEdge(this.state.cell, evt);
          wangEvent.consume(evt);
        }
      })
    );
    this.points.push(new wangPoint(0, 0));
    bend = this.createHandleShape(2);
    this.initBend(bend);
    bend.setCursor(wangConstants.CURSOR_TERMINAL_HANDLE);
    bends.push(bend);
    return bends;
  }

  createVirtualBend(dblClickHandler) {
    let bend = this.createHandleShape();
    this.initBend(bend, dblClickHandler);
    bend.setCursor(this.getCursorForBend());

    if (!this.graph.isCellBendable(this.state.cell)) {
      bend.node.style.display = 'none';
    }

    return bend;
  }

  getCursorForBend() {
    return this.state.style[wangConstants.STYLE_EDGE] == wangEdgeStyle.TopToBottom ||
      this.state.style[wangConstants.STYLE_EDGE] == wangConstants.EDGESTYLE_TOPTOBOTTOM ||
      ((this.state.style[wangConstants.STYLE_EDGE] == wangEdgeStyle.ElbowConnector ||
        this.state.style[wangConstants.STYLE_EDGE] == wangConstants.EDGESTYLE_ELBOW) &&
        this.state.style[wangConstants.STYLE_ELBOW] == wangConstants.ELBOW_VERTICAL)
      ? 'row-resize'
      : 'col-resize';
  }

  getTooltipForNode(node) {
    let tip = null;

    if (
      this.bends != null &&
      this.bends[1] != null &&
      (node == this.bends[1].node || node.parentNode == this.bends[1].node)
    ) {
      tip = this.doubleClickOrientationResource;
      tip = wangResources.get(tip) || tip;
    }

    return tip;
  }

  convertPoint(point, gridEnabled) {
    let scale = this.graph.getView().getScale();
    let tr = this.graph.getView().getTranslate();
    let origin = this.state.origin;

    if (gridEnabled) {
      point.x = this.graph.snap(point.x);
      point.y = this.graph.snap(point.y);
    }

    point.x = Math.round(point.x / scale - tr.x - origin.x);
    point.y = Math.round(point.y / scale - tr.y - origin.y);
    return point;
  }

  redrawInnerBends(p0, pe) {
    let g = this.graph.getModel().getGeometry(this.state.cell);
    let pts = this.state.absolutePoints;
    let pt = null;

    if (pts.length > 1) {
      p0 = pts[1];
      pe = pts[pts.length - 2];
    } else if (g.points != null && g.points.length > 0) {
      pt = pts[0];
    }

    if (pt == null) {
      pt = new wangPoint(p0.x + (pe.x - p0.x) / 2, p0.y + (pe.y - p0.y) / 2);
    } else {
      pt = new wangPoint(
        this.graph.getView().scale * (pt.x + this.graph.getView().translate.x + this.state.origin.x),
        this.graph.getView().scale * (pt.y + this.graph.getView().translate.y + this.state.origin.y)
      );
    }

    let b = this.bends[1].bounds;
    let w = b.width;
    let h = b.height;
    let bounds = new wangRectangle(Math.round(pt.x - w / 2), Math.round(pt.y - h / 2), w, h);

    if (this.manageLabelHandle) {
      this.checkLabelHandle(bounds);
    } else if (
      this.handleImage == null &&
      this.labelShape.visible &&
      wangUtils.intersects(bounds, this.labelShape.bounds)
    ) {
      w = wangConstants.HANDLE_SIZE + 3;
      h = wangConstants.HANDLE_SIZE + 3;
      bounds = new wangRectangle(Math.floor(pt.x - w / 2), Math.floor(pt.y - h / 2), w, h);
    }

    this.bends[1].bounds = bounds;
    this.bends[1].redraw();

    if (this.manageLabelHandle) {
      this.checkLabelHandle(this.bends[1].bounds);
    }
  }
}
