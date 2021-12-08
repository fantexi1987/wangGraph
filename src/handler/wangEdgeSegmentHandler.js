import { wangElbowEdgeHandler } from '@wangGraph/handler/wangElbowEdgeHandler';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangEdgeSegmentHandler extends wangElbowEdgeHandler {
  constructor(state) {
    super(state);
  }

  getCurrentPoints() {
    let pts = this.state.absolutePoints;

    if (pts != null) {
      let tol = Math.max(1, this.graph.view.scale);

      if (
        pts.length == 2 ||
        (pts.length == 3 &&
          ((Math.abs(pts[0].x - pts[1].x) < tol && Math.abs(pts[1].x - pts[2].x) < tol) ||
            (Math.abs(pts[0].y - pts[1].y) < tol && Math.abs(pts[1].y - pts[2].y) < tol)))
      ) {
        let cx = pts[0].x + (pts[pts.length - 1].x - pts[0].x) / 2;
        let cy = pts[0].y + (pts[pts.length - 1].y - pts[0].y) / 2;
        pts = [pts[0], new wangPoint(cx, cy), new wangPoint(cx, cy), pts[pts.length - 1]];
      }
    }

    return pts;
  }

  getPreviewPoints(point) {
    if (this.isSource || this.isTarget) {
      return super.getPreviewPoints(point);
    } else {
      let pts = this.getCurrentPoints();
      let last = this.convertPoint(pts[0].clone(), false);
      point = this.convertPoint(point.clone(), false);
      let result = [];

      for (let i = 1; i < pts.length; i++) {
        let pt = this.convertPoint(pts[i].clone(), false);

        if (i == this.index) {
          if (Math.round(last.x - pt.x) == 0) {
            last.x = point.x;
            pt.x = point.x;
          }

          if (Math.round(last.y - pt.y) == 0) {
            last.y = point.y;
            pt.y = point.y;
          }
        }

        if (i < pts.length - 1) {
          result.push(pt);
        }

        last = pt;
      }

      if (result.length == 1) {
        let source = this.state.getVisibleterminalState(true);
        let target = this.state.getVisibleterminalState(false);
        let scale = this.state.view.getScale();
        let tr = this.state.view.getTranslate();
        let x = result[0].x * scale + tr.x;
        let y = result[0].y * scale + tr.y;

        if (
          (source != null && wangUtils.contains(source, x, y)) ||
          (target != null && wangUtils.contains(target, x, y))
        ) {
          result = [point, point];
        }
      }

      return result;
    }
  }

  updatePreviewState(edge, point, terminalState, me) {
    super.updatePreviewState(edge, point, terminalState, me);

    if (!this.isSource && !this.isTarget) {
      point = this.convertPoint(point.clone(), false);
      let pts = edge.absolutePoints;
      let pt0 = pts[0];
      let pt1 = pts[1];
      let result = [];

      for (let i = 2; i < pts.length; i++) {
        let pt2 = pts[i];

        if (
          (Math.round(pt0.x - pt1.x) != 0 || Math.round(pt1.x - pt2.x) != 0) &&
          (Math.round(pt0.y - pt1.y) != 0 || Math.round(pt1.y - pt2.y) != 0)
        ) {
          result.push(this.convertPoint(pt1.clone(), false));
        }

        pt0 = pt1;
        pt1 = pt2;
      }

      let source = this.state.getVisibleterminalState(true);
      let target = this.state.getVisibleterminalState(false);
      let rpts = this.state.absolutePoints;

      if (
        result.length == 0 &&
        (Math.round(pts[0].x - pts[pts.length - 1].x) == 0 || Math.round(pts[0].y - pts[pts.length - 1].y) == 0)
      ) {
        result = [point, point];
      } else if (
        pts.length == 5 &&
        result.length == 2 &&
        source != null &&
        target != null &&
        rpts != null &&
        Math.round(rpts[0].x - rpts[rpts.length - 1].x) == 0
      ) {
        let view = this.graph.getView();
        let scale = view.getScale();
        let tr = view.getTranslate();
        let y0 = view.getRoutingCenterY(source) / scale - tr.y;
        let sc = this.graph.getConnectionConstraint(edge, source, true);

        if (sc != null) {
          let pt = this.graph.getConnectionPoint(source, sc);

          if (pt != null) {
            this.convertPoint(pt, false);
            y0 = pt.y;
          }
        }

        let ye = view.getRoutingCenterY(target) / scale - tr.y;
        let tc = this.graph.getConnectionConstraint(edge, target, false);

        if (tc) {
          let pt = this.graph.getConnectionPoint(target, tc);

          if (pt != null) {
            this.convertPoint(pt, false);
            ye = pt.y;
          }
        }

        result = [new wangPoint(point.x, y0), new wangPoint(point.x, ye)];
      }

      this.points = result;
      edge.view.updateFixedTerminalPoints(edge, source, target);
      edge.view.updatePoints(edge, this.points, source, target);
      edge.view.updateFloatingTerminalPoints(edge, source, target);
    }
  }

  connect(edge, terminal, isSource, isClone, me) {
    let model = this.graph.getModel();
    let geo = model.getGeometry(edge);
    let result = null;

    if (geo != null && geo.points != null && geo.points.length > 0) {
      let pts = this.abspoints;
      let pt0 = pts[0];
      let pt1 = pts[1];
      result = [];

      for (let i = 2; i < pts.length; i++) {
        let pt2 = pts[i];

        if (
          (Math.round(pt0.x - pt1.x) != 0 || Math.round(pt1.x - pt2.x) != 0) &&
          (Math.round(pt0.y - pt1.y) != 0 || Math.round(pt1.y - pt2.y) != 0)
        ) {
          result.push(this.convertPoint(pt1.clone(), false));
        }

        pt0 = pt1;
        pt1 = pt2;
      }
    }

    model.beginUpdate();

    try {
      if (result != null) {
        let geo = model.getGeometry(edge);

        if (geo != null) {
          geo = geo.clone();
          geo.points = result;
          model.setGeometry(edge, geo);
        }
      }

      edge = super.connect(edge, terminal, isSource, isClone, me);
    } finally {
      model.endUpdate();
    }

    return edge;
  }

  getTooltipForNode(node) {
    return null;
  }

  start(x, y, index) {
    super.start(x, y, index);

    if (this.bends != null && this.bends[index] != null && !this.isSource && !this.isTarget) {
      wangUtils.setOpacity(this.bends[index].node, 100);
    }
  }

  createBends() {
    let bends = [];
    let bend = this.createHandleShape(0);
    this.initBend(bend);
    bend.setCursor(wangConstants.CURSOR_TERMINAL_HANDLE);
    bends.push(bend);
    let pts = this.getCurrentPoints();

    if (this.graph.isCellBendable(this.state.cell)) {
      if (this.points == null) {
        this.points = [];
      }

      for (let i = 0; i < pts.length - 1; i++) {
        bend = this.createVirtualBend();
        bends.push(bend);
        let horizontal = Math.round(pts[i].x - pts[i + 1].x) == 0;

        if (Math.round(pts[i].y - pts[i + 1].y) == 0 && i < pts.length - 2) {
          horizontal = Math.round(pts[i].x - pts[i + 2].x) == 0;
        }

        bend.setCursor(horizontal ? 'col-resize' : 'row-resize');
        this.points.push(new wangPoint(0, 0));
      }
    }

    bend = this.createHandleShape(pts.length);
    this.initBend(bend);
    bend.setCursor(wangConstants.CURSOR_TERMINAL_HANDLE);
    bends.push(bend);
    return bends;
  }

  redraw() {
    this.refresh();
    super.redraw();
  }

  redrawInnerBends(p0, pe) {
    if (this.graph.isCellBendable(this.state.cell)) {
      let pts = this.getCurrentPoints();

      if (pts != null && pts.length > 1) {
        let straight = false;

        if (pts.length == 4 && Math.round(pts[1].x - pts[2].x) == 0 && Math.round(pts[1].y - pts[2].y) == 0) {
          straight = true;

          if (Math.round(pts[0].y - pts[pts.length - 1].y) == 0) {
            let cx = pts[0].x + (pts[pts.length - 1].x - pts[0].x) / 2;
            pts[1] = new wangPoint(cx, pts[1].y);
            pts[2] = new wangPoint(cx, pts[2].y);
          } else {
            let cy = pts[0].y + (pts[pts.length - 1].y - pts[0].y) / 2;
            pts[1] = new wangPoint(pts[1].x, cy);
            pts[2] = new wangPoint(pts[2].x, cy);
          }
        }

        for (let i = 0; i < pts.length - 1; i++) {
          if (this.bends[i + 1] != null) {
            let p0 = pts[i];
            let pe = pts[i + 1];
            let pt = new wangPoint(p0.x + (pe.x - p0.x) / 2, p0.y + (pe.y - p0.y) / 2);
            let b = this.bends[i + 1].bounds;
            this.bends[i + 1].bounds = new wangRectangle(
              Math.floor(pt.x - b.width / 2),
              Math.floor(pt.y - b.height / 2),
              b.width,
              b.height
            );
            this.bends[i + 1].redraw();

            if (this.manageLabelHandle) {
              this.checkLabelHandle(this.bends[i + 1].bounds);
            }
          }
        }

        if (straight) {
          wangUtils.setOpacity(this.bends[1].node, this.virtualBendOpacity);
          wangUtils.setOpacity(this.bends[3].node, this.virtualBendOpacity);
        }
      }
    }
  }
}
