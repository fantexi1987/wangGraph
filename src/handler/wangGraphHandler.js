import { wangCellHighlight } from '@wangGraph/handler/wangCellHighlight';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangGuide } from '@wangGraph/util/wangGuide';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangClient } from '@wangGraph/wangClient';

export class wangGraphHandler {
  static maxCells = 50;
  enabled = true;
  highlightEnabled = true;
  cloneEnabled = true;
  moveEnabled = true;
  guidesEnabled = false;
  handlesVisible = true;
  guide = null;
  currentDx = null;
  currentDy = null;
  updateCursor = true;
  selectEnabled = true;
  removeCellsFromParent = true;
  removeEmptyParents = false;
  connectOnDrop = false;
  scrollOnMove = true;
  minimumSize = 6;
  previewColor = 'black';
  htmlPreview = false;
  shape = null;
  scaleGrid = false;
  rotationEnabled = true;
  maxLivePreview = 0;
  allowLivePreview = wangClient.IS_SVG;

  constructor(graph) {
    this.graph = graph;
    this.graph.addMouseListener(this);

    this.panHandler = () => {
      if (!this.suspended) {
        this.updatePreview();
        this.updateHint();
      }
    };

    this.graph.addListener(wangEvent.PAN, this.panHandler);

    this.escapeHandler = (sender, evt) => {
      this.reset();
    };

    this.graph.addListener(wangEvent.ESCAPE, this.escapeHandler);

    this.refreshHandler = (sender, evt) => {
      window.setTimeout(() => {
        if (this.first != null && !this.suspended) {
          let dx = this.currentDx;
          let dy = this.currentDy;
          this.currentDx = 0;
          this.currentDy = 0;
          this.updatePreview();
          this.bounds = this.graph.getView().getBounds(this.cells);
          this.pBounds = this.getPreviewBounds(this.cells);

          if (this.pBounds == null) {
            this.reset();
          } else {
            this.currentDx = dx;
            this.currentDy = dy;
            this.updatePreview();
            this.updateHint();

            if (this.livePreviewUsed) {
              this.setHandlesVisibleForCells(this.graph.selectionCellsHandler.getHandledSelectionCells(), false);
            }
          }
        }
      }, 0);
    };

    this.graph.getModel().addListener(wangEvent.CHANGE, this.refreshHandler);

    this.keyHandler = (e) => {
      if (
        this.graph.container != null &&
        this.graph.container.style.visibility != 'hidden' &&
        this.first != null &&
        !this.suspended
      ) {
        let clone = this.graph.isCloneEvent(e) && this.graph.isCellsCloneable() && this.isCloneEnabled();

        if (clone != this.cloning) {
          this.cloning = clone;
          this.checkPreview();
          this.updatePreview();
        }
      }
    };

    wangEvent.addListener(document, 'keydown', this.keyHandler);
    wangEvent.addListener(document, 'keyup', this.keyHandler);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = value;
  }

  isCloneEnabled() {
    return this.cloneEnabled;
  }

  setCloneEnabled(value) {
    this.cloneEnabled = value;
  }

  isMoveEnabled() {
    return this.moveEnabled;
  }

  setMoveEnabled(value) {
    this.moveEnabled = value;
  }

  isSelectEnabled() {
    return this.selectEnabled;
  }

  setSelectEnabled(value) {
    this.selectEnabled = value;
  }

  isRemoveCellsFromParent() {
    return this.removeCellsFromParent;
  }

  setRemoveCellsFromParent(value) {
    this.removeCellsFromParent = value;
  }

  isPropagateSelectionCell(cell, immediate, me) {
    let parent = this.graph.model.getParent(cell);

    if (immediate) {
      let geo = this.graph.getCellGeometry(cell);
      return (
        !this.graph.model.isEdge(cell) &&
        !this.graph.model.isEdge(parent) &&
        !this.graph.isSiblingSelected(cell) &&
        (geo == null || geo.relative || !this.graph.isSwimlane(parent))
      );
    } else {
      return (
        (!this.graph.isToggleEvent(me.getEvent()) ||
          (!this.graph.isSiblingSelected(cell) && !this.graph.isCellSelected(cell) && !this.graph.isSwimlane(parent)) ||
          this.graph.isCellSelected(parent)) &&
        (this.graph.isToggleEvent(me.getEvent()) || !this.graph.isCellSelected(parent))
      );
    }
  }

