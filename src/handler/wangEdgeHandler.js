import { wangConnectionConstraint } from '@wangGraph/view/wangConnectionConstraint';
import { wangClient } from '@wangGraph/wangClient';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangEdgeStyle } from '@wangGraph/view/wangEdgeStyle';
import { EdgeCellMarker } from '@wangGraph/handler/EdgeCellMarker';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangGraphHandler } from '@wangGraph/handler/wangGraphHandler';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangConstraintHandler } from '@wangGraph/handler/wangConstraintHandler';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangEdgeHandler {
  graph = null;
  state = null;
  marker = null;
  constraintHandler = null;
  error = null;
  shape = null;
  bends = null;
  labelShape = null;
  cloneEnabled = true;
  addEnabled = false;
  removeEnabled = false;
  dblClickRemoveEnabled = false;
  mergeRemoveEnabled = false;
  straightRemoveEnabled = false;
  virtualBendsEnabled = false;
  virtualBendOpacity = 20;
  parentHighlightEnabled = false;
  preferHtml = false;
  allowHandleBoundsCheck = true;
  snapToTerminals = false;
  handleImage = null;
  tolerance = 0;
  outlineConnect = false;
  manageLabelHandle = false;

  constructor(state) {
    if (state != null) {
      this.state = state;
      this.init();

      this.escapeHandler = (sender, evt) => {
        let dirty = this.index != null;
        this.reset();

        if (dirty) {
          this.graph.cellRenderer.redraw(this.state, false, state.view.isRendering());
        }
      };

      this.state.view.graph.addListener(wangEvent.ESCAPE, this.escapeHandler);
    }
  }

  init() {
    this.graph = this.state.view.graph;
    this.marker = this.createMarker();
    this.constraintHandler = new wangConstraintHandler(this.graph);
    this.points = [];
    this.abspoints = this.getSelectionPoints(this.state);
    this.shape = this.createSelectionShape(this.abspoints);
    this.shape.dialect =
      this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_MIXEDHTML : wangConstants.DIALECT_SVG;
    this.shape.init(this.graph.getView().getOverlayPane());
    this.shape.pointerEvents = false;
    this.shape.setCursor(wangConstants.CURSOR_MOVABLE_EDGE);
    wangEvent.redirectMouseEvents(this.shape.node, this.graph, this.state);
    this.preferHtml = this.state.text != null && this.state.text.node.parentNode == this.graph.container;

    if (!this.preferHtml) {
      let sourceState = this.state.getVisibleterminalState(true);

      if (sourceState != null) {
        this.preferHtml = sourceState.text != null && sourceState.text.node.parentNode == this.graph.container;
      }

      if (!this.preferHtml) {
        let targetState = this.state.getVisibleterminalState(false);

        if (targetState != null) {
          this.preferHtml = targetState.text != null && targetState.text.node.parentNode == this.graph.container;
        }
      }
    }

    if (this.parentHighlightEnabled) {
      let parent = this.graph.model.getParent(this.state.cell);

      if (this.graph.model.isVertex(parent)) {
        let pstate = this.graph.view.getState(parent);

        if (pstate != null) {
          this.parentHighlight = this.createParentHighlightShape(pstate);
          this.parentHighlight.dialect =
            this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
          this.parentHighlight.pointerEvents = false;
          this.parentHighlight.rotation = Number(pstate.style[wangConstants.STYLE_ROTATION] || '0');
          this.parentHighlight.init(this.graph.getView().getOverlayPane());
        }
      }
    }

    if (this.graph.getSelectionCount() < wangGraphHandler.maxCells || wangGraphHandler.maxCells <= 0) {
      this.bends = this.createBends();

      if (this.isVirtualBendsEnabled()) {
        this.virtualBends = this.createVirtualBends();
      }
    }

    this.label = new wangPoint(this.state.absoluteOffset.x, this.state.absoluteOffset.y);
    this.labelShape = this.createLabelHandleShape();
    this.initBend(this.labelShape);
    this.labelShape.setCursor(wangConstants.CURSOR_LABEL_HANDLE);
    this.customHandles = this.createCustomHandles();
    this.redraw();
  }

  createCustomHandles() {
    return null;
  }

  isVirtualBendsEnabled(evt) {
    return (
      this.virtualBendsEnabled &&
      (this.state.style[wangConstants.STYLE_EDGE] == null ||
        this.state.style[wangConstants.STYLE_EDGE] == wangConstants.NONE ||
        this.state.style[wangConstants.STYLE_NOEDGESTYLE] == 1) &&
      wangUtils.getValue(this.state.style, wangConstants.STYLE_SHAPE, null) != 'arrow'
    );
  }

  isCellEnabled(cell) {
    return true;
  }

  isAddPointEvent(evt) {
    return wangEvent.isShiftDown(evt);
  }

  isRemovePointEvent(evt) {
    return wangEvent.isShiftDown(evt);
  }

  getSelectionPoints(state) {
    return state.absolutePoints;
  }

  createParentHighlightShape(bounds) {
    let shape = new wangRectangleShape(bounds, null, this.getSelectionColor());
    shape.strokewidth = this.getSelectionStrokeWidth();
    shape.isDashed = this.isSelectionDashed();
    return shape;
  }

  createSelectionShape(points) {
    let shape = new this.state.shape.constructor();
    shape.outline = true;
    shape.apply(this.state);
    shape.isDashed = this.isSelectionDashed();
    shape.stroke = this.getSelectionColor();
    shape.isShadow = false;
    return shape;
  }

  getSelectionColor() {
    return wangConstants.EDGE_SELECTION_COLOR;
  }

  getSelectionStrokeWidth() {
    return wangConstants.EDGE_SELECTION_STROKEWIDTH;
  }

  isSelectionDashed() {
    return wangConstants.EDGE_SELECTION_DASHED;
  }

  isConnectableCell(cell) {
    return true;
  }

  getCellAt(x, y) {
    return !this.outlineConnect ? this.graph.getCellAt(x, y) : null;
  }

  createMarker() {
    let marker = new EdgeCellMarker(this, this.graph);
    return marker;
  }

  validateConnection(source, target) {
    return this.graph.getEdgeValidationError(this.state.cell, source, target);
  }

  createBends() {
    let cell = this.state.cell;
    let bends = [];

    for (let i = 0; i < this.abspoints.length; i++) {
      if (this.isHandleVisible(i)) {
        let source = i == 0;
        let target = i == this.abspoints.length - 1;
        let terminal = source || target;

        if (terminal || this.graph.isCellBendable(cell)) {
          ((index) => {
            let bend = this.createHandleShape(index);
            this.initBend(bend, () => () => {
              if (this.dblClickRemoveEnabled) {
                this.removePoint(this.state, index);
              }
            });

            if (this.isHandleEnabled(i)) {
              bend.setCursor(terminal ? wangConstants.CURSOR_TERMINAL_HANDLE : wangConstants.CURSOR_BEND_HANDLE);
            }

            bends.push(bend);

            if (!terminal) {
              this.points.push(new wangPoint(0, 0));
              bend.node.style.visibility = 'hidden';
            }
          })(i);
        }
      }
    }

    return bends;
  }

  createVirtualBends() {
    let cell = this.state.cell;
    let last = this.abspoints[0];
    let bends = [];

    if (this.graph.isCellBendable(cell)) {
      for (let i = 1; i < this.abspoints.length; i++) {
        ((bend) => {
          this.initBend(bend);
          bend.setCursor(wangConstants.CURSOR_VIRTUAL_BEND_HANDLE);
          bends.push(bend);
        })(this.createHandleShape());
      }
    }

    return bends;
  }

  isHandleEnabled(index) {
    return true;
  }

  isHandleVisible(index) {
    let source = this.state.getVisibleterminalState(true);
    let target = this.state.getVisibleterminalState(false);
    let geo = this.graph.getCellGeometry(this.state.cell);
    let edgeStyle = geo != null ? this.graph.view.getEdgeStyle(this.state, geo.points, source, target) : null;
    return edgeStyle != wangEdgeStyle.EntityRelation || index == 0 || index == this.abspoints.length - 1;
  }

  createHandleShape(index) {
    if (this.handleImage != null) {
      let shape = new wangImageShape(
        new wangRectangle(0, 0, this.handleImage.width, this.handleImage.height),
        this.handleImage.src
      );
      shape.preserveImageAspect = false;
      return shape;
    } else {
      let s = wangConstants.HANDLE_SIZE;

      if (this.preferHtml) {
        s -= 1;
      }

      return new wangRectangleShape(
        new wangRectangle(0, 0, s, s),
        wangConstants.HANDLE_FILLCOLOR,
        wangConstants.HANDLE_STROKECOLOR
      );
    }
  }

  createLabelHandleShape() {
    if (this.labelHandleImage != null) {
      let shape = new wangImageShape(
        new wangRectangle(0, 0, this.labelHandleImage.width, this.labelHandleImage.height),
        this.labelHandleImage.src
      );
      shape.preserveImageAspect = false;
      return shape;
    } else {
      let s = wangConstants.LABEL_HANDLE_SIZE;
      return new wangRectangleShape(
        new wangRectangle(0, 0, s, s),
        wangConstants.LABEL_HANDLE_FILLCOLOR,
        wangConstants.HANDLE_STROKECOLOR
      );
    }
  }

  initBend(bend, dblClick) {
    if (this.preferHtml) {
      bend.dialect = wangConstants.DIALECT_STRICTHTML;
      bend.init(this.graph.container);
    } else {
      bend.dialect =
        this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_MIXEDHTML : wangConstants.DIALECT_SVG;
      bend.init(this.graph.getView().getOverlayPane());
    }

    wangEvent.redirectMouseEvents(bend.node, this.graph, this.state, null, null, null, dblClick);

    if (wangClient.IS_QUIRKS || document.documentMode == 8) {
      wangEvent.addListener(bend.node, 'dragstart', function (evt) {
        wangEvent.consume(evt);
        return false;
      });
    }

    if (wangClient.IS_TOUCH) {
      bend.node.setAttribute('pointer-events', 'none');
    }
  }

  getHandleForEvent(me) {
    let tol = !wangEvent.isMouseEvent(me.getEvent()) ? this.tolerance : 1;
    let hit =
      this.allowHandleBoundsCheck && tol > 0
        ? new wangRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol)
        : null;
    let minDistSq = null;
    let result = null;

    function checkShape(shape) {
      if (
        shape != null &&
        shape.node != null &&
        shape.node.style.display != 'none' &&
        shape.node.style.visibility != 'hidden' &&
        (me.isSource(shape) || (hit != null && wangUtils.intersects(shape.bounds, hit)))
      ) {
        let dx = me.getGraphX() - shape.bounds.getCenterX();
        let dy = me.getGraphY() - shape.bounds.getCenterY();
        let tmp = dx * dx + dy * dy;

        if (minDistSq == null || tmp <= minDistSq) {
          minDistSq = tmp;
          return true;
        }
      }

      return false;
    }

    if (this.customHandles != null && this.isCustomHandleEvent(me)) {
      for (let i = this.customHandles.length - 1; i >= 0; i--) {
        if (checkShape(this.customHandles[i].shape)) {
          return wangEvent.CUSTOM_HANDLE - i;
        }
      }
    }

    if (me.isSource(this.state.text) || checkShape(this.labelShape)) {
      result = wangEvent.LABEL_HANDLE;
    }

    if (this.bends != null) {
      for (let i = 0; i < this.bends.length; i++) {
        if (checkShape(this.bends[i])) {
          result = i;
        }
      }
    }

    if (this.virtualBends != null && this.isAddVirtualBendEvent(me)) {
      for (let i = 0; i < this.virtualBends.length; i++) {
        if (checkShape(this.virtualBends[i])) {
          result = wangEvent.VIRTUAL_HANDLE - i;
        }
      }
    }

    return result;
  }

  isAddVirtualBendEvent(me) {
    return true;
  }

  isCustomHandleEvent(me) {
    return true;
  }

  mouseDown(sender, me) {
    let handle = this.getHandleForEvent(me);

    if (this.bends != null && this.bends[handle] != null) {
      let b = this.bends[handle].bounds;
      this.snapPoint = new wangPoint(b.getCenterX(), b.getCenterY());
    }

    if (this.addEnabled && handle == null && this.isAddPointEvent(me.getEvent())) {
      this.addPoint(this.state, me.getEvent());
      me.consume();
    } else if (handle != null && !me.isConsumed() && this.graph.isEnabled()) {
      if (this.removeEnabled && this.isRemovePointEvent(me.getEvent())) {
        this.removePoint(this.state, handle);
      } else if (handle != wangEvent.LABEL_HANDLE || this.graph.isLabelMovable(me.getCell())) {
        if (handle <= wangEvent.VIRTUAL_HANDLE) {
          wangUtils.setOpacity(this.virtualBends[wangEvent.VIRTUAL_HANDLE - handle].node, 100);
        }

        this.start(me.getX(), me.getY(), handle);
      }

      me.consume();
    }
  }

  start(x, y, index) {
    this.startX = x;
    this.startY = y;
    this.isSource = this.bends == null ? false : index == 0;
    this.isTarget = this.bends == null ? false : index == this.bends.length - 1;
    this.isLabel = index == wangEvent.LABEL_HANDLE;

    if (this.isSource || this.isTarget) {
      let cell = this.state.cell;
      let terminal = this.graph.model.getTerminal(cell, this.isSource);

      if (
        (terminal == null && this.graph.isTerminalPointMovable(cell, this.isSource)) ||
        (terminal != null && this.graph.isCellDisconnectable(cell, terminal, this.isSource))
      ) {
        this.index = index;
      }
    } else {
      this.index = index;
    }

    if (this.index <= wangEvent.CUSTOM_HANDLE && this.index > wangEvent.VIRTUAL_HANDLE) {
      if (this.customHandles != null) {
        for (let i = 0; i < this.customHandles.length; i++) {
          if (i != wangEvent.CUSTOM_HANDLE - this.index) {
            this.customHandles[i].setVisible(false);
          }
        }
      }
    }
  }

  clonePreviewState(point, terminal) {
    return this.state.clone();
  }

  getSnapToTerminalTolerance() {
    return (this.graph.gridSize * this.graph.view.scale) / 2;
  }

  updateHint(me, point) {}

  removeHint() {}

  roundLength(length) {
    return Math.round(length);
  }

  isSnapToTerminalsEvent(me) {
    return this.snapToTerminals && !wangEvent.isAltDown(me.getEvent());
  }

  getPointForEvent(me) {
    let view = this.graph.getView();
    let scale = view.scale;
    let point = new wangPoint(
      this.roundLength(me.getGraphX() / scale) * scale,
      this.roundLength(me.getGraphY() / scale) * scale
    );
    let tt = this.getSnapToTerminalTolerance();
    let overrideX = false;
    let overrideY = false;

    if (tt > 0 && this.isSnapToTerminalsEvent(me)) {
      function snapToPoint(pt) {
        if (pt != null) {
          let x = pt.x;

          if (Math.abs(point.x - x) < tt) {
            point.x = x;
            overrideX = true;
          }

          let y = pt.y;

          if (Math.abs(point.y - y) < tt) {
            point.y = y;
            overrideY = true;
          }
        }
      }

      function snapToTerminal(terminal) {
        if (terminal != null) {
          snapToPoint.call(this, new wangPoint(view.getRoutingCenterX(terminal), view.getRoutingCenterY(terminal)));
        }
      }

      snapToTerminal.call(this, this.state.getVisibleterminalState(true));
      snapToTerminal.call(this, this.state.getVisibleterminalState(false));

      if (this.state.absolutePoints != null) {
        for (let i = 0; i < this.state.absolutePoints.length; i++) {
          snapToPoint.call(this, this.state.absolutePoints[i]);
        }
      }
    }

    if (this.graph.isGridEnabledEvent(me.getEvent())) {
      let tr = view.translate;

      if (!overrideX) {
        point.x = (this.graph.snap(point.x / scale - tr.x) + tr.x) * scale;
      }

      if (!overrideY) {
        point.y = (this.graph.snap(point.y / scale - tr.y) + tr.y) * scale;
      }
    }

    return point;
  }

  getPreviewTerminalState(me) {
    this.constraintHandler.update(
      me,
      this.isSource,
      true,
      me.isSource(this.marker.highlight.shape) ? null : this.currentPoint
    );

    if (this.constraintHandler.currentFocus != null && this.constraintHandler.currentConstraint != null) {
      if (
        this.marker.highlight != null &&
        this.marker.highlight.state != null &&
        this.marker.highlight.state.cell == this.constraintHandler.currentFocus.cell
      ) {
        if (this.marker.highlight.shape.stroke != 'transparent') {
          this.marker.highlight.shape.stroke = 'transparent';
          this.marker.highlight.repaint();
        }
      } else {
        this.marker.markCell(this.constraintHandler.currentFocus.cell, 'transparent');
      }

      let model = this.graph.getModel();
      let other = this.graph.view.getTerminalPort(
        this.state,
        this.graph.view.getState(model.getTerminal(this.state.cell, !this.isSource)),
        !this.isSource
      );
      let otherCell = other != null ? other.cell : null;
      let source = this.isSource ? this.constraintHandler.currentFocus.cell : otherCell;
      let target = this.isSource ? otherCell : this.constraintHandler.currentFocus.cell;
      this.error = this.validateConnection(source, target);
      let result = null;

      if (this.error == null) {
        result = this.constraintHandler.currentFocus;
      }

      if (this.error != null || (result != null && !this.isCellEnabled(result.cell))) {
        this.constraintHandler.reset();
      }

      return result;
    } else if (!this.graph.isIgnoreTerminalEvent(me.getEvent())) {
      this.marker.process(me);
      let state = this.marker.getValidState();

      if (state != null && !this.isCellEnabled(state.cell)) {
        this.constraintHandler.reset();
        this.marker.reset();
      }

      return this.marker.getValidState();
    } else {
      this.marker.reset();
      return null;
    }
  }

  getPreviewPoints(pt, me) {
    let geometry = this.graph.getCellGeometry(this.state.cell);
    let points = geometry.points != null ? geometry.points.slice() : null;
    let point = new wangPoint(pt.x, pt.y);
    let result = null;

    if (!this.isSource && !this.isTarget) {
      this.convertPoint(point, false);

      if (points == null) {
        points = [point];
      } else {
        if (this.index <= wangEvent.VIRTUAL_HANDLE) {
          points.splice(wangEvent.VIRTUAL_HANDLE - this.index, 0, point);
        }

        if (!this.isSource && !this.isTarget) {
          for (let i = 0; i < this.bends.length; i++) {
            if (i != this.index) {
              let bend = this.bends[i];

              if (bend != null && wangUtils.contains(bend.bounds, pt.x, pt.y)) {
                if (this.index <= wangEvent.VIRTUAL_HANDLE) {
                  points.splice(wangEvent.VIRTUAL_HANDLE - this.index, 1);
                } else {
                  points.splice(this.index - 1, 1);
                }

                result = points;
              }
            }
          }

          if (result == null && this.straightRemoveEnabled && (me == null || !wangEvent.isAltDown(me.getEvent()))) {
            let tol = this.graph.tolerance * this.graph.tolerance;
            let abs = this.state.absolutePoints.slice();
            abs[this.index] = pt;
            let src = this.state.getVisibleterminalState(true);

            if (src != null) {
              let c = this.graph.getConnectionConstraint(this.state, src, true);

              if (c == null || this.graph.getConnectionPoint(src, c) == null) {
                abs[0] = new wangPoint(src.view.getRoutingCenterX(src), src.view.getRoutingCenterY(src));
              }
            }

            let trg = this.state.getVisibleterminalState(false);

            if (trg != null) {
              let c = this.graph.getConnectionConstraint(this.state, trg, false);

              if (c == null || this.graph.getConnectionPoint(trg, c) == null) {
                abs[abs.length - 1] = new wangPoint(trg.view.getRoutingCenterX(trg), trg.view.getRoutingCenterY(trg));
              }
            }

            function checkRemove(idx, tmp) {
              if (
                idx > 0 &&
                idx < abs.length - 1 &&
                wangUtils.ptSegDistSq(abs[idx - 1].x, abs[idx - 1].y, abs[idx + 1].x, abs[idx + 1].y, tmp.x, tmp.y) <
                  tol
              ) {
                points.splice(idx - 1, 1);
                result = points;
              }
            }

            checkRemove(this.index, pt);
          }
        }

        if (result == null && this.index > wangEvent.VIRTUAL_HANDLE) {
          points[this.index - 1] = point;
        }
      }
    } else if (this.graph.resetEdgesOnConnect) {
      points = null;
    }

    return result != null ? result : points;
  }

  isOutlineConnectEvent(me) {
    let offset = wangUtils.getOffset(this.graph.container);
    let evt = me.getEvent();
    let clientX = wangEvent.getClientX(evt);
    let clientY = wangEvent.getClientY(evt);
    let doc = document.documentElement;
    let left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    let top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
    let gridX = this.currentPoint.x - this.graph.container.scrollLeft + offset.x - left;
    let gridY = this.currentPoint.y - this.graph.container.scrollTop + offset.y - top;
    return (
      this.outlineConnect &&
      !wangEvent.isShiftDown(me.getEvent()) &&
      (me.isSource(this.marker.highlight.shape) ||
        (wangEvent.isAltDown(me.getEvent()) && me.getState() != null) ||
        this.marker.highlight.isHighlightAt(clientX, clientY) ||
        ((gridX != clientX || gridY != clientY) &&
          me.getState() == null &&
          this.marker.highlight.isHighlightAt(gridX, gridY)))
    );
  }

  updatePreviewState(edge, point, terminalState, me, outline) {
    let sourceState = this.isSource ? terminalState : this.state.getVisibleterminalState(true);
    let targetState = this.isTarget ? terminalState : this.state.getVisibleterminalState(false);
    let sourceConstraint = this.graph.getConnectionConstraint(edge, sourceState, true);
    let targetConstraint = this.graph.getConnectionConstraint(edge, targetState, false);
    let constraint = this.constraintHandler.currentConstraint;

    if (constraint == null && outline) {
      if (terminalState != null) {
        if (me.isSource(this.marker.highlight.shape)) {
          point = new wangPoint(me.getGraphX(), me.getGraphY());
        }

        constraint = this.graph.getOutlineConstraint(point, terminalState, me);
        this.constraintHandler.setFocus(me, terminalState, this.isSource);
        this.constraintHandler.currentConstraint = constraint;
        this.constraintHandler.currentPoint = point;
      } else {
        constraint = new wangConnectionConstraint();
      }
    }

    if (this.outlineConnect && this.marker.highlight != null && this.marker.highlight.shape != null) {
      let s = this.graph.view.scale;

      if (this.constraintHandler.currentConstraint != null && this.constraintHandler.currentFocus != null) {
        this.marker.highlight.shape.stroke = outline ? wangConstants.OUTLINE_HIGHLIGHT_COLOR : 'transparent';
        this.marker.highlight.shape.strokewidth = wangConstants.OUTLINE_HIGHLIGHT_STROKEWIDTH / s / s;
        this.marker.highlight.repaint();
      } else if (this.marker.hasValidState()) {
        this.marker.highlight.shape.stroke =
          this.graph.isCellConnectable(me.getCell()) && this.marker.getValidState() != me.getState()
            ? 'transparent'
            : wangConstants.DEFAULT_VALID_COLOR;
        this.marker.highlight.shape.strokewidth = wangConstants.HIGHLIGHT_STROKEWIDTH / s / s;
        this.marker.highlight.repaint();
      }
    }

    if (this.isSource) {
      sourceConstraint = constraint;
    } else if (this.isTarget) {
      targetConstraint = constraint;
    }

    if (this.isSource || this.isTarget) {
      if (constraint != null && constraint.point != null) {
        edge.style[this.isSource ? wangConstants.STYLE_EXIT_X : wangConstants.STYLE_ENTRY_X] = constraint.point.x;
        edge.style[this.isSource ? wangConstants.STYLE_EXIT_Y : wangConstants.STYLE_ENTRY_Y] = constraint.point.y;
      } else {
        delete edge.style[this.isSource ? wangConstants.STYLE_EXIT_X : wangConstants.STYLE_ENTRY_X];
        delete edge.style[this.isSource ? wangConstants.STYLE_EXIT_Y : wangConstants.STYLE_ENTRY_Y];
      }
    }

    edge.setVisibleterminalState(sourceState, true);
    edge.setVisibleterminalState(targetState, false);

    if (!this.isSource || sourceState != null) {
      edge.view.updateFixedTerminalPoint(edge, sourceState, true, sourceConstraint);
    }

    if (!this.isTarget || targetState != null) {
      edge.view.updateFixedTerminalPoint(edge, targetState, false, targetConstraint);
    }

    if ((this.isSource || this.isTarget) && terminalState == null) {
      edge.setAbsoluteTerminalPoint(point, this.isSource);

      if (this.marker.getMarkedState() == null) {
        this.error = this.graph.allowDanglingEdges ? null : '';
      }
    }

    edge.view.updatePoints(edge, this.points, sourceState, targetState);
    edge.view.updateFloatingTerminalPoints(edge, sourceState, targetState);
  }

  mouseMove(sender, me) {
    if (this.index != null && this.marker != null) {
      this.currentPoint = this.getPointForEvent(me);
      this.error = null;

      if (
        !this.graph.isIgnoreTerminalEvent(me.getEvent()) &&
        wangEvent.isShiftDown(me.getEvent()) &&
        this.snapPoint != null
      ) {
        if (Math.abs(this.snapPoint.x - this.currentPoint.x) < Math.abs(this.snapPoint.y - this.currentPoint.y)) {
          this.currentPoint.x = this.snapPoint.x;
        } else {
          this.currentPoint.y = this.snapPoint.y;
        }
      }

      if (this.index <= wangEvent.CUSTOM_HANDLE && this.index > wangEvent.VIRTUAL_HANDLE) {
        if (this.customHandles != null) {
          this.customHandles[wangEvent.CUSTOM_HANDLE - this.index].processEvent(me);
          this.customHandles[wangEvent.CUSTOM_HANDLE - this.index].positionChanged();
        }
      } else if (this.isLabel) {
        this.label.x = this.currentPoint.x;
        this.label.y = this.currentPoint.y;
      } else {
        this.points = this.getPreviewPoints(this.currentPoint, me);
        let terminalState = this.isSource || this.isTarget ? this.getPreviewTerminalState(me) : null;

        if (
          this.constraintHandler.currentConstraint != null &&
          this.constraintHandler.currentFocus != null &&
          this.constraintHandler.currentPoint != null
        ) {
          this.currentPoint = this.constraintHandler.currentPoint.clone();
        } else if (this.outlineConnect) {
          let outline = this.isSource || this.isTarget ? this.isOutlineConnectEvent(me) : false;

          if (outline) {
            terminalState = this.marker.highlight.state;
          } else if (
            terminalState != null &&
            terminalState != me.getState() &&
            this.graph.isCellConnectable(me.getCell()) &&
            this.marker.highlight.shape != null
          ) {
            this.marker.highlight.shape.stroke = 'transparent';
            this.marker.highlight.repaint();
            terminalState = null;
          }
        }

        if (terminalState != null && !this.isCellEnabled(terminalState.cell)) {
          terminalState = null;
          this.marker.reset();
        }

        let clone = this.clonePreviewState(this.currentPoint, terminalState != null ? terminalState.cell : null);
        this.updatePreviewState(clone, this.currentPoint, terminalState, me, outline);
        let color = this.error == null ? this.marker.validColor : this.marker.invalidColor;
        this.setPreviewColor(color);
        this.abspoints = clone.absolutePoints;
        this.active = true;
        this.updateHint(me, this.currentPoint);
      }

      this.drawPreview();
      wangEvent.consume(me.getEvent());
      me.consume();
    }
  }

  mouseUp(sender, me) {
    if (this.index != null && this.marker != null) {
      let edge = this.state.cell;
      let index = this.index;
      this.index = null;

      if (me.getX() != this.startX || me.getY() != this.startY) {
        let clone =
          !this.graph.isIgnoreTerminalEvent(me.getEvent()) &&
          this.graph.isCloneEvent(me.getEvent()) &&
          this.cloneEnabled &&
          this.graph.isCellsCloneable();

        if (this.error != null) {
          if (this.error.length > 0) {
            this.graph.validationAlert(this.error);
          }
        } else if (index <= wangEvent.CUSTOM_HANDLE && index > wangEvent.VIRTUAL_HANDLE) {
          if (this.customHandles != null) {
            let model = this.graph.getModel();
            model.beginUpdate();

            try {
              this.customHandles[wangEvent.CUSTOM_HANDLE - index].execute(me);
            } finally {
              model.endUpdate();
            }
          }
        } else if (this.isLabel) {
          this.moveLabel(this.state, this.label.x, this.label.y);
        } else if (this.isSource || this.isTarget) {
          let terminal = null;

          if (this.constraintHandler.currentConstraint != null && this.constraintHandler.currentFocus != null) {
            terminal = this.constraintHandler.currentFocus.cell;
          }

          if (
            terminal == null &&
            this.marker.hasValidState() &&
            this.marker.highlight != null &&
            this.marker.highlight.shape != null &&
            this.marker.highlight.shape.stroke != 'transparent' &&
            this.marker.highlight.shape.stroke != 'white'
          ) {
            terminal = this.marker.validState.cell;
          }

          if (terminal != null) {
            let model = this.graph.getModel();
            let parent = model.getParent(edge);
            model.beginUpdate();

            try {
              if (clone) {
                let geo = model.getGeometry(edge);
                let clone = this.graph.cloneCell(edge);
                model.add(parent, clone, model.getChildCount(parent));

                if (geo != null) {
                  geo = geo.clone();
                  model.setGeometry(clone, geo);
                }

                let other = model.getTerminal(edge, !this.isSource);
                this.graph.connectCell(clone, other, !this.isSource);
                edge = clone;
              }

              edge = this.connect(edge, terminal, this.isSource, clone, me);
            } finally {
              model.endUpdate();
            }
          } else if (this.graph.isAllowDanglingEdges()) {
            let pt = this.abspoints[this.isSource ? 0 : this.abspoints.length - 1];
            pt.x = this.roundLength(pt.x / this.graph.view.scale - this.graph.view.translate.x);
            pt.y = this.roundLength(pt.y / this.graph.view.scale - this.graph.view.translate.y);
            let pstate = this.graph.getView().getState(this.graph.getModel().getParent(edge));

            if (pstate != null) {
              pt.x -= pstate.origin.x;
              pt.y -= pstate.origin.y;
            }

            pt.x -= this.graph.panDx / this.graph.view.scale;
            pt.y -= this.graph.panDy / this.graph.view.scale;
            edge = this.changeTerminalPoint(edge, pt, this.isSource, clone);
          }
        } else if (this.active) {
          edge = this.changePoints(edge, this.points, clone);
        } else {
          this.graph.getView().invalidate(this.state.cell);
          this.graph.getView().validate(this.state.cell);
        }
      } else if (this.graph.isToggleEvent(me.getEvent())) {
        this.graph.selectCellForEvent(this.state.cell, me.getEvent());
      }

      if (this.marker != null) {
        this.reset();

        if (edge != this.state.cell) {
          this.graph.setSelectionCell(edge);
        }
      }

      me.consume();
    }
  }

  reset() {
    if (this.active) {
      this.refresh();
    }

    this.error = null;
    this.index = null;
    this.label = null;
    this.points = null;
    this.snapPoint = null;
    this.isLabel = false;
    this.isSource = false;
    this.isTarget = false;
    this.active = false;

    if (this.livePreview && this.sizers != null) {
      for (let i = 0; i < this.sizers.length; i++) {
        if (this.sizers[i] != null) {
          this.sizers[i].node.style.display = '';
        }
      }
    }

    if (this.marker != null) {
      this.marker.reset();
    }

    if (this.constraintHandler != null) {
      this.constraintHandler.reset();
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        this.customHandles[i].reset();
      }
    }

    this.setPreviewColor(wangConstants.EDGE_SELECTION_COLOR);
    this.removeHint();
    this.redraw();
  }

  setPreviewColor(color) {
    if (this.shape != null) {
      this.shape.stroke = color;
    }
  }

  convertPoint(point, gridEnabled) {
    let scale = this.graph.getView().getScale();
    let tr = this.graph.getView().getTranslate();

    if (gridEnabled) {
      point.x = this.graph.snap(point.x);
      point.y = this.graph.snap(point.y);
    }

    point.x = Math.round(point.x / scale - tr.x);
    point.y = Math.round(point.y / scale - tr.y);
    let pstate = this.graph.getView().getState(this.graph.getModel().getParent(this.state.cell));

    if (pstate != null) {
      point.x -= pstate.origin.x;
      point.y -= pstate.origin.y;
    }

    return point;
  }

  moveLabel(edgeState, x, y) {
    let model = this.graph.getModel();
    let geometry = model.getGeometry(edgeState.cell);

    if (geometry != null) {
      let scale = this.graph.getView().scale;
      geometry = geometry.clone();

      if (geometry.relative) {
        let pt = this.graph.getView().getRelativePoint(edgeState, x, y);
        geometry.x = Math.round(pt.x * 10000) / 10000;
        geometry.y = Math.round(pt.y);
        geometry.offset = new wangPoint(0, 0);
        pt = this.graph.view.getPoint(edgeState, geometry);
        geometry.offset = new wangPoint(Math.round((x - pt.x) / scale), Math.round((y - pt.y) / scale));
      } else {
        let points = edgeState.absolutePoints;
        let p0 = points[0];
        let pe = points[points.length - 1];

        if (p0 != null && pe != null) {
          let cx = p0.x + (pe.x - p0.x) / 2;
          let cy = p0.y + (pe.y - p0.y) / 2;
          geometry.offset = new wangPoint(Math.round((x - cx) / scale), Math.round((y - cy) / scale));
          geometry.x = 0;
          geometry.y = 0;
        }
      }

      model.setGeometry(edgeState.cell, geometry);
    }
  }

  connect(edge, terminal, isSource, isClone, me) {
    let model = this.graph.getModel();
    let parent = model.getParent(edge);
    model.beginUpdate();

    try {
      let constraint = this.constraintHandler.currentConstraint;

      if (constraint == null) {
        constraint = new wangConnectionConstraint();
      }

      this.graph.connectCell(edge, terminal, isSource, constraint);
    } finally {
      model.endUpdate();
    }

    return edge;
  }

  changeTerminalPoint(edge, point, isSource, clone) {
    let model = this.graph.getModel();
    model.beginUpdate();

    try {
      if (clone) {
        let parent = model.getParent(edge);
        let terminal = model.getTerminal(edge, !isSource);
        edge = this.graph.cloneCell(edge);
        model.add(parent, edge, model.getChildCount(parent));
        model.setTerminal(edge, terminal, !isSource);
      }

      let geo = model.getGeometry(edge);

      if (geo != null) {
        geo = geo.clone();
        geo.setTerminalPoint(point, isSource);
        model.setGeometry(edge, geo);
        this.graph.connectCell(edge, null, isSource, new wangConnectionConstraint());
      }
    } finally {
      model.endUpdate();
    }

    return edge;
  }

  changePoints(edge, points, clone) {
    let model = this.graph.getModel();
    model.beginUpdate();

    try {
      if (clone) {
        let parent = model.getParent(edge);
        let source = model.getTerminal(edge, true);
        let target = model.getTerminal(edge, false);
        edge = this.graph.cloneCell(edge);
        model.add(parent, edge, model.getChildCount(parent));
        model.setTerminal(edge, source, true);
        model.setTerminal(edge, target, false);
      }

      let geo = model.getGeometry(edge);

      if (geo != null) {
        geo = geo.clone();
        geo.points = points;
        model.setGeometry(edge, geo);
      }
    } finally {
      model.endUpdate();
    }

    return edge;
  }

  addPoint(state, evt) {
    let pt = wangUtils.convertPoint(this.graph.container, wangEvent.getClientX(evt), wangEvent.getClientY(evt));
    let gridEnabled = this.graph.isGridEnabledEvent(evt);
    this.convertPoint(pt, gridEnabled);
    this.addPointAt(state, pt.x, pt.y);
    wangEvent.consume(evt);
  }

  addPointAt(state, x, y) {
    let geo = this.graph.getCellGeometry(state.cell);
    let pt = new wangPoint(x, y);

    if (geo != null) {
      geo = geo.clone();
      let t = this.graph.view.translate;
      let s = this.graph.view.scale;
      let offset = new wangPoint(t.x * s, t.y * s);
      let parent = this.graph.model.getParent(this.state.cell);

      if (this.graph.model.isVertex(parent)) {
        let pState = this.graph.view.getState(parent);
        offset = new wangPoint(pState.x, pState.y);
      }

      let index = wangUtils.findNearestSegment(state, pt.x * s + offset.x, pt.y * s + offset.y);

      if (geo.points == null) {
        geo.points = [pt];
      } else {
        geo.points.splice(index, 0, pt);
      }

      this.graph.getModel().setGeometry(state.cell, geo);
      this.refresh();
      this.redraw();
    }
  }

  removePoint(state, index) {
    if (index > 0 && index < this.abspoints.length - 1) {
      let geo = this.graph.getCellGeometry(this.state.cell);

      if (geo != null && geo.points != null) {
        geo = geo.clone();
        geo.points.splice(index - 1, 1);
        this.graph.getModel().setGeometry(state.cell, geo);
        this.refresh();
        this.redraw();
      }
    }
  }

  getHandleFillColor(index) {
    let isSource = index == 0;
    let cell = this.state.cell;
    let terminal = this.graph.getModel().getTerminal(cell, isSource);
    let color = wangConstants.HANDLE_FILLCOLOR;

    if (
      (terminal != null && !this.graph.isCellDisconnectable(cell, terminal, isSource)) ||
      (terminal == null && !this.graph.isTerminalPointMovable(cell, isSource))
    ) {
      color = wangConstants.LOCKED_HANDLE_FILLCOLOR;
    } else if (terminal != null && this.graph.isCellDisconnectable(cell, terminal, isSource)) {
      color = wangConstants.CONNECT_HANDLE_FILLCOLOR;
    }

    return color;
  }

  redraw(ignoreHandles) {
    this.abspoints = this.state.absolutePoints.slice();
    let g = this.graph.getModel().getGeometry(this.state.cell);

    if (g != null) {
      let pts = g.points;

      if (this.bends != null && this.bends.length > 0) {
        if (pts != null) {
          if (this.points == null) {
            this.points = [];
          }

          for (let i = 1; i < this.bends.length - 1; i++) {
            if (this.bends[i] != null && this.abspoints[i] != null) {
              this.points[i - 1] = pts[i - 1];
            }
          }
        }
      }
    }

    this.drawPreview();

    if (!ignoreHandles) {
      this.redrawHandles();
    }
  }

  redrawHandles() {
    let cell = this.state.cell;
    let b = this.labelShape.bounds;
    this.label = new wangPoint(this.state.absoluteOffset.x, this.state.absoluteOffset.y);
    this.labelShape.bounds = new wangRectangle(
      Math.round(this.label.x - b.width / 2),
      Math.round(this.label.y - b.height / 2),
      b.width,
      b.height
    );
    let lab = this.graph.getLabel(cell);
    this.labelShape.visible = lab != null && lab.length > 0 && this.graph.isLabelMovable(cell);

    if (this.bends != null && this.bends.length > 0) {
      let n = this.abspoints.length - 1;
      let p0 = this.abspoints[0];
      let x0 = p0.x;
      let y0 = p0.y;
      b = this.bends[0].bounds;
      this.bends[0].bounds = new wangRectangle(
        Math.floor(x0 - b.width / 2),
        Math.floor(y0 - b.height / 2),
        b.width,
        b.height
      );
      this.bends[0].fill = this.getHandleFillColor(0);
      this.bends[0].redraw();

      if (this.manageLabelHandle) {
        this.checkLabelHandle(this.bends[0].bounds);
      }

      let pe = this.abspoints[n];
      let xn = pe.x;
      let yn = pe.y;
      let bn = this.bends.length - 1;
      b = this.bends[bn].bounds;
      this.bends[bn].bounds = new wangRectangle(
        Math.floor(xn - b.width / 2),
        Math.floor(yn - b.height / 2),
        b.width,
        b.height
      );
      this.bends[bn].fill = this.getHandleFillColor(bn);
      this.bends[bn].redraw();

      if (this.manageLabelHandle) {
        this.checkLabelHandle(this.bends[bn].bounds);
      }

      this.redrawInnerBends(p0, pe);
    }

    if (this.abspoints != null && this.virtualBends != null && this.virtualBends.length > 0) {
      let last = this.abspoints[0];

      for (let i = 0; i < this.virtualBends.length; i++) {
        if (this.virtualBends[i] != null && this.abspoints[i + 1] != null) {
          let pt = this.abspoints[i + 1];
          let b = this.virtualBends[i];
          let x = last.x + (pt.x - last.x) / 2;
          let y = last.y + (pt.y - last.y) / 2;
          b.bounds = new wangRectangle(
            Math.floor(x - b.bounds.width / 2),
            Math.floor(y - b.bounds.height / 2),
            b.bounds.width,
            b.bounds.height
          );
          b.redraw();
          wangUtils.setOpacity(b.node, this.virtualBendOpacity);
          last = pt;

          if (this.manageLabelHandle) {
            this.checkLabelHandle(b.bounds);
          }
        }
      }
    }

    if (this.labelShape != null) {
      this.labelShape.redraw();
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        let temp = this.customHandles[i].shape.node.style.display;
        this.customHandles[i].redraw();
        this.customHandles[i].shape.node.style.display = temp;
        this.customHandles[i].shape.node.style.visibility = this.isCustomHandleVisible(this.customHandles[i])
          ? ''
          : 'hidden';
      }
    }
  }

  isCustomHandleVisible(handle) {
    return !this.graph.isEditing() && this.state.view.graph.getSelectionCount() == 1;
  }

  setHandlesVisible(visible) {
    if (this.bends != null) {
      for (let i = 0; i < this.bends.length; i++) {
        this.bends[i].node.style.display = visible ? '' : 'none';
      }
    }

    if (this.virtualBends != null) {
      for (let i = 0; i < this.virtualBends.length; i++) {
        this.virtualBends[i].node.style.display = visible ? '' : 'none';
      }
    }

    if (this.labelShape != null) {
      this.labelShape.node.style.display = visible ? '' : 'none';
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        this.customHandles[i].setVisible(visible);
      }
    }
  }

  redrawInnerBends(p0, pe) {
    for (let i = 1; i < this.bends.length - 1; i++) {
      if (this.bends[i] != null) {
        if (this.abspoints[i] != null) {
          let x = this.abspoints[i].x;
          let y = this.abspoints[i].y;
          let b = this.bends[i].bounds;
          this.bends[i].node.style.visibility = 'visible';
          this.bends[i].bounds = new wangRectangle(
            Math.round(x - b.width / 2),
            Math.round(y - b.height / 2),
            b.width,
            b.height
          );

          if (this.manageLabelHandle) {
            this.checkLabelHandle(this.bends[i].bounds);
          } else if (
            this.handleImage == null &&
            this.labelShape.visible &&
            wangUtils.intersects(this.bends[i].bounds, this.labelShape.bounds)
          ) {
            let w = wangConstants.HANDLE_SIZE + 3;
            let h = wangConstants.HANDLE_SIZE + 3;
            this.bends[i].bounds = new wangRectangle(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
          }

          this.bends[i].redraw();
        } else {
          this.bends[i].destroy();
          this.bends[i] = null;
        }
      }
    }
  }

  checkLabelHandle(b) {
    if (this.labelShape != null) {
      let b2 = this.labelShape.bounds;

      if (wangUtils.intersects(b, b2)) {
        if (b.getCenterY() < b2.getCenterY()) {
          b2.y = b.y + b.height;
        } else {
          b2.y = b.y - b2.height;
        }
      }
    }
  }

  drawPreview() {
    if (this.isLabel) {
      let b = this.labelShape.bounds;
      let bounds = new wangRectangle(
        Math.round(this.label.x - b.width / 2),
        Math.round(this.label.y - b.height / 2),
        b.width,
        b.height
      );

      if (!this.labelShape.bounds.equals(bounds)) {
        this.labelShape.bounds = bounds;
        this.labelShape.redraw();
      }
    }

    if (this.shape != null && !wangUtils.equalPoints(this.shape.points, this.abspoints)) {
      this.shape.apply(this.state);
      this.shape.points = this.abspoints.slice();
      this.shape.scale = this.state.view.scale;
      this.shape.isDashed = this.isSelectionDashed();
      this.shape.stroke = this.getSelectionColor();
      this.shape.strokewidth = this.getSelectionStrokeWidth() / this.shape.scale / this.shape.scale;
      this.shape.isShadow = false;
      this.shape.redraw();
    }

    if (this.parentHighlight != null) {
      this.parentHighlight.redraw();
    }
  }

  refresh() {
    this.abspoints = this.getSelectionPoints(this.state);
    this.points = [];

    if (this.bends != null) {
      this.destroyBends(this.bends);
      this.bends = this.createBends();
    }

    if (this.virtualBends != null) {
      this.destroyBends(this.virtualBends);
      this.virtualBends = this.createVirtualBends();
    }

    if (this.customHandles != null) {
      this.destroyBends(this.customHandles);
      this.customHandles = this.createCustomHandles();
    }

    if (this.labelShape != null && this.labelShape.node != null && this.labelShape.node.parentNode != null) {
      this.labelShape.node.parentNode.appendChild(this.labelShape.node);
    }
  }

  destroyBends(bends) {
    if (bends != null) {
      for (let i = 0; i < bends.length; i++) {
        if (bends[i] != null) {
          bends[i].destroy();
        }
      }
    }
  }

  destroy() {
    if (this.escapeHandler != null) {
      this.state.view.graph.removeListener(this.escapeHandler);
      this.escapeHandler = null;
    }

    if (this.marker != null) {
      this.marker.destroy();
      this.marker = null;
    }

    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    if (this.parentHighlight != null) {
      this.parentHighlight.destroy();
      this.parentHighlight = null;
    }

    if (this.labelShape != null) {
      this.labelShape.destroy();
      this.labelShape = null;
    }

    if (this.constraintHandler != null) {
      this.constraintHandler.destroy();
      this.constraintHandler = null;
    }

    this.destroyBends(this.virtualBends);
    this.virtualBends = null;
    this.destroyBends(this.customHandles);
    this.customHandles = null;
    this.destroyBends(this.bends);
    this.bends = null;
    this.removeHint();
  }
}
