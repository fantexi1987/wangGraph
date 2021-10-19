import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangCell } from '@wangGraph/model/wangCell';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangGeometry } from '@wangGraph/model/wangGeometry';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangMouseEvent } from '@wangGraph/util/wangMouseEvent';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { ConnectionCellMarker } from '@wangGraph/handler/ConnectionCellMarker';
import { wangConstraintHandler } from '@wangGraph/handler/wangConstraintHandler';
import { wangPolyline } from '@wangGraph/shape/wangPolyline';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangConnectionHandler extends wangEventSource {
  graph = null;
  factoryMethod = true;
  moveIconFront = false;
  moveIconBack = false;
  connectImage = null;
  targetConnectImage = false;
  enabled = true;
  select = true;
  createTarget = false;
  marker = null;
  constraintHandler = null;
  error = null;
  waypointsEnabled = false;
  ignoreMouseDown = false;
  first = null;
  connectIconOffset = new wangPoint(0, wangConstants.TOOLTIP_VERTICAL_OFFSET);
  edgeState = null;
  changeHandler = null;
  drillHandler = null;
  mouseDownCounter = 0;
  movePreviewAway = false;
  outlineConnect = false;
  livePreview = false;
  cursor = null;
  insertBeforeSource = false;

  constructor(graph, factoryMethod) {
    super();

    if (graph != null) {
      this.graph = graph;
      this.factoryMethod = factoryMethod;
      this.init();

      this.escapeHandler = (sender, evt) => {
        this.reset();
      };

      this.graph.addListener(wangEvent.ESCAPE, this.escapeHandler);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  isInsertBefore(edge, source, target, evt, dropTarget) {
    return this.insertBeforeSource && source != target;
  }

  isCreateTarget(evt) {
    return this.createTarget;
  }

  setCreateTarget(value) {
    this.createTarget = value;
  }

  createShape() {
    let shape =
      this.livePreview && this.edgeState != null
        ? this.graph.cellRenderer.createShape(this.edgeState)
        : new wangPolyline([], wangConstants.INVALID_COLOR);
    shape.dialect =
      this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
    shape.scale = this.graph.view.scale;
    shape.pointerEvents = false;
    shape.isDashed = true;
    shape.init(this.graph.getView().getOverlayPane());
    wangEvent.redirectMouseEvents(shape.node, this.graph, null);
    return shape;
  }

  init() {
    this.graph.addMouseListener(this);
    this.marker = this.createMarker();
    this.constraintHandler = new wangConstraintHandler(this.graph);

    this.changeHandler = (sender) => {
      if (this.iconState != null) {
        this.iconState = this.graph.getView().getState(this.iconState.cell);
      }

      if (this.iconState != null) {
        this.redrawIcons(this.icons, this.iconState);
        this.constraintHandler.reset();
      } else if (this.previous != null && this.graph.view.getState(this.previous.cell) == null) {
        this.reset();
      }
    };

    this.graph.getModel().addListener(wangEvent.CHANGE, this.changeHandler);
    this.graph.getView().addListener(wangEvent.SCALE, this.changeHandler);
    this.graph.getView().addListener(wangEvent.TRANSLATE, this.changeHandler);
    this.graph.getView().addListener(wangEvent.SCALE_AND_TRANSLATE, this.changeHandler);

    this.drillHandler = (sender) => {
      this.reset();
    };

    this.graph.addListener(wangEvent.START_EDITING, this.drillHandler);
    this.graph.getView().addListener(wangEvent.DOWN, this.drillHandler);
    this.graph.getView().addListener(wangEvent.UP, this.drillHandler);
  }

  isConnectableCell(cell) {
    return true;
  }

  createMarker() {
    let marker = new ConnectionCellMarker(this, true, this.graph);
    return marker;
  }

  start(state, x, y, edgeState) {
    this.previous = state;
    this.first = new wangPoint(x, y);
    this.edgeState = edgeState != null ? edgeState : this.createEdgeState(null);
    this.marker.currentColor = this.marker.validColor;
    this.marker.markedState = state;
    this.marker.mark();
    this.fireEvent(new wangEventObject(wangEvent.START, 'state', this.previous));
  }

  isConnecting() {
    return this.first != null && this.shape != null;
  }

  isValidSource(cell, me) {
    return this.graph.isValidSource(cell);
  }

  isValidTarget(cell) {
    return true;
  }

  validateConnection(source, target) {
    if (!this.isValidTarget(target)) {
      return '';
    }

    return this.graph.getEdgeValidationError(null, source, target);
  }

  getConnectImage(state) {
    return this.connectImage;
  }

  isMoveIconToFrontForState(state) {
    if (state.text != null && state.text.node.parentNode == this.graph.container) {
      return true;
    }

    return this.moveIconFront;
  }

  createIcons(state) {
    let image = this.getConnectImage(state);

    if (image != null && state != null) {
      this.iconState = state;
      let icons = [];
      let bounds = new wangRectangle(0, 0, image.width, image.height);
      let icon = new wangImageShape(bounds, image.src, null, null, 0);
      icon.preserveImageAspect = false;

      if (this.isMoveIconToFrontForState(state)) {
        icon.dialect = wangConstants.DIALECT_STRICTHTML;
        icon.init(this.graph.container);
      } else {
        icon.dialect =
          this.graph.dialect == wangConstants.DIALECT_SVG ? wangConstants.DIALECT_SVG : wangConstants.DIALECT_VML;
        icon.init(this.graph.getView().getOverlayPane());

        if (this.moveIconBack && icon.node.previousSibling != null) {
          icon.node.parentNode.insertBefore(icon.node, icon.node.parentNode.firstChild);
        }
      }

      icon.node.style.cursor = wangConstants.CURSOR_CONNECT;

      let getState = () => {
        return this.currentState != null ? this.currentState : state;
      };

      let mouseDown = (evt) => {
        if (!wangEvent.isConsumed(evt)) {
          this.icon = icon;
          this.graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt, getState()));
        }
      };

      wangEvent.redirectMouseEvents(icon.node, this.graph, getState, mouseDown);
      icons.push(icon);
      this.redrawIcons(icons, this.iconState);
      return icons;
    }

    return null;
  }

  redrawIcons(icons, state) {
    if (icons != null && icons[0] != null && state != null) {
      let pos = this.getIconPosition(icons[0], state);
      icons[0].bounds.x = pos.x;
      icons[0].bounds.y = pos.y;
      icons[0].redraw();
    }
  }

  getIconPosition(icon, state) {
    let scale = this.graph.getView().scale;
    let cx = state.getCenterX();
    let cy = state.getCenterY();

    if (this.graph.isSwimlane(state.cell)) {
      let size = this.graph.getStartSize(state.cell);
      cx = size.width != 0 ? state.x + (size.width * scale) / 2 : cx;
      cy = size.height != 0 ? state.y + (size.height * scale) / 2 : cy;
      let alpha = wangUtils.toRadians(wangUtils.getValue(state.style, wangConstants.STYLE_ROTATION) || 0);

      if (alpha != 0) {
        let cos = Math.cos(alpha);
        let sin = Math.sin(alpha);
        let ct = new wangPoint(state.getCenterX(), state.getCenterY());
        let pt = wangUtils.getRotatedPoint(new wangPoint(cx, cy), cos, sin, ct);
        cx = pt.x;
        cy = pt.y;
      }
    }

    return new wangPoint(cx - icon.bounds.width / 2, cy - icon.bounds.height / 2);
  }

  destroyIcons() {
    if (this.icons != null) {
      for (let i = 0; i < this.icons.length; i++) {
        this.icons[i].destroy();
      }

      this.icons = null;
      this.icon = null;
      this.selectedIcon = null;
      this.iconState = null;
    }
  }

  isStartEvent(me) {
    return (
      (this.constraintHandler.currentFocus != null && this.constraintHandler.currentConstraint != null) ||
      (this.previous != null && this.error == null && (this.icons == null || (this.icons != null && this.icon != null)))
    );
  }

  mouseDown(sender, me) {
    this.mouseDownCounter++;

    if (
      this.isEnabled() &&
      this.graph.isEnabled() &&
      !me.isConsumed() &&
      !this.isConnecting() &&
      this.isStartEvent(me)
    ) {
      if (
        this.constraintHandler.currentConstraint != null &&
        this.constraintHandler.currentFocus != null &&
        this.constraintHandler.currentPoint != null
      ) {
        this.sourceConstraint = this.constraintHandler.currentConstraint;
        this.previous = this.constraintHandler.currentFocus;
        this.first = this.constraintHandler.currentPoint.clone();
      } else {
        this.first = new wangPoint(me.getGraphX(), me.getGraphY());
      }

      this.edgeState = this.createEdgeState(me);
      this.mouseDownCounter = 1;

      if (this.waypointsEnabled && this.shape == null) {
        this.waypoints = null;
        this.shape = this.createShape();

        if (this.edgeState != null) {
          this.shape.apply(this.edgeState);
        }
      }

      if (this.previous == null && this.edgeState != null) {
        let pt = this.graph.getPointForEvent(me.getEvent());
        this.edgeState.cell.geometry.setTerminalPoint(pt, true);
      }

      this.fireEvent(new wangEventObject(wangEvent.START, 'state', this.previous));
      me.consume();
    }

    this.selectedIcon = this.icon;
    this.icon = null;
  }

  isImmediateConnectSource(state) {
    return !this.graph.isCellMovable(state.cell);
  }

  createEdgeState(me) {
    return null;
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

  updateCurrentState(me, point) {
    this.constraintHandler.update(
      me,
      this.first == null,
      false,
      this.first == null || me.isSource(this.marker.highlight.shape) ? null : point
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

      if (this.previous != null) {
        this.error = this.validateConnection(this.previous.cell, this.constraintHandler.currentFocus.cell);

        if (this.error == null) {
          this.currentState = this.constraintHandler.currentFocus;
        }

        if (this.error != null || (this.currentState != null && !this.isCellEnabled(this.currentState.cell))) {
          this.constraintHandler.reset();
        }
      }
    } else {
      if (this.graph.isIgnoreTerminalEvent(me.getEvent())) {
        this.marker.reset();
        this.currentState = null;
      } else {
        this.marker.process(me);
        this.currentState = this.marker.getValidState();
      }

      if (this.currentState != null && !this.isCellEnabled(this.currentState.cell)) {
        this.constraintHandler.reset();
        this.marker.reset();
        this.currentState = null;
      }

      let outline = this.isOutlineConnectEvent(me);

      if (this.currentState != null && outline) {
        if (me.isSource(this.marker.highlight.shape)) {
          point = new wangPoint(me.getGraphX(), me.getGraphY());
        }

        let constraint = this.graph.getOutlineConstraint(point, this.currentState, me);
        this.constraintHandler.setFocus(me, this.currentState, false);
        this.constraintHandler.currentConstraint = constraint;
        this.constraintHandler.currentPoint = point;
      }

      if (this.outlineConnect) {
        if (this.marker.highlight != null && this.marker.highlight.shape != null) {
          let s = this.graph.view.scale;

          if (this.constraintHandler.currentConstraint != null && this.constraintHandler.currentFocus != null) {
            this.marker.highlight.shape.stroke = wangConstants.OUTLINE_HIGHLIGHT_COLOR;
            this.marker.highlight.shape.strokewidth = wangConstants.OUTLINE_HIGHLIGHT_STROKEWIDTH / s / s;
            this.marker.highlight.repaint();
          } else if (this.marker.hasValidState()) {
            if (this.graph.isCellConnectable(me.getCell()) && this.marker.getValidState() != me.getState()) {
              this.marker.highlight.shape.stroke = 'transparent';
              this.currentState = null;
            } else {
              this.marker.highlight.shape.stroke = wangConstants.DEFAULT_VALID_COLOR;
            }

            this.marker.highlight.shape.strokewidth = wangConstants.HIGHLIGHT_STROKEWIDTH / s / s;
            this.marker.highlight.repaint();
          }
        }
      }
    }
  }

  isCellEnabled(cell) {
    return true;
  }

  convertWaypoint(point) {
    let scale = this.graph.getView().getScale();
    let tr = this.graph.getView().getTranslate();
    point.x = point.x / scale - tr.x;
    point.y = point.y / scale - tr.y;
  }

  snapToPreview(me, point) {
    if (!wangEvent.isAltDown(me.getEvent()) && this.previous != null) {
      let tol = (this.graph.gridSize * this.graph.view.scale) / 2;
      let tmp =
        this.sourceConstraint != null
          ? this.first
          : new wangPoint(this.previous.getCenterX(), this.previous.getCenterY());

      if (Math.abs(tmp.x - me.getGraphX()) < tol) {
        point.x = tmp.x;
      }

      if (Math.abs(tmp.y - me.getGraphY()) < tol) {
        point.y = tmp.y;
      }
    }
  }

  mouseMove(sender, me) {
    if (!me.isConsumed() && (this.ignoreMouseDown || this.first != null || !this.graph.isMouseDown)) {
      if (!this.isEnabled() && this.currentState != null) {
        this.destroyIcons();
        this.currentState = null;
      }

      let view = this.graph.getView();
      let scale = view.scale;
      let tr = view.translate;
      let point = new wangPoint(me.getGraphX(), me.getGraphY());
      this.error = null;

      if (this.graph.isGridEnabledEvent(me.getEvent())) {
        point = new wangPoint(
          (this.graph.snap(point.x / scale - tr.x) + tr.x) * scale,
          (this.graph.snap(point.y / scale - tr.y) + tr.y) * scale
        );
      }

      this.snapToPreview(me, point);
      this.currentPoint = point;

      if (
        (this.first != null || (this.isEnabled() && this.graph.isEnabled())) &&
        (this.shape != null ||
          this.first == null ||
          Math.abs(me.getGraphX() - this.first.x) > this.graph.tolerance ||
          Math.abs(me.getGraphY() - this.first.y) > this.graph.tolerance)
      ) {
        this.updateCurrentState(me, point);
      }

      if (this.first != null) {
        let constraint = null;
        let current = point;

        if (
          this.constraintHandler.currentConstraint != null &&
          this.constraintHandler.currentFocus != null &&
          this.constraintHandler.currentPoint != null
        ) {
          constraint = this.constraintHandler.currentConstraint;
          current = this.constraintHandler.currentPoint.clone();
        } else if (
          this.previous != null &&
          !this.graph.isIgnoreTerminalEvent(me.getEvent()) &&
          wangEvent.isShiftDown(me.getEvent())
        ) {
          if (Math.abs(this.previous.getCenterX() - point.x) < Math.abs(this.previous.getCenterY() - point.y)) {
            point.x = this.previous.getCenterX();
          } else {
            point.y = this.previous.getCenterY();
          }
        }

        let pt2 = this.first;

        if (this.selectedIcon != null) {
          let w = this.selectedIcon.bounds.width;
          let h = this.selectedIcon.bounds.height;

          if (this.currentState != null && this.targetConnectImage) {
            let pos = this.getIconPosition(this.selectedIcon, this.currentState);
            this.selectedIcon.bounds.x = pos.x;
            this.selectedIcon.bounds.y = pos.y;
          } else {
            let bounds = new wangRectangle(
              me.getGraphX() + this.connectIconOffset.x,
              me.getGraphY() + this.connectIconOffset.y,
              w,
              h
            );
            this.selectedIcon.bounds = bounds;
          }

          this.selectedIcon.redraw();
        }

        if (this.edgeState != null) {
          this.updateEdgeState(current, constraint);
          current = this.edgeState.absolutePoints[this.edgeState.absolutePoints.length - 1];
          pt2 = this.edgeState.absolutePoints[0];
        } else {
          if (this.currentState != null) {
            if (this.constraintHandler.currentConstraint == null) {
              let tmp = this.getTargetPerimeterPoint(this.currentState, me);

              if (tmp != null) {
                current = tmp;
              }
            }
          }

          if (this.sourceConstraint == null && this.previous != null) {
            let next = this.waypoints != null && this.waypoints.length > 0 ? this.waypoints[0] : current;
            let tmp = this.getSourcePerimeterPoint(this.previous, next, me);

            if (tmp != null) {
              pt2 = tmp;
            }
          }
        }

        if (this.currentState == null && this.movePreviewAway) {
          let tmp = pt2;

          if (this.edgeState != null && this.edgeState.absolutePoints.length >= 2) {
            let tmp2 = this.edgeState.absolutePoints[this.edgeState.absolutePoints.length - 2];

            if (tmp2 != null) {
              tmp = tmp2;
            }
          }

          let dx = current.x - tmp.x;
          let dy = current.y - tmp.y;
          let len = Math.sqrt(dx * dx + dy * dy);

          if (len == 0) {
            return;
          }

          this.originalPoint = current.clone();
          current.x -= (dx * 4) / len;
          current.y -= (dy * 4) / len;
        } else {
          this.originalPoint = null;
        }

        if (this.shape == null) {
          let dx = Math.abs(me.getGraphX() - this.first.x);
          let dy = Math.abs(me.getGraphY() - this.first.y);

          if (dx > this.graph.tolerance || dy > this.graph.tolerance) {
            this.shape = this.createShape();

            if (this.edgeState != null) {
              this.shape.apply(this.edgeState);
            }

            this.updateCurrentState(me, point);
          }
        }

        if (this.shape != null) {
          if (this.edgeState != null) {
            this.shape.points = this.edgeState.absolutePoints;
          } else {
            let pts = [pt2];

            if (this.waypoints != null) {
              pts = pts.concat(this.waypoints);
            }

            pts.push(current);
            this.shape.points = pts;
          }

          this.drawPreview();
        }

        if (this.cursor != null) {
          this.graph.container.style.cursor = this.cursor;
        }

        wangEvent.consume(me.getEvent());
        me.consume();
      } else if (!this.isEnabled() || !this.graph.isEnabled()) {
        this.constraintHandler.reset();
      } else if (this.previous != this.currentState && this.edgeState == null) {
        this.destroyIcons();

        if (this.currentState != null && this.error == null && this.constraintHandler.currentConstraint == null) {
          this.icons = this.createIcons(this.currentState);

          if (this.icons == null) {
            this.currentState.setCursor(wangConstants.CURSOR_CONNECT);
            me.consume();
          }
        }

        this.previous = this.currentState;
      } else if (
        this.previous == this.currentState &&
        this.currentState != null &&
        this.icons == null &&
        !this.graph.isMouseDown
      ) {
        me.consume();
      }

      if (!this.graph.isMouseDown && this.currentState != null && this.icons != null) {
        let hitsIcon = false;
        let target = me.getSource();

        for (let i = 0; i < this.icons.length && !hitsIcon; i++) {
          hitsIcon = target == this.icons[i].node || target.parentNode == this.icons[i].node;
        }

        if (!hitsIcon) {
          this.updateIcons(this.currentState, this.icons, me);
        }
      }
    } else {
      this.constraintHandler.reset();
    }
  }

  updateEdgeState(current, constraint) {
    if (this.sourceConstraint != null && this.sourceConstraint.point != null) {
      this.edgeState.style[wangConstants.STYLE_EXIT_X] = this.sourceConstraint.point.x;
      this.edgeState.style[wangConstants.STYLE_EXIT_Y] = this.sourceConstraint.point.y;
    }

    if (constraint != null && constraint.point != null) {
      this.edgeState.style[wangConstants.STYLE_ENTRY_X] = constraint.point.x;
      this.edgeState.style[wangConstants.STYLE_ENTRY_Y] = constraint.point.y;
    } else {
      delete this.edgeState.style[wangConstants.STYLE_ENTRY_X];
      delete this.edgeState.style[wangConstants.STYLE_ENTRY_Y];
    }

    this.edgeState.absolutePoints = [null, this.currentState != null ? null : current];
    this.graph.view.updateFixedTerminalPoint(this.edgeState, this.previous, true, this.sourceConstraint);

    if (this.currentState != null) {
      if (constraint == null) {
        constraint = this.graph.getConnectionConstraint(this.edgeState, this.previous, false);
      }

      this.edgeState.setAbsoluteTerminalPoint(null, false);
      this.graph.view.updateFixedTerminalPoint(this.edgeState, this.currentState, false, constraint);
    }

    let realPoints = null;

    if (this.waypoints != null) {
      realPoints = [];

      for (let i = 0; i < this.waypoints.length; i++) {
        let pt = this.waypoints[i].clone();
        this.convertWaypoint(pt);
        realPoints[i] = pt;
      }
    }

    this.graph.view.updatePoints(this.edgeState, realPoints, this.previous, this.currentState);
    this.graph.view.updateFloatingTerminalPoints(this.edgeState, this.previous, this.currentState);
  }

  getTargetPerimeterPoint(state, me) {
    let result = null;
    let view = state.view;
    let targetPerimeter = view.getPerimeterFunction(state);

    if (targetPerimeter != null) {
      let next =
        this.waypoints != null && this.waypoints.length > 0
          ? this.waypoints[this.waypoints.length - 1]
          : new wangPoint(this.previous.getCenterX(), this.previous.getCenterY());
      let tmp = targetPerimeter(view.getPerimeterBounds(state), this.edgeState, next, false);

      if (tmp != null) {
        result = tmp;
      }
    } else {
      result = new wangPoint(state.getCenterX(), state.getCenterY());
    }

    return result;
  }

  getSourcePerimeterPoint(state, next, me) {
    let result = null;
    let view = state.view;
    let sourcePerimeter = view.getPerimeterFunction(state);
    let c = new wangPoint(state.getCenterX(), state.getCenterY());

    if (sourcePerimeter != null) {
      let theta = wangUtils.getValue(state.style, wangConstants.STYLE_ROTATION, 0);
      let rad = -theta * (Math.PI / 180);

      if (theta != 0) {
        next = wangUtils.getRotatedPoint(new wangPoint(next.x, next.y), Math.cos(rad), Math.sin(rad), c);
      }

      let tmp = sourcePerimeter(view.getPerimeterBounds(state), state, next, false);

      if (tmp != null) {
        if (theta != 0) {
          tmp = wangUtils.getRotatedPoint(new wangPoint(tmp.x, tmp.y), Math.cos(-rad), Math.sin(-rad), c);
        }

        result = tmp;
      }
    } else {
      result = c;
    }

    return result;
  }

  updateIcons(state, icons, me) {}

  isStopEvent(me) {
    return me.getState() != null;
  }

  addWaypointForEvent(me) {
    let point = wangUtils.convertPoint(this.graph.container, me.getX(), me.getY());
    let dx = Math.abs(point.x - this.first.x);
    let dy = Math.abs(point.y - this.first.y);
    let addPoint =
      this.waypoints != null || (this.mouseDownCounter > 1 && (dx > this.graph.tolerance || dy > this.graph.tolerance));

    if (addPoint) {
      if (this.waypoints == null) {
        this.waypoints = [];
      }

      let scale = this.graph.view.scale;
      let point = new wangPoint(
        this.graph.snap(me.getGraphX() / scale) * scale,
        this.graph.snap(me.getGraphY() / scale) * scale
      );
      this.waypoints.push(point);
    }
  }

  checkConstraints(c1, c2) {
    return (
      c1 == null ||
      c2 == null ||
      c1.point == null ||
      c2.point == null ||
      !c1.point.equals(c2.point) ||
      c1.dx != c2.dx ||
      c1.dy != c2.dy ||
      c1.perimeter != c2.perimeter
    );
  }

  mouseUp(sender, me) {
    if (!me.isConsumed() && this.isConnecting()) {
      if (this.waypointsEnabled && !this.isStopEvent(me)) {
        this.addWaypointForEvent(me);
        me.consume();
        return;
      }

      let c1 = this.sourceConstraint;
      let c2 = this.constraintHandler.currentConstraint;
      let source = this.previous != null ? this.previous.cell : null;
      let target = null;

      if (this.constraintHandler.currentConstraint != null && this.constraintHandler.currentFocus != null) {
        target = this.constraintHandler.currentFocus.cell;
      }

      if (target == null && this.currentState != null) {
        target = this.currentState.cell;
      }

      if (
        this.error == null &&
        (source == null || target == null || source != target || this.checkConstraints(c1, c2))
      ) {
        this.connect(source, target, me.getEvent(), me.getCell());
      } else {
        if (
          this.previous != null &&
          this.marker.validState != null &&
          this.previous.cell == this.marker.validState.cell
        ) {
          this.graph.selectCellForEvent(this.marker.source, me.getEvent());
        }

        if (this.error != null && this.error.length > 0) {
          this.graph.validationAlert(this.error);
        }
      }

      this.destroyIcons();
      me.consume();
    }

    if (this.first != null) {
      this.reset();
    }
  }

  reset() {
    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    if (this.cursor != null && this.graph.container != null) {
      this.graph.container.style.cursor = '';
    }

    this.destroyIcons();
    this.marker.reset();
    this.constraintHandler.reset();
    this.originalPoint = null;
    this.currentPoint = null;
    this.edgeState = null;
    this.previous = null;
    this.error = null;
    this.sourceConstraint = null;
    this.mouseDownCounter = 0;
    this.first = null;
    this.fireEvent(new wangEventObject(wangEvent.RESET));
  }

  drawPreview() {
    this.updatePreview(this.error == null);
    this.shape.redraw();
  }

  updatePreview(valid) {
    this.shape.strokewidth = this.getEdgeWidth(valid);
    this.shape.stroke = this.getEdgeColor(valid);
  }

  getEdgeColor(valid) {
    return valid ? wangConstants.VALID_COLOR : wangConstants.INVALID_COLOR;
  }

  getEdgeWidth(valid) {
    return valid ? 3 : 1;
  }

  connect(source, target, evt, dropTarget) {
    if (target != null || this.isCreateTarget(evt) || this.graph.allowDanglingEdges) {
      let model = this.graph.getModel();
      let terminalInserted = false;
      let edge = null;
      model.beginUpdate();

      try {
        if (source != null && target == null && !this.graph.isIgnoreTerminalEvent(evt) && this.isCreateTarget(evt)) {
          target = this.createTargetVertex(evt, source);

          if (target != null) {
            dropTarget = this.graph.getDropTarget([target], evt, dropTarget);
            terminalInserted = true;

            if (dropTarget == null || !this.graph.getModel().isEdge(dropTarget)) {
              let pstate = this.graph.getView().getState(dropTarget);

              if (pstate != null) {
                let tmp = model.getGeometry(target);
                tmp.x -= pstate.origin.x;
                tmp.y -= pstate.origin.y;
              }
            } else {
              dropTarget = this.graph.getDefaultParent();
            }

            this.graph.addCell(target, dropTarget);
          }
        }

        let parent = this.graph.getDefaultParent();

        if (
          source != null &&
          target != null &&
          model.getParent(source) == model.getParent(target) &&
          model.getParent(model.getParent(source)) != model.getRoot()
        ) {
          parent = model.getParent(source);

          if (
            source.geometry != null &&
            source.geometry.relative &&
            target.geometry != null &&
            target.geometry.relative
          ) {
            parent = model.getParent(parent);
          }
        }

        let value = null;
        let style = null;

        if (this.edgeState != null) {
          value = this.edgeState.cell.value;
          style = this.edgeState.cell.style;
        }

        edge = this.insertEdge(parent, null, value, source, target, style);

        if (edge != null) {
          this.graph.setConnectionConstraint(edge, source, true, this.sourceConstraint);
          this.graph.setConnectionConstraint(edge, target, false, this.constraintHandler.currentConstraint);

          if (this.edgeState != null) {
            model.setGeometry(edge, this.edgeState.cell.geometry);
          }

          let parent = model.getParent(source);

          if (this.isInsertBefore(edge, source, target, evt, dropTarget)) {
            let index = null;
            let tmp = source;

            while (tmp.parent != null && tmp.geometry != null && tmp.geometry.relative && tmp.parent != edge.parent) {
              tmp = this.graph.model.getParent(tmp);
            }

            if (tmp != null && tmp.parent != null && tmp.parent == edge.parent) {
              model.add(parent, edge, tmp.parent.getIndex(tmp));
            }
          }

          let geo = model.getGeometry(edge);

          if (geo == null) {
            geo = new wangGeometry();
            geo.relative = true;
            model.setGeometry(edge, geo);
          }

          if (this.waypoints != null && this.waypoints.length > 0) {
            let s = this.graph.view.scale;
            let tr = this.graph.view.translate;
            geo.points = [];

            for (let i = 0; i < this.waypoints.length; i++) {
              let pt = this.waypoints[i];
              geo.points.push(new wangPoint(pt.x / s - tr.x, pt.y / s - tr.y));
            }
          }

          if (target == null) {
            let t = this.graph.view.translate;
            let s = this.graph.view.scale;
            let pt =
              this.originalPoint != null
                ? new wangPoint(this.originalPoint.x / s - t.x, this.originalPoint.y / s - t.y)
                : new wangPoint(this.currentPoint.x / s - t.x, this.currentPoint.y / s - t.y);
            pt.x -= this.graph.panDx / this.graph.view.scale;
            pt.y -= this.graph.panDy / this.graph.view.scale;
            geo.setTerminalPoint(pt, false);
          }

          this.fireEvent(
            new wangEventObject(
              wangEvent.CONNECT,
              'cell',
              edge,
              'terminal',
              target,
              'event',
              evt,
              'target',
              dropTarget,
              'terminalInserted',
              terminalInserted
            )
          );
        }
      } catch (e) {
        wangLog.show();
        wangLog.debug(e.message);
      } finally {
        model.endUpdate();
      }

      if (this.select) {
        this.selectCells(edge, terminalInserted ? target : null);
      }
    }
  }

  selectCells(edge, target) {
    this.graph.setSelectionCell(edge);
  }

  insertEdge(parent, id, value, source, target, style) {
    if (this.factoryMethod == null) {
      return this.graph.insertEdge(parent, id, value, source, target, style);
    } else {
      let edge = this.createEdge(value, source, target, style);
      edge = this.graph.addEdge(edge, parent, source, target);
      return edge;
    }
  }

  createTargetVertex(evt, source) {
    let geo = this.graph.getCellGeometry(source);

    while (geo != null && geo.relative) {
      source = this.graph.getModel().getParent(source);
      geo = this.graph.getCellGeometry(source);
    }

    let clone = this.graph.cloneCell(source);
    geo = this.graph.getModel().getGeometry(clone);

    if (geo != null) {
      let t = this.graph.view.translate;
      let s = this.graph.view.scale;
      let point = new wangPoint(this.currentPoint.x / s - t.x, this.currentPoint.y / s - t.y);
      geo.x = Math.round(point.x - geo.width / 2 - this.graph.panDx / s);
      geo.y = Math.round(point.y - geo.height / 2 - this.graph.panDy / s);
      let tol = this.getAlignmentTolerance();

      if (tol > 0) {
        let sourceState = this.graph.view.getState(source);

        if (sourceState != null) {
          let x = sourceState.x / s - t.x;
          let y = sourceState.y / s - t.y;

          if (Math.abs(x - geo.x) <= tol) {
            geo.x = Math.round(x);
          }

          if (Math.abs(y - geo.y) <= tol) {
            geo.y = Math.round(y);
          }
        }
      }
    }

    return clone;
  }

  getAlignmentTolerance(evt) {
    return this.graph.isGridEnabled() ? this.graph.gridSize / 2 : this.graph.tolerance;
  }

  createEdge(value, source, target, style) {
    let edge = null;

    if (this.factoryMethod != null) {
      edge = this.factoryMethod(source, target, style);
    }

    if (edge == null) {
      edge = new wangCell(value || '');
      edge.setEdge(true);
      edge.setStyle(style);
      let geo = new wangGeometry();
      geo.relative = true;
      edge.setGeometry(geo);
    }

    return edge;
  }

  destroy() {
    this.graph.removeMouseListener(this);

    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    if (this.marker != null) {
      this.marker.destroy();
      this.marker = null;
    }

    if (this.constraintHandler != null) {
      this.constraintHandler.destroy();
      this.constraintHandler = null;
    }

    if (this.changeHandler != null) {
      this.graph.getModel().removeListener(this.changeHandler);
      this.graph.getView().removeListener(this.changeHandler);
      this.changeHandler = null;
    }

    if (this.drillHandler != null) {
      this.graph.removeListener(this.drillHandler);
      this.graph.getView().removeListener(this.drillHandler);
      this.drillHandler = null;
    }

    if (this.escapeHandler != null) {
      this.graph.removeListener(this.escapeHandler);
      this.escapeHandler = null;
    }
  }
}