  getInitialCellForEvent(me) {
    let state = me.getState();

    if (
      (!this.graph.isToggleEvent(me.getEvent()) || !wangEvent.isAltDown(me.getEvent())) &&
      state != null &&
      !this.graph.isCellSelected(state.cell)
    ) {
      let model = this.graph.model;
      let next = this.graph.view.getState(model.getParent(state.cell));

      while (
        next != null &&
        !this.graph.isCellSelected(next.cell) &&
        (model.isVertex(next.cell) || model.isEdge(next.cell)) &&
        this.isPropagateSelectionCell(state.cell, true, me)
      ) {
        state = next;
        next = this.graph.view.getState(this.graph.getModel().getParent(state.cell));
      }
    }

    return state != null ? state.cell : null;
  }

  isDelayedSelection(cell, me) {
    if (!this.graph.isToggleEvent(me.getEvent()) || !wangEvent.isAltDown(me.getEvent())) {
      while (cell != null) {
        if (this.graph.selectionCellsHandler.isHandled(cell)) {
          return this.graph.cellEditor.getEditingCell() != cell;
        }

        cell = this.graph.model.getParent(cell);
      }
    }

    return this.graph.isToggleEvent(me.getEvent()) && !wangEvent.isAltDown(me.getEvent());
  }

  selectDelayed(me) {
    if (!this.graph.popupMenuHandler.isPopupTrigger(me)) {
      let cell = me.getCell();

      if (cell == null) {
        cell = this.cell;
      }

      let state = this.graph.view.getState(cell);

      if (state != null) {
        if (me.isSource(state.control)) {
          this.graph.selectCellForEvent(cell, me.getEvent());
        } else {
          if (!this.graph.isToggleEvent(me.getEvent()) || !wangEvent.isAltDown(me.getEvent())) {
            let model = this.graph.getModel();
            let parent = model.getParent(cell);

            while (
              this.graph.view.getState(parent) != null &&
              (model.isVertex(parent) || model.isEdge(parent)) &&
              this.isPropagateSelectionCell(cell, false, me)
            ) {
              cell = parent;
              parent = model.getParent(cell);
            }
          }

          this.graph.selectCellForEvent(cell, me.getEvent());
        }
      }
    }
  }

  consumeMouseEvent(evtName, me) {
    me.consume();
  }

  mouseDown(sender, me) {
    if (
      !me.isConsumed() &&
      this.isEnabled() &&
      this.graph.isEnabled() &&
      me.getState() != null &&
      !wangEvent.isMultiTouchEvent(me.getEvent())
    ) {
      let cell = this.getInitialCellForEvent(me);
      this.delayedSelection = this.isDelayedSelection(cell, me);
      this.cell = null;

      if (this.isSelectEnabled() && !this.delayedSelection) {
        this.graph.selectCellForEvent(cell, me.getEvent());
      }

      if (this.isMoveEnabled()) {
        let model = this.graph.model;
        let geo = model.getGeometry(cell);

        if (
          this.graph.isCellMovable(cell) &&
          (!model.isEdge(cell) ||
            this.graph.getSelectionCount() > 1 ||
            (geo.points != null && geo.points.length > 0) ||
            model.getTerminal(cell, true) == null ||
            model.getTerminal(cell, false) == null ||
            this.graph.allowDanglingEdges ||
            (this.graph.isCloneEvent(me.getEvent()) && this.graph.isCellsCloneable()))
        ) {
          this.start(cell, me.getX(), me.getY());
        } else if (this.delayedSelection) {
          this.cell = cell;
        }

        this.cellWasClicked = true;
        this.consumeMouseEvent(wangEvent.MOUSE_DOWN, me);
      }
    }
  }

  getGuideStates() {
    let parent = this.graph.getDefaultParent();
    let model = this.graph.getModel();

    let filter = (cell) => {
      return (
        this.graph.view.getState(cell) != null &&
        model.isVertex(cell) &&
        model.getGeometry(cell) != null &&
        !model.getGeometry(cell).relative
      );
    };

    return this.graph.view.getCellStates(model.filterDescendants(filter, parent));
  }

  getCells(initialCell) {
    if (!this.delayedSelection && this.graph.isCellMovable(initialCell)) {
      return [initialCell];
    } else {
      return this.graph.getMovableCells(this.graph.getSelectionCells());
    }
  }

