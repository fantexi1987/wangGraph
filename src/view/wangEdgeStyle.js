import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangCellState } from '@wangGraph/view/wangCellState';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangEdgeStyle {
  static EntityRelation(state, source, target, points, result) {
    let view = state.view;
    let graph = view.graph;
    let segment =
      wangUtils.getValue(state.style, wangConstants.STYLE_SEGMENT, wangConstants.ENTITY_SEGMENT) * view.scale;
    let pts = state.absolutePoints;
    let p0 = pts[0];
    let pe = pts[pts.length - 1];
    let isSourceLeft = false;

    if (p0 != null) {
      source = new wangCellState();
      source.x = p0.x;
      source.y = p0.y;
    } else if (source != null) {
      let constraint = wangUtils.getPortConstraints(source, state, true, wangConstants.DIRECTION_MASK_NONE);

      if (
        constraint != wangConstants.DIRECTION_MASK_NONE &&
        constraint != wangConstants.DIRECTION_MASK_WEST + wangConstants.DIRECTION_MASK_EAST
      ) {
        isSourceLeft = constraint == wangConstants.DIRECTION_MASK_WEST;
      } else {
        let sourceGeometry = graph.getCellGeometry(source.cell);

        if (sourceGeometry.relative) {
          isSourceLeft = sourceGeometry.x <= 0.5;
        } else if (target != null) {
          isSourceLeft = target.x + target.width < source.x;
        }
      }
    } else {
      return;
    }

    let isTargetLeft = true;

    if (pe != null) {
      target = new wangCellState();
      target.x = pe.x;
      target.y = pe.y;
    } else if (target != null) {
      let constraint = wangUtils.getPortConstraints(target, state, false, wangConstants.DIRECTION_MASK_NONE);

      if (
        constraint != wangConstants.DIRECTION_MASK_NONE &&
        constraint != wangConstants.DIRECTION_MASK_WEST + wangConstants.DIRECTION_MASK_EAST
      ) {
        isTargetLeft = constraint == wangConstants.DIRECTION_MASK_WEST;
      } else {
        let targetGeometry = graph.getCellGeometry(target.cell);

        if (targetGeometry.relative) {
          isTargetLeft = targetGeometry.x <= 0.5;
        } else if (source != null) {
          isTargetLeft = source.x + source.width < target.x;
        }
      }
    }

    if (source != null && target != null) {
      let x0 = isSourceLeft ? source.x : source.x + source.width;
      let y0 = view.getRoutingCenterY(source);
      let xe = isTargetLeft ? target.x : target.x + target.width;
      let ye = view.getRoutingCenterY(target);
      let seg = segment;
      let dx = isSourceLeft ? -seg : seg;
      let dep = new wangPoint(x0 + dx, y0);
      dx = isTargetLeft ? -seg : seg;
      let arr = new wangPoint(xe + dx, ye);

      if (isSourceLeft == isTargetLeft) {
        let x = isSourceLeft ? Math.min(x0, xe) - segment : Math.max(x0, xe) + segment;
        result.push(new wangPoint(x, y0));
        result.push(new wangPoint(x, ye));
      } else if (dep.x < arr.x == isSourceLeft) {
        let midY = y0 + (ye - y0) / 2;
        result.push(dep);
        result.push(new wangPoint(dep.x, midY));
        result.push(new wangPoint(arr.x, midY));
        result.push(arr);
      } else {
        result.push(dep);
        result.push(arr);
      }
    }
  }

  static Loop(state, source, target, points, result) {
    let pts = state.absolutePoints;
    let p0 = pts[0];
    let pe = pts[pts.length - 1];

    if (p0 != null && pe != null) {
      if (points != null && points.length > 0) {
        for (let i = 0; i < points.length; i++) {
          let pt = points[i];
          pt = state.view.transformControlPoint(state, pt);
          result.push(new wangPoint(pt.x, pt.y));
        }
      }

      return;
    }

    if (source != null) {
      let view = state.view;
      let graph = view.graph;
      let pt = points != null && points.length > 0 ? points[0] : null;

      if (pt != null) {
        pt = view.transformControlPoint(state, pt);

        if (wangUtils.contains(source, pt.x, pt.y)) {
          pt = null;
        }
      }

      let x = 0;
      let dx = 0;
      let y = 0;
      let dy = 0;
      let seg = wangUtils.getValue(state.style, wangConstants.STYLE_SEGMENT, graph.gridSize) * view.scale;
      let dir = wangUtils.getValue(state.style, wangConstants.STYLE_DIRECTION, wangConstants.DIRECTION_WEST);

      if (dir == wangConstants.DIRECTION_NORTH || dir == wangConstants.DIRECTION_SOUTH) {
        x = view.getRoutingCenterX(source);
        dx = seg;
      } else {
        y = view.getRoutingCenterY(source);
        dy = seg;
      }

      if (pt == null || pt.x < source.x || pt.x > source.x + source.width) {
        if (pt != null) {
          x = pt.x;
          dy = Math.max(Math.abs(y - pt.y), dy);
        } else {
          if (dir == wangConstants.DIRECTION_NORTH) {
            y = source.y - 2 * dx;
          } else if (dir == wangConstants.DIRECTION_SOUTH) {
            y = source.y + source.height + 2 * dx;
          } else if (dir == wangConstants.DIRECTION_EAST) {
            x = source.x - 2 * dy;
          } else {
            x = source.x + source.width + 2 * dy;
          }
        }
      } else if (pt != null) {
        x = view.getRoutingCenterX(source);
        dx = Math.max(Math.abs(x - pt.x), dy);
        y = pt.y;
        dy = 0;
      }

      result.push(new wangPoint(x - dx, y - dy));
      result.push(new wangPoint(x + dx, y + dy));
    }
  }

  static ElbowConnector(state, source, target, points, result) {
    let pt = points != null && points.length > 0 ? points[0] : null;
    let vertical = false;
    let horizontal = false;

    if (source != null && target != null) {
      if (pt != null) {
        let left = Math.min(source.x, target.x);
        let right = Math.max(source.x + source.width, target.x + target.width);
        let top = Math.min(source.y, target.y);
        let bottom = Math.max(source.y + source.height, target.y + target.height);
        pt = state.view.transformControlPoint(state, pt);
        vertical = pt.y < top || pt.y > bottom;
        horizontal = pt.x < left || pt.x > right;
      } else {
        let left = Math.max(source.x, target.x);
        let right = Math.min(source.x + source.width, target.x + target.width);
        vertical = left == right;

        if (!vertical) {
          let top = Math.max(source.y, target.y);
          let bottom = Math.min(source.y + source.height, target.y + target.height);
          horizontal = top == bottom;
        }
      }
    }

    if (!horizontal && (vertical || state.style[wangConstants.STYLE_ELBOW] == wangConstants.ELBOW_VERTICAL)) {
      wangEdgeStyle.TopToBottom(state, source, target, points, result);
    } else {
      wangEdgeStyle.SideToSide(state, source, target, points, result);
    }
  }

  static SideToSide(state, source, target, points, result) {
    let view = state.view;
    let pt = points != null && points.length > 0 ? points[0] : null;
    let pts = state.absolutePoints;
    let p0 = pts[0];
    let pe = pts[pts.length - 1];

    if (pt != null) {
      pt = view.transformControlPoint(state, pt);
    }

    if (p0 != null) {
      source = new wangCellState();
      source.x = p0.x;
      source.y = p0.y;
    }

    if (pe != null) {
      target = new wangCellState();
      target.x = pe.x;
      target.y = pe.y;
    }

    if (source != null && target != null) {
      let l = Math.max(source.x, target.x);
      let r = Math.min(source.x + source.width, target.x + target.width);
      let x = pt != null ? pt.x : Math.round(r + (l - r) / 2);
      let y1 = view.getRoutingCenterY(source);
      let y2 = view.getRoutingCenterY(target);

      if (pt != null) {
        if (pt.y >= source.y && pt.y <= source.y + source.height) {
          y1 = pt.y;
        }

        if (pt.y >= target.y && pt.y <= target.y + target.height) {
          y2 = pt.y;
        }
      }

      if (!wangUtils.contains(target, x, y1) && !wangUtils.contains(source, x, y1)) {
        result.push(new wangPoint(x, y1));
      }

      if (!wangUtils.contains(target, x, y2) && !wangUtils.contains(source, x, y2)) {
        result.push(new wangPoint(x, y2));
      }

      if (result.length == 1) {
        if (pt != null) {
          if (!wangUtils.contains(target, x, pt.y) && !wangUtils.contains(source, x, pt.y)) {
            result.push(new wangPoint(x, pt.y));
          }
        } else {
          let t = Math.max(source.y, target.y);
          let b = Math.min(source.y + source.height, target.y + target.height);
          result.push(new wangPoint(x, t + (b - t) / 2));
        }
      }
    }
  }

  static TopToBottom(state, source, target, points, result) {
    let view = state.view;
    let pt = points != null && points.length > 0 ? points[0] : null;
    let pts = state.absolutePoints;
    let p0 = pts[0];
    let pe = pts[pts.length - 1];

    if (pt != null) {
      pt = view.transformControlPoint(state, pt);
    }

    if (p0 != null) {
      source = new wangCellState();
      source.x = p0.x;
      source.y = p0.y;
    }

    if (pe != null) {
      target = new wangCellState();
      target.x = pe.x;
      target.y = pe.y;
    }

    if (source != null && target != null) {
      let t = Math.max(source.y, target.y);
      let b = Math.min(source.y + source.height, target.y + target.height);
      let x = view.getRoutingCenterX(source);

      if (pt != null && pt.x >= source.x && pt.x <= source.x + source.width) {
        x = pt.x;
      }

      let y = pt != null ? pt.y : Math.round(b + (t - b) / 2);

      if (!wangUtils.contains(target, x, y) && !wangUtils.contains(source, x, y)) {
        result.push(new wangPoint(x, y));
      }

      if (pt != null && pt.x >= target.x && pt.x <= target.x + target.width) {
        x = pt.x;
      } else {
        x = view.getRoutingCenterX(target);
      }

      if (!wangUtils.contains(target, x, y) && !wangUtils.contains(source, x, y)) {
        result.push(new wangPoint(x, y));
      }

      if (result.length == 1) {
        if (pt != null && result.length == 1) {
          if (!wangUtils.contains(target, pt.x, y) && !wangUtils.contains(source, pt.x, y)) {
            result.push(new wangPoint(pt.x, y));
          }
        } else {
          let l = Math.max(source.x, target.x);
          let r = Math.min(source.x + source.width, target.x + target.width);
          result.push(new wangPoint(l + (r - l) / 2, y));
        }
      }
    }
  }

  static SegmentConnector(state, sourceScaled, targetScaled, controlHints, result) {
    let pts = wangEdgeStyle.scalePointArray(state.absolutePoints, state.view.scale);
    let source = wangEdgeStyle.scaleCellState(sourceScaled, state.view.scale);
    let target = wangEdgeStyle.scaleCellState(targetScaled, state.view.scale);
    let tol = 1;
    let lastPushed = result.length > 0 ? result[0] : null;
    let horizontal = true;
    let hint = null;

    function pushPoint(pt) {
      pt.x = Math.round(pt.x * state.view.scale * 10) / 10;
      pt.y = Math.round(pt.y * state.view.scale * 10) / 10;

      if (
        lastPushed == null ||
        Math.abs(lastPushed.x - pt.x) >= tol ||
        Math.abs(lastPushed.y - pt.y) >= Math.max(1, state.view.scale)
      ) {
        result.push(pt);
        lastPushed = pt;
      }

      return lastPushed;
    }

    let pt = pts[0];

    if (pt == null && source != null) {
      pt = new wangPoint(state.view.getRoutingCenterX(source), state.view.getRoutingCenterY(source));
    } else if (pt != null) {
      pt = pt.clone();
    }

    let lastInx = pts.length - 1;

    if (controlHints != null && controlHints.length > 0) {
      let hints = [];

      for (let i = 0; i < controlHints.length; i++) {
        let tmp = state.view.transformControlPoint(state, controlHints[i], true);

        if (tmp != null) {
          hints.push(tmp);
        }
      }

      if (hints.length == 0) {
        return;
      }

      if (pt != null && hints[0] != null) {
        if (Math.abs(hints[0].x - pt.x) < tol) {
          hints[0].x = pt.x;
        }

        if (Math.abs(hints[0].y - pt.y) < tol) {
          hints[0].y = pt.y;
        }
      }

      let pe = pts[lastInx];

      if (pe != null && hints[hints.length - 1] != null) {
        if (Math.abs(hints[hints.length - 1].x - pe.x) < tol) {
          hints[hints.length - 1].x = pe.x;
        }

        if (Math.abs(hints[hints.length - 1].y - pe.y) < tol) {
          hints[hints.length - 1].y = pe.y;
        }
      }

      hint = hints[0];
      let currentTerm = source;
      let currentPt = pts[0];
      let hozChan = false;
      let vertChan = false;
      let currentHint = hint;

      if (currentPt != null) {
        currentTerm = null;
      }

      for (let i = 0; i < 2; i++) {
        let fixedVertAlign = currentPt != null && currentPt.x == currentHint.x;
        let fixedHozAlign = currentPt != null && currentPt.y == currentHint.y;
        let inHozChan =
          currentTerm != null && currentHint.y >= currentTerm.y && currentHint.y <= currentTerm.y + currentTerm.height;
        let inVertChan =
          currentTerm != null && currentHint.x >= currentTerm.x && currentHint.x <= currentTerm.x + currentTerm.width;
        hozChan = fixedHozAlign || (currentPt == null && inHozChan);
        vertChan = fixedVertAlign || (currentPt == null && inVertChan);

        if (!(i == 0 && ((hozChan && vertChan) || (fixedVertAlign && fixedHozAlign)))) {
          if (currentPt != null && !fixedHozAlign && !fixedVertAlign && (inHozChan || inVertChan)) {
            horizontal = inHozChan ? false : true;
            break;
          }

          if (vertChan || hozChan) {
            horizontal = hozChan;

            if (i == 1) {
              horizontal = hints.length % 2 == 0 ? hozChan : vertChan;
            }

            break;
          }
        }

        currentTerm = target;
        currentPt = pts[lastInx];

        if (currentPt != null) {
          currentTerm = null;
        }

        currentHint = hints[hints.length - 1];

        if (fixedVertAlign && fixedHozAlign) {
          hints = hints.slice(1);
        }
      }

      if (
        horizontal &&
        ((pts[0] != null && pts[0].y != hint.y) ||
          (pts[0] == null && source != null && (hint.y < source.y || hint.y > source.y + source.height)))
      ) {
        pushPoint(new wangPoint(pt.x, hint.y));
      } else if (
        !horizontal &&
        ((pts[0] != null && pts[0].x != hint.x) ||
          (pts[0] == null && source != null && (hint.x < source.x || hint.x > source.x + source.width)))
      ) {
        pushPoint(new wangPoint(hint.x, pt.y));
      }

      if (horizontal) {
        pt.y = hint.y;
      } else {
        pt.x = hint.x;
      }

      for (let i = 0; i < hints.length; i++) {
        horizontal = !horizontal;
        hint = hints[i];

        if (horizontal) {
          pt.y = hint.y;
        } else {
          pt.x = hint.x;
        }

        pushPoint(pt.clone());
      }
    } else {
      hint = pt;
      horizontal = true;
    }

    pt = pts[lastInx];

    if (pt == null && target != null) {
      pt = new wangPoint(state.view.getRoutingCenterX(target), state.view.getRoutingCenterY(target));
    }

    if (pt != null) {
      if (hint != null) {
        if (
          horizontal &&
          ((pts[lastInx] != null && pts[lastInx].y != hint.y) ||
            (pts[lastInx] == null && target != null && (hint.y < target.y || hint.y > target.y + target.height)))
        ) {
          pushPoint(new wangPoint(pt.x, hint.y));
        } else if (
          !horizontal &&
          ((pts[lastInx] != null && pts[lastInx].x != hint.x) ||
            (pts[lastInx] == null && target != null && (hint.x < target.x || hint.x > target.x + target.width)))
        ) {
          pushPoint(new wangPoint(hint.x, pt.y));
        }
      }
    }

    if (pts[0] == null && source != null) {
      while (result.length > 1 && result[1] != null && wangUtils.contains(source, result[1].x, result[1].y)) {
        result.splice(1, 1);
      }
    }

    if (pts[lastInx] == null && target != null) {
      while (
        result.length > 1 &&
        result[result.length - 1] != null &&
        wangUtils.contains(target, result[result.length - 1].x, result[result.length - 1].y)
      ) {
        result.splice(result.length - 1, 1);
      }
    }

    if (
      pe != null &&
      result[result.length - 1] != null &&
      Math.abs(pe.x - result[result.length - 1].x) <= tol &&
      Math.abs(pe.y - result[result.length - 1].y) <= tol
    ) {
      result.splice(result.length - 1, 1);

      if (result[result.length - 1] != null) {
        if (Math.abs(result[result.length - 1].x - pe.x) < tol) {
          result[result.length - 1].x = pe.x;
        }

        if (Math.abs(result[result.length - 1].y - pe.y) < tol) {
          result[result.length - 1].y = pe.y;
        }
      }
    }
  }

  static orthBuffer = 10;
  static orthPointsFallback = true;
  static dirVectors = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 0]
  ];
  static wayPoints1 = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0]
  ];
  static routePatterns = [
    [
      [513, 2308, 2081, 2562],
      [513, 1090, 514, 2184, 2114, 2561],
      [513, 1090, 514, 2564, 2184, 2562],
      [513, 2308, 2561, 1090, 514, 2568, 2308]
    ],
    [
      [514, 1057, 513, 2308, 2081, 2562],
      [514, 2184, 2114, 2561],
      [514, 2184, 2562, 1057, 513, 2564, 2184],
      [514, 1057, 513, 2568, 2308, 2561]
    ],
    [
      [1090, 514, 1057, 513, 2308, 2081, 2562],
      [2114, 2561],
      [1090, 2562, 1057, 513, 2564, 2184],
      [1090, 514, 1057, 513, 2308, 2561, 2568]
    ],
    [
      [2081, 2562],
      [1057, 513, 1090, 514, 2184, 2114, 2561],
      [1057, 513, 1090, 514, 2184, 2562, 2564],
      [1057, 2561, 1090, 514, 2568, 2308]
    ]
  ];
  static inlineRoutePatterns = [
    [null, [2114, 2568], null, null],
    [null, [514, 2081, 2114, 2568], null, null],
    [null, [2114, 2561], null, null],
    [[2081, 2562], [1057, 2114, 2568], [2184, 2562], null]
  ];
  static vertexSeperations = [];
  static limits = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  static LEFT_MASK = 32;
  static TOP_MASK = 64;
  static RIGHT_MASK = 128;
  static BOTTOM_MASK = 256;
  static LEFT = 1;
  static TOP = 2;
  static RIGHT = 4;
  static BOTTOM = 8;
  static SIDE_MASK = 480;
  static CENTER_MASK = 512;
  static SOURCE_MASK = 1024;
  static TARGET_MASK = 2048;
  static VERTEX_MASK = 3072;

  static getJettySize(state, isSource) {
    let value = wangUtils.getValue(
      state.style,
      isSource ? wangConstants.STYLE_SOURCE_JETTY_SIZE : wangConstants.STYLE_TARGET_JETTY_SIZE,
      wangUtils.getValue(state.style, wangConstants.STYLE_JETTY_SIZE, wangEdgeStyle.orthBuffer)
    );

    if (value == 'auto') {
      let type = wangUtils.getValue(
        state.style,
        isSource ? wangConstants.STYLE_STARTARROW : wangConstants.STYLE_ENDARROW,
        wangConstants.NONE
      );

      if (type != wangConstants.NONE) {
        let size = wangUtils.getNumber(
          state.style,
          isSource ? wangConstants.STYLE_STARTSIZE : wangConstants.STYLE_ENDSIZE,
          wangConstants.DEFAULT_MARKERSIZE
        );
        value =
          Math.max(2, Math.ceil((size + wangEdgeStyle.orthBuffer) / wangEdgeStyle.orthBuffer)) *
          wangEdgeStyle.orthBuffer;
      } else {
        value = 2 * wangEdgeStyle.orthBuffer;
      }
    }

    return value;
  }

  static scalePointArray(points, scale) {
    let result = [];

    if (points != null) {
      for (let i = 0; i < points.length; i++) {
        if (points[i] != null) {
          let pt = new wangPoint(
            Math.round((points[i].x / scale) * 10) / 10,
            Math.round((points[i].y / scale) * 10) / 10
          );
          result[i] = pt;
        } else {
          result[i] = null;
        }
      }
    } else {
      result = null;
    }

    return result;
  }

  static scaleCellState(state, scale) {
    let result = null;

    if (state != null) {
      result = state.clone();
      result.setRect(
        Math.round((state.x / scale) * 10) / 10,
        Math.round((state.y / scale) * 10) / 10,
        Math.round((state.width / scale) * 10) / 10,
        Math.round((state.height / scale) * 10) / 10
      );
    } else {
      result = null;
    }

    return result;
  }

  static OrthConnector(state, sourceScaled, targetScaled, controlHints, result) {
    let graph = state.view.graph;
    let sourceEdge = source == null ? false : graph.getModel().isEdge(source.cell);
    let targetEdge = target == null ? false : graph.getModel().isEdge(target.cell);
    let pts = wangEdgeStyle.scalePointArray(state.absolutePoints, state.view.scale);
    let source = wangEdgeStyle.scaleCellState(sourceScaled, state.view.scale);
    let target = wangEdgeStyle.scaleCellState(targetScaled, state.view.scale);
    let p0 = pts[0];
    let pe = pts[pts.length - 1];
    let sourceX = source != null ? source.x : p0.x;
    let sourceY = source != null ? source.y : p0.y;
    let sourceWidth = source != null ? source.width : 0;
    let sourceHeight = source != null ? source.height : 0;
    let targetX = target != null ? target.x : pe.x;
    let targetY = target != null ? target.y : pe.y;
    let targetWidth = target != null ? target.width : 0;
    let targetHeight = target != null ? target.height : 0;
    let sourceBuffer = wangEdgeStyle.getJettySize(state, true);
    let targetBuffer = wangEdgeStyle.getJettySize(state, false);

    if (source != null && target == source) {
      targetBuffer = Math.max(sourceBuffer, targetBuffer);
      sourceBuffer = targetBuffer;
    }

    let totalBuffer = targetBuffer + sourceBuffer;
    let tooShort = false;

    if (p0 != null && pe != null) {
      let dx = pe.x - p0.x;
      let dy = pe.y - p0.y;
      tooShort = dx * dx + dy * dy < totalBuffer * totalBuffer;
    }

    if (
      tooShort ||
      (wangEdgeStyle.orthPointsFallback && controlHints != null && controlHints.length > 0) ||
      sourceEdge ||
      targetEdge
    ) {
      wangEdgeStyle.SegmentConnector(state, sourceScaled, targetScaled, controlHints, result);
      return;
    }

    let portConstraint = [wangConstants.DIRECTION_MASK_ALL, wangConstants.DIRECTION_MASK_ALL];
    let rotation = 0;

    if (source != null) {
      portConstraint[0] = wangUtils.getPortConstraints(source, state, true, wangConstants.DIRECTION_MASK_ALL);
      rotation = wangUtils.getValue(source.style, wangConstants.STYLE_ROTATION, 0);

      if (rotation != 0) {
        let newRect = wangUtils.getBoundingBox(
          new wangRectangle(sourceX, sourceY, sourceWidth, sourceHeight),
          rotation
        );
        sourceX = newRect.x;
        sourceY = newRect.y;
        sourceWidth = newRect.width;
        sourceHeight = newRect.height;
      }
    }

    if (target != null) {
      portConstraint[1] = wangUtils.getPortConstraints(target, state, false, wangConstants.DIRECTION_MASK_ALL);
      rotation = wangUtils.getValue(target.style, wangConstants.STYLE_ROTATION, 0);

      if (rotation != 0) {
        let newRect = wangUtils.getBoundingBox(
          new wangRectangle(targetX, targetY, targetWidth, targetHeight),
          rotation
        );
        targetX = newRect.x;
        targetY = newRect.y;
        targetWidth = newRect.width;
        targetHeight = newRect.height;
      }
    }

    let dir = [0, 0];
    let geo = [
      [sourceX, sourceY, sourceWidth, sourceHeight],
      [targetX, targetY, targetWidth, targetHeight]
    ];
    let buffer = [sourceBuffer, targetBuffer];

    for (let i = 0; i < 2; i++) {
      wangEdgeStyle.limits[i][1] = geo[i][0] - buffer[i];
      wangEdgeStyle.limits[i][2] = geo[i][1] - buffer[i];
      wangEdgeStyle.limits[i][4] = geo[i][0] + geo[i][2] + buffer[i];
      wangEdgeStyle.limits[i][8] = geo[i][1] + geo[i][3] + buffer[i];
    }

    let sourceCenX = geo[0][0] + geo[0][2] / 2.0;
    let sourceCenY = geo[0][1] + geo[0][3] / 2.0;
    let targetCenX = geo[1][0] + geo[1][2] / 2.0;
    let targetCenY = geo[1][1] + geo[1][3] / 2.0;
    let dx = sourceCenX - targetCenX;
    let dy = sourceCenY - targetCenY;
    let quad = 0;

    if (dx < 0) {
      if (dy < 0) {
        quad = 2;
      } else {
        quad = 1;
      }
    } else {
      if (dy <= 0) {
        quad = 3;

        if (dx == 0) {
          quad = 2;
        }
      }
    }

    let currentTerm = null;

    if (source != null) {
      currentTerm = p0;
    }

    let constraint = [
      [0.5, 0.5],
      [0.5, 0.5]
    ];

    for (let i = 0; i < 2; i++) {
      if (currentTerm != null) {
        constraint[i][0] = (currentTerm.x - geo[i][0]) / geo[i][2];

        if (Math.abs(currentTerm.x - geo[i][0]) <= 1) {
          dir[i] = wangConstants.DIRECTION_MASK_WEST;
        } else if (Math.abs(currentTerm.x - geo[i][0] - geo[i][2]) <= 1) {
          dir[i] = wangConstants.DIRECTION_MASK_EAST;
        }

        constraint[i][1] = (currentTerm.y - geo[i][1]) / geo[i][3];

        if (Math.abs(currentTerm.y - geo[i][1]) <= 1) {
          dir[i] = wangConstants.DIRECTION_MASK_NORTH;
        } else if (Math.abs(currentTerm.y - geo[i][1] - geo[i][3]) <= 1) {
          dir[i] = wangConstants.DIRECTION_MASK_SOUTH;
        }
      }

      currentTerm = null;

      if (target != null) {
        currentTerm = pe;
      }
    }

    let sourceTopDist = geo[0][1] - (geo[1][1] + geo[1][3]);
    let sourceLeftDist = geo[0][0] - (geo[1][0] + geo[1][2]);
    let sourceBottomDist = geo[1][1] - (geo[0][1] + geo[0][3]);
    let sourceRightDist = geo[1][0] - (geo[0][0] + geo[0][2]);
    wangEdgeStyle.vertexSeperations[1] = Math.max(sourceLeftDist - totalBuffer, 0);
    wangEdgeStyle.vertexSeperations[2] = Math.max(sourceTopDist - totalBuffer, 0);
    wangEdgeStyle.vertexSeperations[4] = Math.max(sourceBottomDist - totalBuffer, 0);
    wangEdgeStyle.vertexSeperations[3] = Math.max(sourceRightDist - totalBuffer, 0);
    let dirPref = [];
    let horPref = [];
    let vertPref = [];
    horPref[0] =
      sourceLeftDist >= sourceRightDist ? wangConstants.DIRECTION_MASK_WEST : wangConstants.DIRECTION_MASK_EAST;
    vertPref[0] =
      sourceTopDist >= sourceBottomDist ? wangConstants.DIRECTION_MASK_NORTH : wangConstants.DIRECTION_MASK_SOUTH;
    horPref[1] = wangUtils.reversePortConstraints(horPref[0]);
    vertPref[1] = wangUtils.reversePortConstraints(vertPref[0]);
    let preferredHorizDist = sourceLeftDist >= sourceRightDist ? sourceLeftDist : sourceRightDist;
    let preferredVertDist = sourceTopDist >= sourceBottomDist ? sourceTopDist : sourceBottomDist;
    let prefOrdering = [
      [0, 0],
      [0, 0]
    ];
    let preferredOrderSet = false;

    for (let i = 0; i < 2; i++) {
      if (dir[i] != 0x0) {
        continue;
      }

      if ((horPref[i] & portConstraint[i]) == 0) {
        horPref[i] = wangUtils.reversePortConstraints(horPref[i]);
      }

      if ((vertPref[i] & portConstraint[i]) == 0) {
        vertPref[i] = wangUtils.reversePortConstraints(vertPref[i]);
      }

      prefOrdering[i][0] = vertPref[i];
      prefOrdering[i][1] = horPref[i];
    }

    if (preferredVertDist > 0 && preferredHorizDist > 0) {
      if ((horPref[0] & portConstraint[0]) > 0 && (vertPref[1] & portConstraint[1]) > 0) {
        prefOrdering[0][0] = horPref[0];
        prefOrdering[0][1] = vertPref[0];
        prefOrdering[1][0] = vertPref[1];
        prefOrdering[1][1] = horPref[1];
        preferredOrderSet = true;
      } else if ((vertPref[0] & portConstraint[0]) > 0 && (horPref[1] & portConstraint[1]) > 0) {
        prefOrdering[0][0] = vertPref[0];
        prefOrdering[0][1] = horPref[0];
        prefOrdering[1][0] = horPref[1];
        prefOrdering[1][1] = vertPref[1];
        preferredOrderSet = true;
      }
    }

    if (preferredVertDist > 0 && !preferredOrderSet) {
      prefOrdering[0][0] = vertPref[0];
      prefOrdering[0][1] = horPref[0];
      prefOrdering[1][0] = vertPref[1];
      prefOrdering[1][1] = horPref[1];
      preferredOrderSet = true;
    }

    if (preferredHorizDist > 0 && !preferredOrderSet) {
      prefOrdering[0][0] = horPref[0];
      prefOrdering[0][1] = vertPref[0];
      prefOrdering[1][0] = horPref[1];
      prefOrdering[1][1] = vertPref[1];
      preferredOrderSet = true;
    }

    for (let i = 0; i < 2; i++) {
      if (dir[i] != 0x0) {
        continue;
      }

      if ((prefOrdering[i][0] & portConstraint[i]) == 0) {
        prefOrdering[i][0] = prefOrdering[i][1];
      }

      dirPref[i] = prefOrdering[i][0] & portConstraint[i];
      dirPref[i] |= (prefOrdering[i][1] & portConstraint[i]) << 8;
      dirPref[i] |= (prefOrdering[1 - i][i] & portConstraint[i]) << 16;
      dirPref[i] |= (prefOrdering[1 - i][1 - i] & portConstraint[i]) << 24;

      if ((dirPref[i] & 0xf) == 0) {
        dirPref[i] = dirPref[i] << 8;
      }

      if ((dirPref[i] & 0xf00) == 0) {
        dirPref[i] = (dirPref[i] & 0xf) | (dirPref[i] >> 8);
      }

      if ((dirPref[i] & 0xf0000) == 0) {
        dirPref[i] = (dirPref[i] & 0xffff) | ((dirPref[i] & 0xf000000) >> 8);
      }

      dir[i] = dirPref[i] & 0xf;

      if (
        portConstraint[i] == wangConstants.DIRECTION_MASK_WEST ||
        portConstraint[i] == wangConstants.DIRECTION_MASK_NORTH ||
        portConstraint[i] == wangConstants.DIRECTION_MASK_EAST ||
        portConstraint[i] == wangConstants.DIRECTION_MASK_SOUTH
      ) {
        dir[i] = portConstraint[i];
      }
    }

    let sourceIndex = dir[0] == wangConstants.DIRECTION_MASK_EAST ? 3 : dir[0];
    let targetIndex = dir[1] == wangConstants.DIRECTION_MASK_EAST ? 3 : dir[1];
    sourceIndex -= quad;
    targetIndex -= quad;

    if (sourceIndex < 1) {
      sourceIndex += 4;
    }

    if (targetIndex < 1) {
      targetIndex += 4;
    }

    let routePattern = wangEdgeStyle.routePatterns[sourceIndex - 1][targetIndex - 1];
    wangEdgeStyle.wayPoints1[0][0] = geo[0][0];
    wangEdgeStyle.wayPoints1[0][1] = geo[0][1];

    switch (dir[0]) {
      case wangConstants.DIRECTION_MASK_WEST:
        wangEdgeStyle.wayPoints1[0][0] -= sourceBuffer;
        wangEdgeStyle.wayPoints1[0][1] += constraint[0][1] * geo[0][3];
        break;

      case wangConstants.DIRECTION_MASK_SOUTH:
        wangEdgeStyle.wayPoints1[0][0] += constraint[0][0] * geo[0][2];
        wangEdgeStyle.wayPoints1[0][1] += geo[0][3] + sourceBuffer;
        break;

      case wangConstants.DIRECTION_MASK_EAST:
        wangEdgeStyle.wayPoints1[0][0] += geo[0][2] + sourceBuffer;
        wangEdgeStyle.wayPoints1[0][1] += constraint[0][1] * geo[0][3];
        break;

      case wangConstants.DIRECTION_MASK_NORTH:
        wangEdgeStyle.wayPoints1[0][0] += constraint[0][0] * geo[0][2];
        wangEdgeStyle.wayPoints1[0][1] -= sourceBuffer;
        break;
    }

    let currentIndex = 0;
    let lastOrientation =
      (dir[0] & (wangConstants.DIRECTION_MASK_EAST | wangConstants.DIRECTION_MASK_WEST)) > 0 ? 0 : 1;
    let initialOrientation = lastOrientation;
    let currentOrientation = 0;

    for (let i = 0; i < routePattern.length; i++) {
      let nextDirection = routePattern[i] & 0xf;
      let directionIndex = nextDirection == wangConstants.DIRECTION_MASK_EAST ? 3 : nextDirection;
      directionIndex += quad;

      if (directionIndex > 4) {
        directionIndex -= 4;
      }

      let direction = wangEdgeStyle.dirVectors[directionIndex - 1];
      currentOrientation = directionIndex % 2 > 0 ? 0 : 1;

      if (currentOrientation != lastOrientation) {
        currentIndex++;
        wangEdgeStyle.wayPoints1[currentIndex][0] = wangEdgeStyle.wayPoints1[currentIndex - 1][0];
        wangEdgeStyle.wayPoints1[currentIndex][1] = wangEdgeStyle.wayPoints1[currentIndex - 1][1];
      }

      let tar = (routePattern[i] & wangEdgeStyle.TARGET_MASK) > 0;
      let sou = (routePattern[i] & wangEdgeStyle.SOURCE_MASK) > 0;
      let side = (routePattern[i] & wangEdgeStyle.SIDE_MASK) >> 5;
      side = side << quad;

      if (side > 0xf) {
        side = side >> 4;
      }

      let center = (routePattern[i] & wangEdgeStyle.CENTER_MASK) > 0;

      if ((sou || tar) && side < 9) {
        let limit = 0;
        let souTar = sou ? 0 : 1;

        if (center && currentOrientation == 0) {
          limit = geo[souTar][0] + constraint[souTar][0] * geo[souTar][2];
        } else if (center) {
          limit = geo[souTar][1] + constraint[souTar][1] * geo[souTar][3];
        } else {
          limit = wangEdgeStyle.limits[souTar][side];
        }

        if (currentOrientation == 0) {
          let lastX = wangEdgeStyle.wayPoints1[currentIndex][0];
          let deltaX = (limit - lastX) * direction[0];

          if (deltaX > 0) {
            wangEdgeStyle.wayPoints1[currentIndex][0] += direction[0] * deltaX;
          }
        } else {
          let lastY = wangEdgeStyle.wayPoints1[currentIndex][1];
          let deltaY = (limit - lastY) * direction[1];

          if (deltaY > 0) {
            wangEdgeStyle.wayPoints1[currentIndex][1] += direction[1] * deltaY;
          }
        }
      } else if (center) {
        wangEdgeStyle.wayPoints1[currentIndex][0] +=
          direction[0] * Math.abs(wangEdgeStyle.vertexSeperations[directionIndex] / 2);
        wangEdgeStyle.wayPoints1[currentIndex][1] +=
          direction[1] * Math.abs(wangEdgeStyle.vertexSeperations[directionIndex] / 2);
      }

      if (
        currentIndex > 0 &&
        wangEdgeStyle.wayPoints1[currentIndex][currentOrientation] ==
          wangEdgeStyle.wayPoints1[currentIndex - 1][currentOrientation]
      ) {
        currentIndex--;
      } else {
        lastOrientation = currentOrientation;
      }
    }

    for (let i = 0; i <= currentIndex; i++) {
      if (i == currentIndex) {
        let targetOrientation =
          (dir[1] & (wangConstants.DIRECTION_MASK_EAST | wangConstants.DIRECTION_MASK_WEST)) > 0 ? 0 : 1;
        let sameOrient = targetOrientation == initialOrientation ? 0 : 1;

        if (sameOrient != (currentIndex + 1) % 2) {
          break;
        }
      }

      result.push(
        new wangPoint(
          Math.round(wangEdgeStyle.wayPoints1[i][0] * state.view.scale * 10) / 10,
          Math.round(wangEdgeStyle.wayPoints1[i][1] * state.view.scale * 10) / 10
        )
      );
    }

    let index = 1;

    while (index < result.length) {
      if (
        result[index - 1] == null ||
        result[index] == null ||
        result[index - 1].x != result[index].x ||
        result[index - 1].y != result[index].y
      ) {
        index++;
      } else {
        result.splice(index, 1);
      }
    }
  }

  static getRoutePattern(dir, quad, dx, dy) {
    let sourceIndex = dir[0] == wangConstants.DIRECTION_MASK_EAST ? 3 : dir[0];
    let targetIndex = dir[1] == wangConstants.DIRECTION_MASK_EAST ? 3 : dir[1];
    sourceIndex -= quad;
    targetIndex -= quad;

    if (sourceIndex < 1) {
      sourceIndex += 4;
    }

    if (targetIndex < 1) {
      targetIndex += 4;
    }

    let result = wangEdgeStyle.routePatterns[sourceIndex - 1][targetIndex - 1];

    if (dx == 0 || dy == 0) {
      if (wangEdgeStyle.inlineRoutePatterns[sourceIndex - 1][targetIndex - 1] != null) {
        result = wangEdgeStyle.inlineRoutePatterns[sourceIndex - 1][targetIndex - 1];
      }
    }

    return result;
  }
}
