import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangCellState } from '@wangGraph/view/wangCellState';
import { wangStyleRegistry } from '@wangGraph/view/wangStyleRegistry';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangMouseEvent } from '@wangGraph/util/wangMouseEvent';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangUndoableEdit } from '@wangGraph/util/wangUndoableEdit';
import { wangCurrentRootChange } from '@wangGraph/view/wangCurrentRootChange';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangClient } from '@wangGraph/wangClient';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangGraphView extends wangEventSource {
  EMPTY_POINT = new wangPoint();
  doneResource = wangClient.language != 'none' ? 'done' : '';
  updatingDocumentResource = wangClient.language != 'none' ? 'updatingDocument' : '';
  allowEval = false;
  captureDocumentGesture = true;
  optimizeVmlReflows = true;
  rendering = true;
  currentRoot = null;
  scale = 1;
  updateStyle = false;
  lastNode = null;
  lastHtmlNode = null;
  lastForegroundNode = null;
  lastForegroundHtmlNode = null;

  constructor(graph) {
    super();
    this.graph = graph;
    this.translate = new wangPoint();
    this.graphBounds = new wangRectangle();
    this.states = new wangDictionary();
  }

  getGraphBounds() {
    return this.graphBounds;
  }

  setGraphBounds(value) {
    this.graphBounds = value;
  }

  getBounds(cells) {
    let result = null;

    if (cells != null && cells.length > 0) {
      let model = this.graph.getModel();

      for (let i = 0; i < cells.length; i++) {
        if (model.isVertex(cells[i]) || model.isEdge(cells[i])) {
          let state = this.getState(cells[i]);

          if (state != null) {
            if (result == null) {
              result = wangRectangle.fromRectangle(state);
            } else {
              result.add(state);
            }
          }
        }
      }
    }

    return result;
  }

  setCurrentRoot(root) {
    if (this.currentRoot != root) {
      let change = new wangCurrentRootChange(this, root);
      change.execute();
      let edit = new wangUndoableEdit(this, true);
      edit.add(change);
      this.fireEvent(new wangEventObject(wangEvent.UNDO, 'edit', edit));
      this.graph.sizeDidChange();
    }

    return root;
  }

  scaleAndTranslate(scale, dx, dy) {
    let previousScale = this.scale;
    let previousTranslate = new wangPoint(this.translate.x, this.translate.y);

    if (this.scale != scale || this.translate.x != dx || this.translate.y != dy) {
      this.scale = scale;
      this.translate.x = dx;
      this.translate.y = dy;

      if (this.isEventsEnabled()) {
        this.viewStateChanged();
      }
    }

    this.fireEvent(
      new wangEventObject(
        wangEvent.SCALE_AND_TRANSLATE,
        'scale',
        scale,
        'previousScale',
        previousScale,
        'translate',
        this.translate,
        'previousTranslate',
        previousTranslate
      )
    );
  }

  getScale() {
    return this.scale;
  }

  setScale(value) {
    let previousScale = this.scale;

    if (this.scale != value) {
      this.scale = value;

      if (this.isEventsEnabled()) {
        this.viewStateChanged();
      }
    }

    this.fireEvent(new wangEventObject(wangEvent.SCALE, 'scale', value, 'previousScale', previousScale));
  }

  getTranslate() {
    return this.translate;
  }

  setTranslate(dx, dy) {
    let previousTranslate = new wangPoint(this.translate.x, this.translate.y);

    if (this.translate.x != dx || this.translate.y != dy) {
      this.translate.x = dx;
      this.translate.y = dy;

      if (this.isEventsEnabled()) {
        this.viewStateChanged();
      }
    }

    this.fireEvent(
      new wangEventObject(wangEvent.TRANSLATE, 'translate', this.translate, 'previousTranslate', previousTranslate)
    );
  }

  viewStateChanged() {
    this.revalidate();
    this.graph.sizeDidChange();
  }

  refresh() {
    if (this.currentRoot != null) {
      this.clear();
    }

    this.revalidate();
  }

  revalidate() {
    this.invalidate();
    this.validate();
  }

  clear(cell, force, recurse) {
    let model = this.graph.getModel();
    cell = cell || model.getRoot();
    force = force != null ? force : false;
    recurse = recurse != null ? recurse : true;
    this.removeState(cell);

    if (recurse && (force || cell != this.currentRoot)) {
      let childCount = model.getChildCount(cell);

      for (let i = 0; i < childCount; i++) {
        this.clear(model.getChildAt(cell, i), force);
      }
    } else {
      this.invalidate(cell);
    }
  }

  invalidate(cell, recurse, includeEdges) {
    let model = this.graph.getModel();
    cell = cell || model.getRoot();
    recurse = recurse != null ? recurse : true;
    includeEdges = includeEdges != null ? includeEdges : true;
    let state = this.getState(cell);

    if (state != null) {
      state.invalid = true;
    }

    if (!cell.invalidating) {
      cell.invalidating = true;

      if (recurse) {
        let childCount = model.getChildCount(cell);

        for (let i = 0; i < childCount; i++) {
          let child = model.getChildAt(cell, i);
          this.invalidate(child, recurse, includeEdges);
        }
      }

      if (includeEdges) {
        let edgeCount = model.getEdgeCount(cell);

        for (let i = 0; i < edgeCount; i++) {
          this.invalidate(model.getEdgeAt(cell, i), recurse, includeEdges);
        }
      }

      delete cell.invalidating;
    }
  }

  validate(cell) {
    let t0 = wangLog.enter('wangGraphView.validate');
    window.status = wangResources.get(this.updatingDocumentResource) || this.updatingDocumentResource;
    this.resetValidationState();
    let prevDisplay = null;

    if (
      this.optimizeVmlReflows &&
      this.canvas != null &&
      this.textDiv == null &&
      ((document.documentMode == 8 && !wangClient.IS_EM) || wangClient.IS_QUIRKS)
    ) {
      this.placeholder = document.createElement('div');
      this.placeholder.style.position = 'absolute';
      this.placeholder.style.width = this.canvas.clientWidth + 'px';
      this.placeholder.style.height = this.canvas.clientHeight + 'px';
      this.canvas.parentNode.appendChild(this.placeholder);
      prevDisplay = this.drawPane.style.display;
      this.canvas.style.display = 'none';
      this.textDiv = document.createElement('div');
      this.textDiv.style.position = 'absolute';
      this.textDiv.style.whiteSpace = 'nowrap';
      this.textDiv.style.visibility = 'hidden';
      this.textDiv.style.display = wangClient.IS_QUIRKS ? 'inline' : 'inline-block';
      this.textDiv.style.zoom = '1';
      document.body.appendChild(this.textDiv);
    }

    let graphBounds = this.getBoundingBox(
      this.validateCellState(
        this.validateCell(cell || (this.currentRoot != null ? this.currentRoot : this.graph.getModel().getRoot()))
      )
    );
    this.setGraphBounds(graphBounds != null ? graphBounds : this.getEmptyBounds());
    this.validateBackground();

    if (prevDisplay != null) {
      this.canvas.style.display = prevDisplay;
      this.textDiv.parentNode.removeChild(this.textDiv);

      if (this.placeholder != null) {
        this.placeholder.parentNode.removeChild(this.placeholder);
      }

      this.textDiv = null;
    }

    this.resetValidationState();
    window.status = wangResources.get(this.doneResource) || this.doneResource;
    wangLog.leave('wangGraphView.validate', t0);
  }

  getEmptyBounds() {
    return new wangRectangle(this.translate.x * this.scale, this.translate.y * this.scale);
  }

  getBoundingBox(state, recurse) {
    recurse = recurse != null ? recurse : true;
    let bbox = null;

    if (state != null) {
      if (state.shape != null && state.shape.boundingBox != null) {
        bbox = state.shape.boundingBox.clone();
      }

      if (state.text != null && state.text.boundingBox != null) {
        if (bbox != null) {
          bbox.add(state.text.boundingBox);
        } else {
          bbox = state.text.boundingBox.clone();
        }
      }

      if (recurse) {
        let model = this.graph.getModel();
        let childCount = model.getChildCount(state.cell);

        for (let i = 0; i < childCount; i++) {
          let bounds = this.getBoundingBox(this.getState(model.getChildAt(state.cell, i)));

          if (bounds != null) {
            if (bbox == null) {
              bbox = bounds;
            } else {
              bbox.add(bounds);
            }
          }
        }
      }
    }

    return bbox;
  }

  createBackgroundPageShape(bounds) {
    return new wangRectangleShape(bounds, 'white', 'black');
  }

  validateBackground() {
    this.validateBackgroundImage();
    this.validateBackgroundPage();
  }

  validateBackgroundImage() {
    let bg = this.graph.getBackgroundImage();

    if (bg != null) {
      if (this.backgroundImage == null || this.backgroundImage.image != bg.src) {
        if (this.backgroundImage != null) {
          this.backgroundImage.destroy();
        }

        let bounds = new wangRectangle(0, 0, 1, 1);
        this.backgroundImage = new wangImageShape(bounds, bg.src);
        this.backgroundImage.dialect = this.graph.dialect;
        this.backgroundImage.init(this.backgroundPane);
        this.backgroundImage.redraw();

        if (document.documentMode == 8 && !wangClient.IS_EM) {
          wangEvent.addGestureListeners(
            this.backgroundImage.node,
            (evt) => {
              this.graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt));
            },
            (evt) => {
              this.graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt));
            },
            (evt) => {
              this.graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt));
            }
          );
        }
      }

      this.redrawBackgroundImage(this.backgroundImage, bg);
    } else if (this.backgroundImage != null) {
      this.backgroundImage.destroy();
      this.backgroundImage = null;
    }
  }

  validateBackgroundPage() {
    if (this.graph.pageVisible) {
      let bounds = this.getBackgroundPageBounds();

      if (this.backgroundPageShape == null) {
        this.backgroundPageShape = this.createBackgroundPageShape(bounds);
        this.backgroundPageShape.scale = this.scale;
        this.backgroundPageShape.isShadow = true;
        this.backgroundPageShape.dialect = this.graph.dialect;
        this.backgroundPageShape.init(this.backgroundPane);
        this.backgroundPageShape.redraw();

        if (this.graph.nativeDblClickEnabled) {
          wangEvent.addListener(this.backgroundPageShape.node, 'dblclick', (evt) => {
            this.graph.dblClick(evt);
          });
        }

        wangEvent.addGestureListeners(
          this.backgroundPageShape.node,
          (evt) => {
            this.graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt));
          },
          (evt) => {
            if (this.graph.tooltipHandler != null && this.graph.tooltipHandler.isHideOnHover()) {
              this.graph.tooltipHandler.hide();
            }

            if (this.graph.isMouseDown && !wangEvent.isConsumed(evt)) {
              this.graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt));
            }
          },
          (evt) => {
            this.graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt));
          }
        );
      } else {
        this.backgroundPageShape.scale = this.scale;
        this.backgroundPageShape.bounds = bounds;
        this.backgroundPageShape.redraw();
      }
    } else if (this.backgroundPageShape != null) {
      this.backgroundPageShape.destroy();
      this.backgroundPageShape = null;
    }
  }

  getBackgroundPageBounds() {
    let fmt = this.graph.pageFormat;
    let ps = this.scale * this.graph.pageScale;
    let bounds = new wangRectangle(
      this.scale * this.translate.x,
      this.scale * this.translate.y,
      fmt.width * ps,
      fmt.height * ps
    );
    return bounds;
  }

  redrawBackgroundImage(backgroundImage, bg) {
    backgroundImage.scale = this.scale;
    backgroundImage.bounds.x = this.scale * this.translate.x;
    backgroundImage.bounds.y = this.scale * this.translate.y;
    backgroundImage.bounds.width = this.scale * bg.width;
    backgroundImage.bounds.height = this.scale * bg.height;
    backgroundImage.redraw();
  }

  validateCell(cell, visible) {
    visible = visible != null ? visible : true;

    if (cell != null) {
      visible = visible && this.graph.isCellVisible(cell);
      let state = this.getState(cell, visible);

      if (state != null && !visible) {
        this.removeState(cell);
      } else {
        let model = this.graph.getModel();
        let childCount = model.getChildCount(cell);

        for (let i = 0; i < childCount; i++) {
          this.validateCell(
            model.getChildAt(cell, i),
            visible && (!this.isCellCollapsed(cell) || cell == this.currentRoot)
          );
        }
      }
    }

    return cell;
  }

  validateCellState(cell, recurse) {
    recurse = recurse != null ? recurse : true;
    let state = null;

    if (cell != null) {
      state = this.getState(cell);

      if (state != null) {
        let model = this.graph.getModel();

        if (state.invalid) {
          state.invalid = false;

          if (state.style == null || state.invalidStyle) {
            state.style = this.graph.getCellStyle(state.cell);
            state.invalidStyle = false;
          }

          if (cell != this.currentRoot) {
            this.validateCellState(model.getParent(cell), false);
          }

          state.setVisibleterminalState(this.validateCellState(this.getVisibleterminal(cell, true), false), true);
          state.setVisibleterminalState(this.validateCellState(this.getVisibleterminal(cell, false), false), false);
          this.updateCellState(state);

          if (cell != this.currentRoot && !state.invalid) {
            this.graph.cellRenderer.redraw(state, false, this.isRendering());
            state.updateCachedBounds();
          }
        }

        if (recurse && !state.invalid) {
          if (state.shape != null) {
            this.stateValidated(state);
          }

          let childCount = model.getChildCount(cell);

          for (let i = 0; i < childCount; i++) {
            this.validateCellState(model.getChildAt(cell, i));
          }
        }
      }
    }

    return state;
  }

  updateCellState(state) {
    state.absoluteOffset.x = 0;
    state.absoluteOffset.y = 0;
    state.origin.x = 0;
    state.origin.y = 0;
    state.length = 0;

    if (state.cell != this.currentRoot) {
      let model = this.graph.getModel();
      let pState = this.getState(model.getParent(state.cell));

      if (pState != null && pState.cell != this.currentRoot) {
        state.origin.x += pState.origin.x;
        state.origin.y += pState.origin.y;
      }

      let offset = this.graph.getChildOffsetForCell(state.cell);

      if (offset != null) {
        state.origin.x += offset.x;
        state.origin.y += offset.y;
      }

      let geo = this.graph.getCellGeometry(state.cell);

      if (geo != null) {
        if (!model.isEdge(state.cell)) {
          offset = geo.offset != null ? geo.offset : this.EMPTY_POINT;

          if (geo.relative && pState != null) {
            if (model.isEdge(pState.cell)) {
              let origin = this.getPoint(pState, geo);

              if (origin != null) {
                state.origin.x += origin.x / this.scale - pState.origin.x - this.translate.x;
                state.origin.y += origin.y / this.scale - pState.origin.y - this.translate.y;
              }
            } else {
              state.origin.x += geo.x * pState.unscaledWidth + offset.x;
              state.origin.y += geo.y * pState.unscaledHeight + offset.y;
            }
          } else {
            state.absoluteOffset.x = this.scale * offset.x;
            state.absoluteOffset.y = this.scale * offset.y;
            state.origin.x += geo.x;
            state.origin.y += geo.y;
          }
        }

        state.x = this.scale * (this.translate.x + state.origin.x);
        state.y = this.scale * (this.translate.y + state.origin.y);
        state.width = this.scale * geo.width;
        state.unscaledWidth = geo.width;
        state.height = this.scale * geo.height;
        state.unscaledHeight = geo.height;

        if (model.isVertex(state.cell)) {
          this.updateVertexState(state, geo);
        }

        if (model.isEdge(state.cell)) {
          this.updateEdgeState(state, geo);
        }
      }
    }

    state.updateCachedBounds();
  }

  isCellCollapsed(cell) {
    return this.graph.isCellCollapsed(cell);
  }

  updateVertexState(state, geo) {
    let model = this.graph.getModel();
    let pState = this.getState(model.getParent(state.cell));

    if (geo.relative && pState != null && !model.isEdge(pState.cell)) {
      let alpha = wangUtils.toRadians(pState.style[wangConstants.STYLE_ROTATION] || '0');

      if (alpha != 0) {
        let cos = Math.cos(alpha);
        let sin = Math.sin(alpha);
        let ct = new wangPoint(state.getCenterX(), state.getCenterY());
        let cx = new wangPoint(pState.getCenterX(), pState.getCenterY());
        let pt = wangUtils.getRotatedPoint(ct, cos, sin, cx);
        state.x = pt.x - state.width / 2;
        state.y = pt.y - state.height / 2;
      }
    }

    this.updateVertexLabelOffset(state);
  }

  updateEdgeState(state, geo) {
    let source = state.getVisibleterminalState(true);
    let target = state.getVisibleterminalState(false);

    if (
      (this.graph.model.getTerminal(state.cell, true) != null && source == null) ||
      (source == null && geo.getTerminalPoint(true) == null) ||
      (this.graph.model.getTerminal(state.cell, false) != null && target == null) ||
      (target == null && geo.getTerminalPoint(false) == null)
    ) {
      this.clear(state.cell, true);
    } else {
      this.updateFixedTerminalPoints(state, source, target);
      this.updatePoints(state, geo.points, source, target);
      this.updateFloatingTerminalPoints(state, source, target);
      let pts = state.absolutePoints;

      if (
        state.cell != this.currentRoot &&
        (pts == null || pts.length < 2 || pts[0] == null || pts[pts.length - 1] == null)
      ) {
        this.clear(state.cell, true);
      } else {
        this.updateEdgeBounds(state);
        this.updateEdgeLabelOffset(state);
      }
    }
  }

  updateVertexLabelOffset(state) {
    let h = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_POSITION, wangConstants.ALIGN_CENTER);

    if (h == wangConstants.ALIGN_LEFT) {
      let lw = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_WIDTH, null);

      if (lw != null) {
        lw *= this.scale;
      } else {
        lw = state.width;
      }

      state.absoluteOffset.x -= lw;
    } else if (h == wangConstants.ALIGN_RIGHT) {
      state.absoluteOffset.x += state.width;
    } else if (h == wangConstants.ALIGN_CENTER) {
      let lw = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_WIDTH, null);

      if (lw != null) {
        let align = wangUtils.getValue(state.style, wangConstants.STYLE_ALIGN, wangConstants.ALIGN_CENTER);
        let dx = 0;

        if (align == wangConstants.ALIGN_CENTER) {
          dx = 0.5;
        } else if (align == wangConstants.ALIGN_RIGHT) {
          dx = 1;
        }

        if (dx != 0) {
          state.absoluteOffset.x -= (lw * this.scale - state.width) * dx;
        }
      }
    }

    let v = wangUtils.getValue(state.style, wangConstants.STYLE_VERTICAL_LABEL_POSITION, wangConstants.ALIGN_MIDDLE);

    if (v == wangConstants.ALIGN_TOP) {
      state.absoluteOffset.y -= state.height;
    } else if (v == wangConstants.ALIGN_BOTTOM) {
      state.absoluteOffset.y += state.height;
    }
  }

  resetValidationState() {
    this.lastNode = null;
    this.lastHtmlNode = null;
    this.lastForegroundNode = null;
    this.lastForegroundHtmlNode = null;
  }

  stateValidated(state) {
    let fg =
      (this.graph.getModel().isEdge(state.cell) && this.graph.keepEdgesInForeground) ||
      (this.graph.getModel().isVertex(state.cell) && this.graph.keepEdgesInBackground);
    let htmlNode = fg ? this.lastForegroundHtmlNode || this.lastHtmlNode : this.lastHtmlNode;
    let node = fg ? this.lastForegroundNode || this.lastNode : this.lastNode;
    let result = this.graph.cellRenderer.insertStateAfter(state, node, htmlNode);

    if (fg) {
      this.lastForegroundHtmlNode = result[1];
      this.lastForegroundNode = result[0];
    } else {
      this.lastHtmlNode = result[1];
      this.lastNode = result[0];
    }
  }

  updateFixedTerminalPoints(edge, source, target) {
    this.updateFixedTerminalPoint(edge, source, true, this.graph.getConnectionConstraint(edge, source, true));
    this.updateFixedTerminalPoint(edge, target, false, this.graph.getConnectionConstraint(edge, target, false));
  }

  updateFixedTerminalPoint(edge, terminal, source, constraint) {
    edge.setAbsoluteTerminalPoint(this.getFixedTerminalPoint(edge, terminal, source, constraint), source);
  }

  getFixedTerminalPoint(edge, terminal, source, constraint) {
    let pt = null;

    if (constraint != null) {
      pt = this.graph.getConnectionPoint(terminal, constraint, false);
    }

    if (pt == null && terminal == null) {
      let s = this.scale;
      let tr = this.translate;
      let orig = edge.origin;
      let geo = this.graph.getCellGeometry(edge.cell);
      pt = geo.getTerminalPoint(source);

      if (pt != null) {
        pt = new wangPoint(s * (tr.x + pt.x + orig.x), s * (tr.y + pt.y + orig.y));
      }
    }

    return pt;
  }

  updateBoundsFromStencil(state) {
    let previous = null;

    if (state != null && state.shape != null && state.shape.stencil != null && state.shape.stencil.aspect == 'fixed') {
      previous = wangRectangle.fromRectangle(state);
      let asp = state.shape.stencil.computeAspect(state.style, state.x, state.y, state.width, state.height);
      state.setRect(asp.x, asp.y, state.shape.stencil.w0 * asp.width, state.shape.stencil.h0 * asp.height);
    }

    return previous;
  }

  updatePoints(edge, points, source, target) {
    if (edge != null) {
      let pts = [];
      pts.push(edge.absolutePoints[0]);
      let edgeStyle = this.getEdgeStyle(edge, points, source, target);

      if (edgeStyle != null) {
        let src = this.getTerminalPort(edge, source, true);
        let trg = this.getTerminalPort(edge, target, false);
        let srcBounds = this.updateBoundsFromStencil(src);
        let trgBounds = this.updateBoundsFromStencil(trg);
        edgeStyle(edge, src, trg, points, pts);

        if (srcBounds != null) {
          src.setRect(srcBounds.x, srcBounds.y, srcBounds.width, srcBounds.height);
        }

        if (trgBounds != null) {
          trg.setRect(trgBounds.x, trgBounds.y, trgBounds.width, trgBounds.height);
        }
      } else if (points != null) {
        for (let i = 0; i < points.length; i++) {
          if (points[i] != null) {
            let pt = wangUtils.clone(points[i]);
            pts.push(this.transformControlPoint(edge, pt));
          }
        }
      }

      let tmp = edge.absolutePoints;
      pts.push(tmp[tmp.length - 1]);
      edge.absolutePoints = pts;
    }
  }

  transformControlPoint(state, pt, ignoreScale) {
    if (state != null && pt != null) {
      let orig = state.origin;
      let scale = ignoreScale ? 1 : this.scale;
      return new wangPoint(scale * (pt.x + this.translate.x + orig.x), scale * (pt.y + this.translate.y + orig.y));
    }

    return null;
  }

  isLoopStyleEnabled(edge, points, source, target) {
    let sc = this.graph.getConnectionConstraint(edge, source, true);
    let tc = this.graph.getConnectionConstraint(edge, target, false);

    if (
      (points == null || points.length < 2) &&
      (!wangUtils.getValue(edge.style, wangConstants.STYLE_ORTHOGONAL_LOOP, false) ||
        ((sc == null || sc.point == null) && (tc == null || tc.point == null)))
    ) {
      return source != null && source == target;
    }

    return false;
  }

  getEdgeStyle(edge, points, source, target) {
    let edgeStyle = this.isLoopStyleEnabled(edge, points, source, target)
      ? wangUtils.getValue(edge.style, wangConstants.STYLE_LOOP, this.graph.defaultLoopStyle)
      : !wangUtils.getValue(edge.style, wangConstants.STYLE_NOEDGESTYLE, false)
      ? edge.style[wangConstants.STYLE_EDGE]
      : null;

    if (typeof edgeStyle == 'string') {
      let tmp = wangStyleRegistry.getValue(edgeStyle);

      if (tmp == null && this.isAllowEval()) {
        tmp = wangUtils.eval(edgeStyle);
      }

      edgeStyle = tmp;
    }

    if (typeof edgeStyle == 'function') {
      return edgeStyle;
    }

    return null;
  }

  updateFloatingTerminalPoints(state, source, target) {
    let pts = state.absolutePoints;
    let p0 = pts[0];
    let pe = pts[pts.length - 1];

    if (pe == null && target != null) {
      this.updateFloatingTerminalPoint(state, target, source, false);
    }

    if (p0 == null && source != null) {
      this.updateFloatingTerminalPoint(state, source, target, true);
    }
  }

  updateFloatingTerminalPoint(edge, start, end, source) {
    edge.setAbsoluteTerminalPoint(this.getFloatingTerminalPoint(edge, start, end, source), source);
  }

  getFloatingTerminalPoint(edge, start, end, source) {
    start = this.getTerminalPort(edge, start, source);
    let next = this.getNextPoint(edge, end, source);
    let orth = this.graph.isOrthogonal(edge);
    let alpha = wangUtils.toRadians(Number(start.style[wangConstants.STYLE_ROTATION] || '0'));
    let center = new wangPoint(start.getCenterX(), start.getCenterY());

    if (alpha != 0) {
      let cos = Math.cos(-alpha);
      let sin = Math.sin(-alpha);
      next = wangUtils.getRotatedPoint(next, cos, sin, center);
    }

    let border = parseFloat(edge.style[wangConstants.STYLE_PERIMETER_SPACING] || 0);
    border += parseFloat(
      edge.style[source ? wangConstants.STYLE_SOURCE_PERIMETER_SPACING : wangConstants.STYLE_TARGET_PERIMETER_SPACING] || 0
    );
    let pt = this.getPerimeterPoint(start, next, alpha == 0 && orth, border);

    if (alpha != 0) {
      let cos = Math.cos(alpha);
      let sin = Math.sin(alpha);
      pt = wangUtils.getRotatedPoint(pt, cos, sin, center);
    }

    return pt;
  }

  getTerminalPort(state, terminal, source) {
    let key = source ? wangConstants.STYLE_SOURCE_PORT : wangConstants.STYLE_TARGET_PORT;
    let id = wangUtils.getValue(state.style, key);

    if (id != null) {
      let tmp = this.getState(this.graph.getModel().getCell(id));

      if (tmp != null) {
        terminal = tmp;
      }
    }

    return terminal;
  }

  getPerimeterPoint(terminal, next, orthogonal, border) {
    let point = null;

    if (terminal != null) {
      let perimeter = this.getPerimeterFunction(terminal);

      if (perimeter != null && next != null) {
        let bounds = this.getPerimeterBounds(terminal, border);

        if (bounds.width > 0 || bounds.height > 0) {
          point = new wangPoint(next.x, next.y);
          let flipH = false;
          let flipV = false;

          if (this.graph.model.isVertex(terminal.cell)) {
            flipH = wangUtils.getValue(terminal.style, wangConstants.STYLE_FLIPH, 0) == 1;
            flipV = wangUtils.getValue(terminal.style, wangConstants.STYLE_FLIPV, 0) == 1;

            if (terminal.shape != null && terminal.shape.stencil != null) {
              flipH = wangUtils.getValue(terminal.style, 'stencilFlipH', 0) == 1 || flipH;
              flipV = wangUtils.getValue(terminal.style, 'stencilFlipV', 0) == 1 || flipV;
            }

            if (flipH) {
              point.x = 2 * bounds.getCenterX() - point.x;
            }

            if (flipV) {
              point.y = 2 * bounds.getCenterY() - point.y;
            }
          }

          point = perimeter(bounds, terminal, point, orthogonal);

          if (point != null) {
            if (flipH) {
              point.x = 2 * bounds.getCenterX() - point.x;
            }

            if (flipV) {
              point.y = 2 * bounds.getCenterY() - point.y;
            }
          }
        }
      }

      if (point == null) {
        point = this.getPoint(terminal);
      }
    }

    return point;
  }

  getRoutingCenterX(state) {
    let f = state.style != null ? parseFloat(state.style[wangConstants.STYLE_ROUTING_CENTER_X]) || 0 : 0;
    return state.getCenterX() + f * state.width;
  }

  getRoutingCenterY(state) {
    let f = state.style != null ? parseFloat(state.style[wangConstants.STYLE_ROUTING_CENTER_Y]) || 0 : 0;
    return state.getCenterY() + f * state.height;
  }

  getPerimeterBounds(terminal, border) {
    border = border != null ? border : 0;

    if (terminal != null) {
      border += parseFloat(terminal.style[wangConstants.STYLE_PERIMETER_SPACING] || 0);
    }

    return terminal.getPerimeterBounds(border * this.scale);
  }

  getPerimeterFunction(state) {
    let perimeter = state.style[wangConstants.STYLE_PERIMETER];

    if (typeof perimeter == 'string') {
      let tmp = wangStyleRegistry.getValue(perimeter);

      if (tmp == null && this.isAllowEval()) {
        tmp = wangUtils.eval(perimeter);
      }

      perimeter = tmp;
    }

    if (typeof perimeter == 'function') {
      return perimeter;
    }

    return null;
  }

  getNextPoint(edge, opposite, source) {
    let pts = edge.absolutePoints;
    let point = null;

    if (pts != null && pts.length >= 2) {
      let count = pts.length;
      point = pts[source ? Math.min(1, count - 1) : Math.max(0, count - 2)];
    }

    if (point == null && opposite != null) {
      point = new wangPoint(opposite.getCenterX(), opposite.getCenterY());
    }

    return point;
  }

  getVisibleterminal(edge, source) {
    let model = this.graph.getModel();
    let result = model.getTerminal(edge, source);
    let best = result;

    while (result != null && result != this.currentRoot) {
      if (!this.graph.isCellVisible(best) || this.isCellCollapsed(result)) {
        best = result;
      }

      result = model.getParent(result);
    }

    if (
      best != null &&
      (!model.contains(best) || model.getParent(best) == model.getRoot() || best == this.currentRoot)
    ) {
      best = null;
    }

    return best;
  }

  updateEdgeBounds(state) {
    let points = state.absolutePoints;
    let p0 = points[0];
    let pe = points[points.length - 1];

    if (p0.x != pe.x || p0.y != pe.y) {
      let dx = pe.x - p0.x;
      let dy = pe.y - p0.y;
      state.terminalDistance = Math.sqrt(dx * dx + dy * dy);
    } else {
      state.terminalDistance = 0;
    }

    let length = 0;
    let segments = [];
    let pt = p0;

    if (pt != null) {
      let minX = pt.x;
      let minY = pt.y;
      let maxX = minX;
      let maxY = minY;

      for (let i = 1; i < points.length; i++) {
        let tmp = points[i];

        if (tmp != null) {
          let dx = pt.x - tmp.x;
          let dy = pt.y - tmp.y;
          let segment = Math.sqrt(dx * dx + dy * dy);
          segments.push(segment);
          length += segment;
          pt = tmp;
          minX = Math.min(pt.x, minX);
          minY = Math.min(pt.y, minY);
          maxX = Math.max(pt.x, maxX);
          maxY = Math.max(pt.y, maxY);
        }
      }

      state.length = length;
      state.segments = segments;
      let markerSize = 1;
      state.x = minX;
      state.y = minY;
      state.width = Math.max(markerSize, maxX - minX);
      state.height = Math.max(markerSize, maxY - minY);
    }
  }

  getPoint(state, geometry) {
    let x = state.getCenterX();
    let y = state.getCenterY();

    if (state.segments != null && (geometry == null || geometry.relative)) {
      let gx = geometry != null ? geometry.x / 2 : 0;
      let pointCount = state.absolutePoints.length;
      let dist = Math.round((gx + 0.5) * state.length);
      let segment = state.segments[0];
      let length = 0;
      let index = 1;

      while (dist >= Math.round(length + segment) && index < pointCount - 1) {
        length += segment;
        segment = state.segments[index++];
      }

      let factor = segment == 0 ? 0 : (dist - length) / segment;
      let p0 = state.absolutePoints[index - 1];
      let pe = state.absolutePoints[index];

      if (p0 != null && pe != null) {
        let gy = 0;
        let offsetX = 0;
        let offsetY = 0;

        if (geometry != null) {
          gy = geometry.y;
          let offset = geometry.offset;

          if (offset != null) {
            offsetX = offset.x;
            offsetY = offset.y;
          }
        }

        let dx = pe.x - p0.x;
        let dy = pe.y - p0.y;
        let nx = segment == 0 ? 0 : dy / segment;
        let ny = segment == 0 ? 0 : dx / segment;
        x = p0.x + dx * factor + (nx * gy + offsetX) * this.scale;
        y = p0.y + dy * factor - (ny * gy - offsetY) * this.scale;
      }
    } else if (geometry != null) {
      let offset = geometry.offset;

      if (offset != null) {
        x += offset.x;
        y += offset.y;
      }
    }

    return new wangPoint(x, y);
  }

  getRelativePoint(edgeState, x, y) {
    let model = this.graph.getModel();
    let geometry = model.getGeometry(edgeState.cell);

    if (geometry != null) {
      let pointCount = edgeState.absolutePoints.length;

      if (geometry.relative && pointCount > 1) {
        let totalLength = edgeState.length;
        let segments = edgeState.segments;
        let p0 = edgeState.absolutePoints[0];
        let pe = edgeState.absolutePoints[1];
        let minDist = wangUtils.ptSegDistSq(p0.x, p0.y, pe.x, pe.y, x, y);
        let index = 0;
        let tmp = 0;
        let length = 0;

        for (let i = 2; i < pointCount; i++) {
          tmp += segments[i - 2];
          pe = edgeState.absolutePoints[i];
          let dist = wangUtils.ptSegDistSq(p0.x, p0.y, pe.x, pe.y, x, y);

          if (dist <= minDist) {
            minDist = dist;
            index = i - 1;
            length = tmp;
          }

          p0 = pe;
        }

        let seg = segments[index];
        p0 = edgeState.absolutePoints[index];
        pe = edgeState.absolutePoints[index + 1];
        let x2 = p0.x;
        let y2 = p0.y;
        let x1 = pe.x;
        let y1 = pe.y;
        let px = x;
        let py = y;
        let xSegment = x2 - x1;
        let ySegment = y2 - y1;
        px -= x1;
        py -= y1;
        let projlenSq = 0;
        px = xSegment - px;
        py = ySegment - py;
        let dotprod = px * xSegment + py * ySegment;

        if (dotprod <= 0.0) {
          projlenSq = 0;
        } else {
          projlenSq = (dotprod * dotprod) / (xSegment * xSegment + ySegment * ySegment);
        }

        let projlen = Math.sqrt(projlenSq);

        if (projlen > seg) {
          projlen = seg;
        }

        let yDistance = Math.sqrt(wangUtils.ptSegDistSq(p0.x, p0.y, pe.x, pe.y, x, y));
        let direction = wangUtils.relativeCcw(p0.x, p0.y, pe.x, pe.y, x, y);

        if (direction == -1) {
          yDistance = -yDistance;
        }

        return new wangPoint(((totalLength / 2 - length - projlen) / totalLength) * -2, yDistance / this.scale);
      }
    }

    return new wangPoint();
  }

  updateEdgeLabelOffset(state) {
    let points = state.absolutePoints;
    state.absoluteOffset.x = state.getCenterX();
    state.absoluteOffset.y = state.getCenterY();

    if (points != null && points.length > 0 && state.segments != null) {
      let geometry = this.graph.getCellGeometry(state.cell);

      if (geometry.relative) {
        let offset = this.getPoint(state, geometry);

        if (offset != null) {
          state.absoluteOffset = offset;
        }
      } else {
        let p0 = points[0];
        let pe = points[points.length - 1];

        if (p0 != null && pe != null) {
          let dx = pe.x - p0.x;
          let dy = pe.y - p0.y;
          let x0 = 0;
          let y0 = 0;
          let off = geometry.offset;

          if (off != null) {
            x0 = off.x;
            y0 = off.y;
          }

          let x = p0.x + dx / 2 + x0 * this.scale;
          let y = p0.y + dy / 2 + y0 * this.scale;
          state.absoluteOffset.x = x;
          state.absoluteOffset.y = y;
        }
      }
    }
  }

  getState(cell, create) {
    create = create || false;
    let state = null;

    if (cell != null) {
      state = this.states.get(cell);

      if (create && (state == null || this.updateStyle) && this.graph.isCellVisible(cell)) {
        if (state == null) {
          state = this.createState(cell);
          this.states.put(cell, state);
        } else {
          state.style = this.graph.getCellStyle(cell);
        }
      }
    }

    return state;
  }

  isRendering() {
    return this.rendering;
  }

  setRendering(value) {
    this.rendering = value;
  }

  isAllowEval() {
    return this.allowEval;
  }

  setAllowEval(value) {
    this.allowEval = value;
  }

  getStates() {
    return this.states;
  }

  setStates(value) {
    this.states = value;
  }

  getCellStates(cells) {
    if (cells == null) {
      return this.states;
    } else {
      let result = [];

      for (let i = 0; i < cells.length; i++) {
        let state = this.getState(cells[i]);

        if (state != null) {
          result.push(state);
        }
      }

      return result;
    }
  }

  removeState(cell) {
    let state = null;

    if (cell != null) {
      state = this.states.remove(cell);

      if (state != null) {
        this.graph.cellRenderer.destroy(state);
        state.invalid = true;
        state.destroy();
      }
    }

    return state;
  }

  createState(cell) {
    return new wangCellState(this, cell, this.graph.getCellStyle(cell));
  }

  getCanvas() {
    return this.canvas;
  }

  getBackgroundPane() {
    return this.backgroundPane;
  }

  getDrawPane() {
    return this.drawPane;
  }

  getOverlayPane() {
    return this.overlayPane;
  }

  getDecoratorPane() {
    return this.decoratorPane;
  }

  isContainerEvent(evt) {
    let source = wangEvent.getSource(evt);
    return (
      source == this.graph.container ||
      source.parentNode == this.backgroundPane ||
      (source.parentNode != null && source.parentNode.parentNode == this.backgroundPane) ||
      source == this.canvas.parentNode ||
      source == this.canvas ||
      source == this.backgroundPane ||
      source == this.drawPane ||
      source == this.overlayPane ||
      source == this.decoratorPane
    );
  }

  isScrollEvent(evt) {
    let offset = wangUtils.getOffset(this.graph.container);
    let pt = new wangPoint(evt.clientX - offset.x, evt.clientY - offset.y);
    let outWidth = this.graph.container.offsetWidth;
    let inWidth = this.graph.container.clientWidth;

    if (outWidth > inWidth && pt.x > inWidth + 2 && pt.x <= outWidth) {
      return true;
    }

    let outHeight = this.graph.container.offsetHeight;
    let inHeight = this.graph.container.clientHeight;

    if (outHeight > inHeight && pt.y > inHeight + 2 && pt.y <= outHeight) {
      return true;
    }

    return false;
  }

  init() {
    this.installListeners();
    let graph = this.graph;

    if (graph.dialect == wangConstants.DIALECT_SVG) {
      this.createSvg();
    } else if (graph.dialect == wangConstants.DIALECT_VML) {
      this.createVml();
    } else {
      this.createHtml();
    }
  }

  installListeners() {
    let graph = this.graph;
    let container = graph.container;

    if (container != null) {
      if (wangClient.IS_TOUCH) {
        wangEvent.addListener(container, 'gesturestart', (evt) => {
          graph.fireGestureEvent(evt);
          wangEvent.consume(evt);
        });
        wangEvent.addListener(container, 'gesturechange', (evt) => {
          graph.fireGestureEvent(evt);
          wangEvent.consume(evt);
        });
        wangEvent.addListener(container, 'gestureend', (evt) => {
          graph.fireGestureEvent(evt);
          wangEvent.consume(evt);
        });
      }

      wangEvent.addGestureListeners(
        container,
        (evt) => {
          if (
            this.isContainerEvent(evt) &&
            ((!wangClient.IS_IE11 && !wangClient.IS_GC && !wangClient.IS_OP && !wangClient.IS_SF) || !this.isScrollEvent(evt))
          ) {
            graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt));
          }
        },
        (evt) => {
          if (this.isContainerEvent(evt)) {
            graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt));
          }
        },
        (evt) => {
          if (this.isContainerEvent(evt)) {
            graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt));
          }
        }
      );
      wangEvent.addListener(container, 'dblclick', (evt) => {
        if (this.isContainerEvent(evt)) {
          graph.dblClick(evt);
        }
      });

      let getState = function (evt) {
        let state = null;

        if (wangClient.IS_TOUCH) {
          let x = wangEvent.getClientX(evt);
          let y = wangEvent.getClientY(evt);
          let pt = wangUtils.convertPoint(container, x, y);
          state = graph.view.getState(graph.getCellAt(pt.x, pt.y));
        }

        return state;
      };

      graph.addMouseListener({
        mouseDown: function (sender, me) {
          graph.popupMenuHandler.hideMenu();
        },
        mouseMove: function () {},
        mouseUp: function () {}
      });

      this.moveHandler = (evt) => {
        if (graph.tooltipHandler != null && graph.tooltipHandler.isHideOnHover()) {
          graph.tooltipHandler.hide();
        }

        if (
          this.captureDocumentGesture &&
          graph.isMouseDown &&
          graph.container != null &&
          !this.isContainerEvent(evt) &&
          graph.container.style.display != 'none' &&
          graph.container.style.visibility != 'hidden' &&
          !wangEvent.isConsumed(evt)
        ) {
          graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt, getState(evt)));
        }
      };

      this.endHandler = (evt) => {
        if (
          this.captureDocumentGesture &&
          graph.isMouseDown &&
          graph.container != null &&
          !this.isContainerEvent(evt) &&
          graph.container.style.display != 'none' &&
          graph.container.style.visibility != 'hidden'
        ) {
          graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt));
        }
      };

      wangEvent.addGestureListeners(document, null, this.moveHandler, this.endHandler);
    }
  }

  createHtml() {
    let container = this.graph.container;

    if (container != null) {
      this.canvas = this.createHtmlPane('100%', '100%');
      this.canvas.style.overflow = 'hidden';
      this.backgroundPane = this.createHtmlPane('1px', '1px');
      this.drawPane = this.createHtmlPane('1px', '1px');
      this.overlayPane = this.createHtmlPane('1px', '1px');
      this.decoratorPane = this.createHtmlPane('1px', '1px');
      this.canvas.appendChild(this.backgroundPane);
      this.canvas.appendChild(this.drawPane);
      this.canvas.appendChild(this.overlayPane);
      this.canvas.appendChild(this.decoratorPane);
      container.appendChild(this.canvas);
      this.updateContainerStyle(container);

      if (wangClient.IS_QUIRKS) {
        let onResize = (evt) => {
          let bounds = this.getGraphBounds();
          let width = bounds.x + bounds.width + this.graph.border;
          let height = bounds.y + bounds.height + this.graph.border;
          this.updateHtmlCanvasSize(width, height);
        };

        wangEvent.addListener(window, 'resize', onResize);
      }
    }
  }

  updateHtmlCanvasSize(width, height) {
    if (this.graph.container != null) {
      let ow = this.graph.container.offsetWidth;
      let oh = this.graph.container.offsetHeight;

      if (ow < width) {
        this.canvas.style.width = width + 'px';
      } else {
        this.canvas.style.width = '100%';
      }

      if (oh < height) {
        this.canvas.style.height = height + 'px';
      } else {
        this.canvas.style.height = '100%';
      }
    }
  }

  createHtmlPane(width, height) {
    let pane = document.createElement('DIV');

    if (width != null && height != null) {
      pane.style.position = 'absolute';
      pane.style.left = '0px';
      pane.style.top = '0px';
      pane.style.width = width;
      pane.style.height = height;
    } else {
      pane.style.position = 'relative';
    }

    return pane;
  }

  createVml() {
    let container = this.graph.container;

    if (container != null) {
      let width = container.offsetWidth;
      let height = container.offsetHeight;
      this.canvas = this.createVmlPane(width, height);
      this.canvas.style.overflow = 'hidden';
      this.backgroundPane = this.createVmlPane(width, height);
      this.drawPane = this.createVmlPane(width, height);
      this.overlayPane = this.createVmlPane(width, height);
      this.decoratorPane = this.createVmlPane(width, height);
      this.canvas.appendChild(this.backgroundPane);
      this.canvas.appendChild(this.drawPane);
      this.canvas.appendChild(this.overlayPane);
      this.canvas.appendChild(this.decoratorPane);
      container.appendChild(this.canvas);
    }
  }

  createVmlPane(width, height) {
    let pane = document.createElement(wangClient.VML_PREFIX + ':group');
    pane.style.position = 'absolute';
    pane.style.left = '0px';
    pane.style.top = '0px';
    pane.style.width = width + 'px';
    pane.style.height = height + 'px';
    pane.setAttribute('coordsize', width + ',' + height);
    pane.setAttribute('coordorigin', '0,0');
    return pane;
  }

  createSvg() {
    let container = this.graph.container;
    this.canvas = document.createElementNS(wangConstants.NS_SVG, 'g');
    this.backgroundPane = document.createElementNS(wangConstants.NS_SVG, 'g');
    this.canvas.appendChild(this.backgroundPane);
    this.drawPane = document.createElementNS(wangConstants.NS_SVG, 'g');
    this.canvas.appendChild(this.drawPane);
    this.overlayPane = document.createElementNS(wangConstants.NS_SVG, 'g');
    this.canvas.appendChild(this.overlayPane);
    this.decoratorPane = document.createElementNS(wangConstants.NS_SVG, 'g');
    this.canvas.appendChild(this.decoratorPane);
    let root = document.createElementNS(wangConstants.NS_SVG, 'svg');
    root.style.left = '0px';
    root.style.top = '0px';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.display = 'block';
    root.appendChild(this.canvas);

    if (wangClient.IS_IE11) {
      root.style.overflow = 'hidden';
    }

    if (container != null) {
      container.appendChild(root);
      this.updateContainerStyle(container);
    }
  }

  updateContainerStyle(container) {
    let style = wangUtils.getCurrentStyle(container);

    if (style != null && style.position == 'static') {
      container.style.position = 'relative';
    }

    if (wangClient.IS_POINTER) {
      container.style.touchAction = 'none';
    }
  }

  destroy() {
    let root = this.canvas != null ? this.canvas.ownerSVGElement : null;

    if (root == null) {
      root = this.canvas;
    }

    if (root != null && root.parentNode != null) {
      this.clear(this.currentRoot, true);
      wangEvent.removeGestureListeners(document, null, this.moveHandler, this.endHandler);
      wangEvent.release(this.graph.container);
      root.parentNode.removeChild(root);
      this.moveHandler = null;
      this.endHandler = null;
      this.canvas = null;
      this.backgroundPane = null;
      this.drawPane = null;
      this.overlayPane = null;
      this.decoratorPane = null;
    }
  }
}