  getPreviewBounds(cells) {
    let bounds = this.getBoundingBox(cells);

    if (bounds != null) {
      bounds.width = Math.max(0, bounds.width - 1);
      bounds.height = Math.max(0, bounds.height - 1);

      if (bounds.width < this.minimumSize) {
        let dx = this.minimumSize - bounds.width;
        bounds.x -= dx / 2;
        bounds.width = this.minimumSize;
      } else {
        bounds.x = Math.round(bounds.x);
        bounds.width = Math.ceil(bounds.width);
      }

      let tr = this.graph.view.translate;
      let s = this.graph.view.scale;

      if (bounds.height < this.minimumSize) {
        let dy = this.minimumSize - bounds.height;
        bounds.y -= dy / 2;
        bounds.height = this.minimumSize;
      } else {
        bounds.y = Math.round(bounds.y);
        bounds.height = Math.ceil(bounds.height);
      }
    }

    return bounds;
  }

  getBoundingBox(cells) {
    let result = null;

    if (cells != null && cells.length > 0) {
      let model = this.graph.getModel();

      for (let i = 0; i < cells.length; i++) {
        if (model.isVertex(cells[i]) || model.isEdge(cells[i])) {
          let state = this.graph.view.getState(cells[i]);

          if (state != null) {
            let bbox = state;

            if (model.isVertex(cells[i]) && state.shape != null && state.shape.boundingBox != null) {
              bbox = state.shape.boundingBox;
            }

            if (result == null) {
              result = wangRectangle.fromRectangle(bbox);
            } else {
              result.add(bbox);
            }
          }
        }
      }
    }

    return result;
  }

  createPreviewShape(bounds) {
    let shape = new wangRectangleShape(bounds, null, this.previewColor);
    shape.isDashed = true;

    if (this.htmlPreview) {
      shape.dialect = wangConstants.DIALECT_STRICTHTML;
      shape.init(this.graph.container);
    } else {
      shape.dialect =
        this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
      shape.init(this.graph.getView().getOverlayPane());
      shape.pointerEvents = false;

      if (wangClient.IS_IOS) {
        shape.getSvgScreenOffset = function () {
          return 0;
        };
      }
    }

    return shape;
  }

  start(cell, x, y, cells) {
    this.cell = cell;
    this.first = wangUtils.convertPoint(this.graph.container, x, y);
    this.cells = cells != null ? cells : this.getCells(this.cell);
    this.bounds = this.graph.getView().getBounds(this.cells);
    this.pBounds = this.getPreviewBounds(this.cells);
    this.allCells = new wangDictionary();
    this.cloning = false;
    this.cellCount = 0;

    for (let i = 0; i < this.cells.length; i++) {
      this.cellCount += this.addStates(this.cells[i], this.allCells);
    }

    if (this.guidesEnabled) {
      this.guide = new wangGuide(this.graph, this.getGuideStates());
      let parent = this.graph.model.getParent(cell);
      let ignore = this.graph.model.getChildCount(parent) < 2;
      let connected = new wangDictionary();
      let opps = this.graph.getOpposites(this.graph.getEdges(this.cell), this.cell);

      for (let i = 0; i < opps.length; i++) {
        let state = this.graph.view.getState(opps[i]);

        if (state != null && !connected.get(state)) {
          connected.put(state, true);
        }
      }

      this.guide.isStateIgnored = (state) => {
        let p = this.graph.model.getParent(state.cell);
        return (
          state.cell != null &&
          ((!this.cloning && this.isCellMoving(state.cell)) ||
            (state.cell != (this.target || parent) &&
              !ignore &&
              !connected.get(state) &&
              (this.target == null || this.graph.model.getChildCount(this.target) >= 2) &&
              p != (this.target || parent)))
        );
      };
    }
  }

  addStates(cell, dict) {
    let state = this.graph.view.getState(cell);
    let count = 0;

    if (state != null && dict.get(cell) == null) {
      dict.put(cell, state);
      count++;
      let childCount = this.graph.model.getChildCount(cell);

      for (let i = 0; i < childCount; i++) {
        count += this.addStates(this.graph.model.getChildAt(cell, i), dict);
      }
    }

    return count;
  }

  isCellMoving(cell) {
    return this.allCells.get(cell) != null;
  }

