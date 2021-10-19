import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangClient } from '@wangGraph/wangClient';
import { wangImage } from '@wangGraph/util/wangImage';

export class wangConstraintHandler {
  pointImage = new wangImage(wangClient.imageBasePath + '/point.gif', 5, 5);
  enabled = true;
  highlightColor = wangConstants.DEFAULT_VALID_COLOR;

  constructor(graph) {
    this.graph = graph;

    this.resetHandler = (sender, evt) => {
      if (this.currentFocus != null && this.graph.view.getState(this.currentFocus.cell) == null) {
        this.reset();
      } else {
        this.redraw();
      }
    };

    this.graph.model.addListener(wangEvent.CHANGE, this.resetHandler);
    this.graph.view.addListener(wangEvent.SCALE_AND_TRANSLATE, this.resetHandler);
    this.graph.view.addListener(wangEvent.TRANSLATE, this.resetHandler);
    this.graph.view.addListener(wangEvent.SCALE, this.resetHandler);
    this.graph.addListener(wangEvent.ROOT, this.resetHandler);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  reset() {
    if (this.focusIcons != null) {
      for (let i = 0; i < this.focusIcons.length; i++) {
        this.focusIcons[i].destroy();
      }

      this.focusIcons = null;
    }

    if (this.focusHighlight != null) {
      this.focusHighlight.destroy();
      this.focusHighlight = null;
    }

    this.currentConstraint = null;
    this.currentFocusArea = null;
    this.currentPoint = null;
    this.currentFocus = null;
    this.focusPoints = null;
  }

  getTolerance(me) {
    return this.graph.getTolerance();
  }

  getImageForConstraint(state, constraint, point) {
    return this.pointImage;
  }

  isEventIgnored(me, source) {
    return false;
  }

  isStateIgnored(state, source) {
    return false;
  }

  destroyIcons() {
    if (this.focusIcons != null) {
      for (let i = 0; i < this.focusIcons.length; i++) {
        this.focusIcons[i].destroy();
      }

      this.focusIcons = null;
      this.focusPoints = null;
    }
  }

  destroyFocusHighlight() {
    if (this.focusHighlight != null) {
      this.focusHighlight.destroy();
      this.focusHighlight = null;
    }
  }

  isKeepFocusEvent(me) {
    return wangEvent.isShiftDown(me.getEvent());
  }

  getCellForEvent(me, point) {
    let cell = me.getCell();

    if (cell == null && point != null && (me.getGraphX() != point.x || me.getGraphY() != point.y)) {
      cell = this.graph.getCellAt(point.x, point.y);
    }

    if (cell != null && !this.graph.isCellConnectable(cell)) {
      let parent = this.graph.getModel().getParent(cell);

      if (this.graph.getModel().isVertex(parent) && this.graph.isCellConnectable(parent)) {
        cell = parent;
      }
    }

    return this.graph.isCellLocked(cell) ? null : cell;
  }

  update(me, source, existingEdge, point) {
    if (this.isEnabled() && !this.isEventIgnored(me)) {
      if (this.mouseleaveHandler == null && this.graph.container != null) {
        this.mouseleaveHandler = () => {
          this.reset();
        };

        wangEvent.addListener(this.graph.container, 'mouseleave', this.resetHandler);
      }

      let tol = this.getTolerance(me);
      let x = point != null ? point.x : me.getGraphX();
      let y = point != null ? point.y : me.getGraphY();
      let grid = new wangRectangle(x - tol, y - tol, 2 * tol, 2 * tol);
      let mouse = new wangRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol);
      let state = this.graph.view.getState(this.getCellForEvent(me, point));

      if (
        !this.isKeepFocusEvent(me) &&
        (this.currentFocusArea == null ||
          this.currentFocus == null ||
          state != null ||
          !this.graph.getModel().isVertex(this.currentFocus.cell) ||
          !wangUtils.intersects(this.currentFocusArea, mouse)) &&
        state != this.currentFocus
      ) {
        this.currentFocusArea = null;
        this.currentFocus = null;
        this.setFocus(me, state, source);
      }

      this.currentConstraint = null;
      this.currentPoint = null;
      let minDistSq = null;

      if (this.focusIcons != null && this.constraints != null && (state == null || this.currentFocus == state)) {
        let cx = mouse.getCenterX();
        let cy = mouse.getCenterY();

        for (let i = 0; i < this.focusIcons.length; i++) {
          let dx = cx - this.focusIcons[i].bounds.getCenterX();
          let dy = cy - this.focusIcons[i].bounds.getCenterY();
          let tmp = dx * dx + dy * dy;

          if (
            (this.intersects(this.focusIcons[i], mouse, source, existingEdge) ||
              (point != null && this.intersects(this.focusIcons[i], grid, source, existingEdge))) &&
            (minDistSq == null || tmp < minDistSq)
          ) {
            this.currentConstraint = this.constraints[i];
            this.currentPoint = this.focusPoints[i];
            minDistSq = tmp;
            let tmp = this.focusIcons[i].bounds.clone();
            tmp.grow(wangConstants.HIGHLIGHT_SIZE + 1);
            tmp.width -= 1;
            tmp.height -= 1;

            if (this.focusHighlight == null) {
              let hl = this.createHighlightShape();
              hl.dialect =
                this.graph.dialect == wangConstants.DIALECT_SVG ? wangConstants.DIALECT_SVG : wangConstants.DIALECT_VML;
              hl.pointerEvents = false;
              hl.init(this.graph.getView().getOverlayPane());
              this.focusHighlight = hl;

              let getState = () => {
                return this.currentFocus != null ? this.currentFocus : state;
              };

              wangEvent.redirectMouseEvents(hl.node, this.graph, getState);
            }

            this.focusHighlight.bounds = tmp;
            this.focusHighlight.redraw();
          }
        }
      }

      if (this.currentConstraint == null) {
        this.destroyFocusHighlight();
      }
    } else {
      this.currentConstraint = null;
      this.currentFocus = null;
      this.currentPoint = null;
    }
  }