  useGuidesForEvent(me) {
    return this.guide != null
      ? this.guide.isEnabledForEvent(me.getEvent()) && !this.graph.isConstrainedEvent(me.getEvent())
      : true;
  }

  snap(vector) {
    let scale = this.scaleGrid ? this.graph.view.scale : 1;
    vector.x = this.graph.snap(vector.x / scale) * scale;
    vector.y = this.graph.snap(vector.y / scale) * scale;
    return vector;
  }

  getDelta(me) {
    let point = wangUtils.convertPoint(this.graph.container, me.getX(), me.getY());
    return new wangPoint(point.x - this.first.x - this.graph.panDx, point.y - this.first.y - this.graph.panDy);
  }

  updateHint(me) {}

  removeHint() {}

  roundLength(length) {
    return Math.round(length * 100) / 100;
  }

  isValidDropTarget(target, me) {
    return this.graph.model.getParent(this.cell) != target;
  }

  checkPreview() {
    if (this.livePreviewActive && this.cloning) {
      this.resetLivePreview();
      this.livePreviewActive = false;
    } else if (this.maxLivePreview >= this.cellCount && !this.livePreviewActive && this.allowLivePreview) {
      if (!this.cloning || !this.livePreviewActive) {
        this.livePreviewActive = true;
        this.livePreviewUsed = true;
      }
    } else if (!this.livePreviewUsed && this.shape == null) {
      this.shape = this.createPreviewShape(this.bounds);
    }
  }

  mouseMove(sender, me) {
    let graph = this.graph;

    if (
      !me.isConsumed() &&
      graph.isMouseDown &&
      this.cell != null &&
      this.first != null &&
      this.bounds != null &&
      !this.suspended
    ) {
      if (wangEvent.isMultiTouchEvent(me.getEvent())) {
        this.reset();
        return;
      }

      let delta = this.getDelta(me);
      let tol = graph.tolerance;

      if (this.shape != null || this.livePreviewActive || Math.abs(delta.x) > tol || Math.abs(delta.y) > tol) {
        if (this.highlight == null) {
          this.highlight = new wangCellHighlight(this.graph, wangConstants.DROP_TARGET_COLOR, 3);
        }

        let clone = graph.isCloneEvent(me.getEvent()) && graph.isCellsCloneable() && this.isCloneEnabled();
        let gridEnabled = graph.isGridEnabledEvent(me.getEvent());
        let cell = me.getCell();
        let hideGuide = true;
        let target = null;
        this.cloning = clone;

        if (graph.isDropEnabled() && this.highlightEnabled) {
          target = graph.getDropTarget(this.cells, me.getEvent(), cell, clone);
        }

        let state = graph.getView().getState(target);
        let highlight = false;

        if (state != null && (clone || this.isValidDropTarget(target, me))) {
          if (this.target != target) {
            this.target = target;
            this.setHighlightColor(wangConstants.DROP_TARGET_COLOR);
          }

          highlight = true;
        } else {
          this.target = null;

          if (
            this.connectOnDrop &&
            cell != null &&
            this.cells.length == 1 &&
            graph.getModel().isVertex(cell) &&
            graph.isCellConnectable(cell)
          ) {
            state = graph.getView().getState(cell);

            if (state != null) {
              let error = graph.getEdgeValidationError(null, this.cell, cell);
              let color = error == null ? wangConstants.VALID_COLOR : wangConstants.INVALID_CONNECT_TARGET_COLOR;
              this.setHighlightColor(color);
              highlight = true;
            }
          }
        }

        if (state != null && highlight) {
          this.highlight.highlight(state);
        } else {
          this.highlight.hide();
        }

        if (this.guide != null && this.useGuidesForEvent(me)) {
          delta = this.guide.move(this.bounds, delta, gridEnabled, clone);
          hideGuide = false;
        } else {
          delta = this.graph.snapDelta(delta, this.bounds, !gridEnabled, false, false);
        }

        if (this.guide != null && hideGuide) {
          this.guide.hide();
        }

        if (graph.isConstrainedEvent(me.getEvent())) {
          if (Math.abs(delta.x) > Math.abs(delta.y)) {
            delta.y = 0;
          } else {
            delta.x = 0;
          }
        }

        this.checkPreview();

        if (this.currentDx != delta.x || this.currentDy != delta.y) {
          this.currentDx = delta.x;
          this.currentDy = delta.y;
          this.updatePreview();
        }
      }

      this.updateHint(me);
      this.consumeMouseEvent(wangEvent.MOUSE_MOVE, me);
      wangEvent.consume(me.getEvent());
    } else if (
      (this.isMoveEnabled() || this.isCloneEnabled()) &&
      this.updateCursor &&
      !me.isConsumed() &&
      (me.getState() != null || me.sourceState != null) &&
      !graph.isMouseDown
    ) {
      let cursor = graph.getCursorForMouseEvent(me);

      if (cursor == null && graph.isEnabled() && graph.isCellMovable(me.getCell())) {
        if (graph.getModel().isEdge(me.getCell())) {
          cursor = wangConstants.CURSOR_MOVABLE_EDGE;
        } else {
          cursor = wangConstants.CURSOR_MOVABLE_VERTEX;
        }
      }

      if (cursor != null && me.sourceState != null) {
        me.sourceState.setCursor(cursor);
      }
    }
  }

  updatePreview(remote) {
    if (this.livePreviewUsed && !remote) {
      if (this.cells != null) {
        this.setHandlesVisibleForCells(this.graph.selectionCellsHandler.getHandledSelectionCells(), false);
        this.updateLivePreview(this.currentDx, this.currentDy);
      }
    } else {
      this.updatePreviewShape();
    }
  }

  updatePreviewShape() {
    if (this.shape != null && this.pBounds != null) {
      this.shape.bounds = new wangRectangle(
        Math.round(this.pBounds.x + this.currentDx),
        Math.round(this.pBounds.y + this.currentDy),
        this.pBounds.width,
        this.pBounds.height
      );
      this.shape.redraw();
    }
  }

  updateLivePreview(dx, dy) {
    if (!this.suspended) {
      let states = [];

      if (this.allCells != null) {
        this.allCells.visit((key, state) => {
          if (this.graph.view.getState(state.cell) == null) {
            state.destroy();
          } else {
            let tempState = state.clone();
            states.push([state, tempState]);

            if (state.shape != null) {
              if (state.shape.originalPointerEvents == null) {
                state.shape.originalPointerEvents = state.shape.pointerEvents;
              }

              state.shape.pointerEvents = false;

              if (state.text != null) {
                if (state.text.originalPointerEvents == null) {
                  state.text.originalPointerEvents = state.text.pointerEvents;
                }

                state.text.pointerEvents = false;
              }
            }

            if (this.graph.model.isVertex(state.cell)) {
              state.x += dx;
              state.y += dy;

              if (!this.cloning) {
                state.view.graph.cellRenderer.redraw(state, true);
                state.view.invalidate(state.cell);
                state.invalid = false;

                if (state.control != null && state.control.node != null) {
                  state.control.node.style.visibility = 'hidden';
                }
              }
            }
          }
        });
      }

      if (states.length == 0) {
        this.reset();
      } else {
        let s = this.graph.view.scale;

        for (let i = 0; i < states.length; i++) {
          let state = states[i][0];

          if (this.graph.model.isEdge(state.cell)) {
            let geometry = this.graph.getCellGeometry(state.cell);
            let points = [];

            if (geometry != null && geometry.points != null) {
              for (let j = 0; j < geometry.points.length; j++) {
                if (geometry.points[j] != null) {
                  points.push(new wangPoint(geometry.points[j].x + dx / s, geometry.points[j].y + dy / s));
                }
              }
            }

            let source = state.visibleSourceState;
            let target = state.visibletargetState;
            let pts = states[i][1].absolutePoints;

            if (source == null || !this.isCellMoving(source.cell)) {
              let pt0 = pts[0];
              state.setAbsoluteTerminalPoint(new wangPoint(pt0.x + dx, pt0.y + dy), true);
              source = null;
            } else {
              state.view.updateFixedTerminalPoint(
                state,
                source,
                true,
                this.graph.getConnectionConstraint(state, source, true)
              );
            }

            if (target == null || !this.isCellMoving(target.cell)) {
              let ptn = pts[pts.length - 1];
              state.setAbsoluteTerminalPoint(new wangPoint(ptn.x + dx, ptn.y + dy), false);
              target = null;
            } else {
              state.view.updateFixedTerminalPoint(
                state,
                target,
                false,
                this.graph.getConnectionConstraint(state, target, false)
              );
            }

            state.view.updatePoints(state, points, source, target);
            state.view.updateFloatingTerminalPoints(state, source, target);
            state.view.updateEdgeLabelOffset(state);
            state.invalid = false;

            if (!this.cloning) {
              state.view.graph.cellRenderer.redraw(state, true);
            }
          }
        }

        this.graph.view.validate();
        this.redrawHandles(states);
        this.resetPreviewStates(states);
      }
    }
  }