  redraw() {
    if (this.currentFocus != null && this.constraints != null && this.focusIcons != null) {
      let state = this.graph.view.getState(this.currentFocus.cell);
      this.currentFocus = state;
      this.currentFocusArea = new wangRectangle(state.x, state.y, state.width, state.height);

      for (let i = 0; i < this.constraints.length; i++) {
        let cp = this.graph.getConnectionPoint(state, this.constraints[i]);
        let img = this.getImageForConstraint(state, this.constraints[i], cp);
        let bounds = new wangRectangle(
          Math.round(cp.x - img.width / 2),
          Math.round(cp.y - img.height / 2),
          img.width,
          img.height
        );
        this.focusIcons[i].bounds = bounds;
        this.focusIcons[i].redraw();
        this.currentFocusArea.add(this.focusIcons[i].bounds);
        this.focusPoints[i] = cp;
      }
    }
  }

  setFocus(me, state, source) {
    this.constraints =
      state != null && !this.isStateIgnored(state, source) && this.graph.isCellConnectable(state.cell)
        ? this.isEnabled()
          ? this.graph.getAllConnectionConstraints(state, source) || []
          : []
        : null;

    if (this.constraints != null) {
      this.currentFocus = state;
      this.currentFocusArea = new wangRectangle(state.x, state.y, state.width, state.height);

      if (this.focusIcons != null) {
        for (let i = 0; i < this.focusIcons.length; i++) {
          this.focusIcons[i].destroy();
        }

        this.focusIcons = null;
        this.focusPoints = null;
      }

      this.focusPoints = [];
      this.focusIcons = [];

      for (let i = 0; i < this.constraints.length; i++) {
        let cp = this.graph.getConnectionPoint(state, this.constraints[i]);
        let img = this.getImageForConstraint(state, this.constraints[i], cp);
        let src = img.src;
        let bounds = new wangRectangle(
          Math.round(cp.x - img.width / 2),
          Math.round(cp.y - img.height / 2),
          img.width,
          img.height
        );
        let icon = new wangImageShape(bounds, src);
        icon.dialect =
          this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_MIXEDHTML : wangConstants.DIALECT_SVG;
        icon.preserveImageAspect = false;
        icon.init(this.graph.getView().getDecoratorPane());

        if (wangClient.IS_QUIRKS || document.documentMode == 8) {
          wangEvent.addListener(icon.node, 'dragstart', function (evt) {
            wangEvent.consume(evt);
            return false;
          });
        }

        if (icon.node.previousSibling != null) {
          icon.node.parentNode.insertBefore(icon.node, icon.node.parentNode.firstChild);
        }

        let getState = () => {
          return this.currentFocus != null ? this.currentFocus : state;
        };

        icon.redraw();
        wangEvent.redirectMouseEvents(icon.node, this.graph, getState);
        this.currentFocusArea.add(icon.bounds);
        this.focusIcons.push(icon);
        this.focusPoints.push(cp);
      }

      this.currentFocusArea.grow(this.getTolerance(me));
    } else {
      this.destroyIcons();
      this.destroyFocusHighlight();
    }
  }

  createHighlightShape() {
    let hl = new wangRectangleShape(null, this.highlightColor, this.highlightColor, wangConstants.HIGHLIGHT_STROKEWIDTH);
    hl.opacity = wangConstants.HIGHLIGHT_OPACITY;
    return hl;
  }

  intersects(icon, mouse, source, existingEdge) {
    return wangUtils.intersects(icon.bounds, mouse);
  }

  destroy() {
    this.reset();

    if (this.resetHandler != null) {
      this.graph.model.removeListener(this.resetHandler);
      this.graph.view.removeListener(this.resetHandler);
      this.graph.removeListener(this.resetHandler);
      this.resetHandler = null;
    }

    if (this.mouseleaveHandler != null && this.graph.container != null) {
      wangEvent.removeListener(this.graph.container, 'mouseleave', this.mouseleaveHandler);
      this.mouseleaveHandler = null;
    }
  }
}