  redrawHandles(states) {
    for (let i = 0; i < states.length; i++) {
      let handler = this.graph.selectionCellsHandler.getHandler(states[i][0].cell);

      if (handler != null) {
        handler.redraw(true);
      }
    }
  }

  resetPreviewStates(states) {
    for (let i = 0; i < states.length; i++) {
      states[i][0].setState(states[i][1]);
    }
  }

  suspend() {
    if (!this.suspended) {
      if (this.livePreviewUsed) {
        this.updateLivePreview(0, 0);
      }

      if (this.shape != null) {
        this.shape.node.style.visibility = 'hidden';
      }

      if (this.guide != null) {
        this.guide.setVisible(false);
      }

      this.suspended = true;
    }
  }

  resume() {
    if (this.suspended) {
      this.suspended = null;

      if (this.livePreviewUsed) {
        this.livePreviewActive = true;
      }

      if (this.shape != null) {
        this.shape.node.style.visibility = 'visible';
      }

      if (this.guide != null) {
        this.guide.setVisible(true);
      }
    }
  }

  resetLivePreview() {
    if (this.allCells != null) {
      this.allCells.visit((key, state) => {
        if (state.shape != null && state.shape.originalPointerEvents != null) {
          state.shape.pointerEvents = state.shape.originalPointerEvents;
          state.shape.originalPointerEvents = null;
          state.shape.bounds = null;

          if (state.text != null) {
            state.text.pointerEvents = state.text.originalPointerEvents;
            state.text.originalPointerEvents = null;
          }
        }

        if (state.control != null && state.control.node != null && state.control.node.style.visibility == 'hidden') {
          state.control.node.style.visibility = '';
        }

        state.view.invalidate(state.cell);
      });
      this.graph.view.validate();
    }
  }

  setHandlesVisibleForCells(cells, visible) {
    if (this.handlesVisible != visible) {
      this.handlesVisible = visible;

      for (let i = 0; i < cells.length; i++) {
        let handler = this.graph.selectionCellsHandler.getHandler(cells[i]);

        if (handler != null) {
          handler.setHandlesVisible(visible);

          if (visible) {
            handler.redraw();
          }
        }
      }
    }
  }

  setHighlightColor(color) {
    if (this.highlight != null) {
      this.highlight.setHighlightColor(color);
    }
  }

  mouseUp(sender, me) {
    if (!me.isConsumed()) {
      if (this.livePreviewUsed) {
        this.resetLivePreview();
      }

      if (
        this.cell != null &&
        this.first != null &&
        (this.shape != null || this.livePreviewUsed) &&
        this.currentDx != null &&
        this.currentDy != null
      ) {
        let graph = this.graph;
        let cell = me.getCell();

        if (
          this.connectOnDrop &&
          this.target == null &&
          cell != null &&
          graph.getModel().isVertex(cell) &&
          graph.isCellConnectable(cell) &&
          graph.isEdgeValid(null, this.cell, cell)
        ) {
          graph.connectionHandler.connect(this.cell, cell, me.getEvent());
        } else {
          let clone = graph.isCloneEvent(me.getEvent()) && graph.isCellsCloneable() && this.isCloneEnabled();
          let scale = graph.getView().scale;
          let dx = this.roundLength(this.currentDx / scale);
          let dy = this.roundLength(this.currentDy / scale);
          let target = this.target;

          if (graph.isSplitEnabled() && graph.isSplitTarget(target, this.cells, me.getEvent())) {
            graph.splitEdge(target, this.cells, null, dx, dy, me.getGraphX(), me.getGraphY());
          } else {
            this.moveCells(this.cells, dx, dy, clone, this.target, me.getEvent());
          }
        }
      } else if (this.isSelectEnabled() && this.delayedSelection && this.cell != null) {
        this.selectDelayed(me);
      }
    }

    if (this.cellWasClicked) {
      this.consumeMouseEvent(wangEvent.MOUSE_UP, me);
    }

    this.reset();
  }

  reset() {
    if (this.livePreviewUsed) {
      this.resetLivePreview();
      this.setHandlesVisibleForCells(this.graph.selectionCellsHandler.getHandledSelectionCells(), true);
    }

    this.destroyShapes();
    this.removeHint();
    this.delayedSelection = false;
    this.livePreviewActive = null;
    this.livePreviewUsed = null;
    this.cellWasClicked = false;
    this.suspended = null;
    this.currentDx = null;
    this.currentDy = null;
    this.cellCount = null;
    this.cloning = false;
    this.allCells = null;
    this.pBounds = null;
    this.guides = null;
    this.target = null;
    this.first = null;
    this.cells = null;
    this.cell = null;
  }

  shouldRemoveCellsFromParent(parent, cells, evt) {
    if (this.graph.getModel().isVertex(parent)) {
      let pState = this.graph.getView().getState(parent);

      if (pState != null) {
        let pt = wangUtils.convertPoint(this.graph.container, wangEvent.getClientX(evt), wangEvent.getClientY(evt));
        let alpha = wangUtils.toRadians(wangUtils.getValue(pState.style, wangConstants.STYLE_ROTATION) || 0);

        if (alpha != 0) {
          let cos = Math.cos(-alpha);
          let sin = Math.sin(-alpha);
          let cx = new wangPoint(pState.getCenterX(), pState.getCenterY());
          pt = wangUtils.getRotatedPoint(pt, cos, sin, cx);
        }

        return !wangUtils.contains(pState, pt.x, pt.y);
      }
    }

    return false;
  }

  moveCells(cells, dx, dy, clone, target, evt) {
    if (clone) {
      cells = this.graph.getCloneableCells(cells);
    }

    let parent = this.graph.getModel().getParent(this.cell);

    if (target == null && this.isRemoveCellsFromParent() && this.shouldRemoveCellsFromParent(parent, cells, evt)) {
      target = this.graph.getDefaultParent();
    }

    clone = clone && !this.graph.isCellLocked(target || this.graph.getDefaultParent());
    this.graph.getModel().beginUpdate();

    try {
      let parents = [];

      if (!clone && target != null && this.removeEmptyParents) {
        let dict = new wangDictionary();

        for (let i = 0; i < cells.length; i++) {
          dict.put(cells[i], true);
        }

        for (let i = 0; i < cells.length; i++) {
          let par = this.graph.model.getParent(cells[i]);

          if (par != null && !dict.get(par)) {
            dict.put(par, true);
            parents.push(par);
          }
        }
      }

      cells = this.graph.moveCells(cells, dx, dy, clone, target, evt);
      let temp = [];

      for (let i = 0; i < parents.length; i++) {
        if (this.shouldRemoveParent(parents[i])) {
          temp.push(parents[i]);
        }
      }

      this.graph.removeCells(temp, false);
    } finally {
      this.graph.getModel().endUpdate();
    }

    if (clone) {
      this.graph.setSelectionCells(cells);
    }

    if (this.isSelectEnabled() && this.scrollOnMove) {
      this.graph.scrollCellToVisible(cells[0]);
    }
  }

  shouldRemoveParent(parent) {
    let state = this.graph.view.getState(parent);
    return (
      state != null &&
      (this.graph.model.isEdge(state.cell) || this.graph.model.isVertex(state.cell)) &&
      this.graph.isCellDeletable(state.cell) &&
      this.graph.model.getChildCount(state.cell) == 0 &&
      this.graph.isTransparentState(state)
    );
  }

  destroyShapes() {
    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    if (this.guide != null) {
      this.guide.destroy();
      this.guide = null;
    }

    if (this.highlight != null) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }

  destroy() {
    this.graph.removeMouseListener(this);
    this.graph.removeListener(this.panHandler);

    if (this.escapeHandler != null) {
      this.graph.removeListener(this.escapeHandler);
      this.escapeHandler = null;
    }

    if (this.refreshHandler != null) {
      this.graph.getModel().removeListener(this.refreshHandler);
      this.refreshHandler = null;
    }

    wangEvent.removeListener(document, 'keydown', this.keyHandler);
    wangEvent.removeListener(document, 'keyup', this.keyHandler);
    this.destroyShapes();
    this.removeHint();
  }
}
