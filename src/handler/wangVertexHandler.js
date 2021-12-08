import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangClient } from '@wangGraph/wangClient';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEllipse } from '@wangGraph/shape/wangEllipse';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangGraphHandler } from '@wangGraph/handler/wangGraphHandler';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangVertexHandler {
  graph = null;
  state = null;
  singleSizer = false;
  index = null;
  allowHandleBoundsCheck = true;
  handleImage = null;
  tolerance = 0;
  rotationEnabled = false;
  parentHighlightEnabled = false;
  rotationRaster = true;
  rotationCursor = 'crosshair';
  livePreview = false;
  manageSizers = false;
  constrainGroupByChildren = false;
  rotationHandleVSpacing = -16;
  horizontalOffset = 0;
  verticalOffset = 0;

  constructor(state) {
    if (state != null) {
      this.state = state;
      this.init();

      this.escapeHandler = (sender, evt) => {
        if (this.livePreview && this.index != null) {
          this.state.view.graph.cellRenderer.redraw(this.state, true);
          this.state.view.invalidate(this.state.cell);
          this.state.invalid = false;
          this.state.view.validate();
        }

        this.reset();
      };

      this.state.view.graph.addListener(wangEvent.ESCAPE, this.escapeHandler);
    }
  }

  init() {
    this.graph = this.state.view.graph;
    this.selectionBounds = this.getSelectionBounds(this.state);
    this.bounds = new wangRectangle(
      this.selectionBounds.x,
      this.selectionBounds.y,
      this.selectionBounds.width,
      this.selectionBounds.height
    );
    this.selectionBorder = this.createSelectionShape(this.bounds);
    this.selectionBorder.dialect =
      this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
    this.selectionBorder.pointerEvents = false;
    this.selectionBorder.rotation = Number(this.state.style[wangConstants.STYLE_ROTATION] || '0');
    this.selectionBorder.init(this.graph.getView().getOverlayPane());
    wangEvent.redirectMouseEvents(this.selectionBorder.node, this.graph, this.state);

    if (this.graph.isCellMovable(this.state.cell)) {
      this.selectionBorder.setCursor(wangConstants.CURSOR_MOVABLE_VERTEX);
    }

    if (wangGraphHandler.maxCells <= 0 || this.graph.getSelectionCount() < wangGraphHandler.maxCells) {
      let resizable = this.graph.isCellResizable(this.state.cell);
      this.sizers = [];

      if (
        resizable ||
        (this.graph.isLabelMovable(this.state.cell) && this.state.width >= 2 && this.state.height >= 2)
      ) {
        let i = 0;

        if (resizable) {
          if (!this.singleSizer) {
            this.sizers.push(this.createSizer('nw-resize', i++));
            this.sizers.push(this.createSizer('n-resize', i++));
            this.sizers.push(this.createSizer('ne-resize', i++));
            this.sizers.push(this.createSizer('w-resize', i++));
            this.sizers.push(this.createSizer('e-resize', i++));
            this.sizers.push(this.createSizer('sw-resize', i++));
            this.sizers.push(this.createSizer('s-resize', i++));
          }

          this.sizers.push(this.createSizer('se-resize', i++));
        }

        let geo = this.graph.model.getGeometry(this.state.cell);

        if (
          geo != null &&
          !geo.relative &&
          !this.graph.isSwimlane(this.state.cell) &&
          this.graph.isLabelMovable(this.state.cell)
        ) {
          this.labelShape = this.createSizer(
            wangConstants.CURSOR_LABEL_HANDLE,
            wangEvent.LABEL_HANDLE,
            wangConstants.LABEL_HANDLE_SIZE,
            wangConstants.LABEL_HANDLE_FILLCOLOR
          );
          this.sizers.push(this.labelShape);
        }
      } else if (
        this.graph.isCellMovable(this.state.cell) &&
        !this.graph.isCellResizable(this.state.cell) &&
        this.state.width < 2 &&
        this.state.height < 2
      ) {
        this.labelShape = this.createSizer(
          wangConstants.CURSOR_MOVABLE_VERTEX,
          wangEvent.LABEL_HANDLE,
          null,
          wangConstants.LABEL_HANDLE_FILLCOLOR
        );
        this.sizers.push(this.labelShape);
      }
    }

    if (this.isRotationHandleVisible()) {
      this.rotationShape = this.createSizer(
        this.rotationCursor,
        wangEvent.ROTATION_HANDLE,
        wangConstants.HANDLE_SIZE + 3,
        wangConstants.HANDLE_FILLCOLOR
      );
      this.sizers.push(this.rotationShape);
    }

    this.customHandles = this.createCustomHandles();
    this.redraw();

    if (this.constrainGroupByChildren) {
      this.updateMinBounds();
    }
  }

  isRotationHandleVisible() {
    return (
      this.graph.isEnabled() &&
      this.rotationEnabled &&
      this.graph.isCellRotatable(this.state.cell) &&
      (wangGraphHandler.maxCells <= 0 || this.graph.getSelectionCount() < wangGraphHandler.maxCells)
    );
  }

  isConstrainedEvent(me) {
    return wangEvent.isShiftDown(me.getEvent()) || this.state.style[wangConstants.STYLE_ASPECT] == 'fixed';
  }

  isCenteredEvent(state, me) {
    return false;
  }

  createCustomHandles() {
    return null;
  }

  updateMinBounds() {
    let children = this.graph.getChildCells(this.state.cell);

    if (children.length > 0) {
      this.minBounds = this.graph.view.getBounds(children);

      if (this.minBounds != null) {
        let s = this.state.view.scale;
        let t = this.state.view.translate;
        this.minBounds.x -= this.state.x;
        this.minBounds.y -= this.state.y;
        this.minBounds.x /= s;
        this.minBounds.y /= s;
        this.minBounds.width /= s;
        this.minBounds.height /= s;
        this.x0 = this.state.x / s - t.x;
        this.y0 = this.state.y / s - t.y;
      }
    }
  }

  getSelectionBounds(state) {
    return new wangRectangle(
      Math.round(state.x),
      Math.round(state.y),
      Math.round(state.width),
      Math.round(state.height)
    );
  }

  createParentHighlightShape(bounds) {
    return this.createSelectionShape(bounds);
  }

  createSelectionShape(bounds) {
    let shape = new wangRectangleShape(wangRectangle.fromRectangle(bounds), null, this.getSelectionColor());
    shape.strokewidth = this.getSelectionStrokeWidth();
    shape.isDashed = this.isSelectionDashed();
    return shape;
  }

  getSelectionColor() {
    return wangConstants.VERTEX_SELECTION_COLOR;
  }

  getSelectionStrokeWidth() {
    return wangConstants.VERTEX_SELECTION_STROKEWIDTH;
  }

  isSelectionDashed() {
    return wangConstants.VERTEX_SELECTION_DASHED;
  }

  createSizer(cursor, index, size, fillColor) {
    size = size || wangConstants.HANDLE_SIZE;
    let bounds = new wangRectangle(0, 0, size, size);
    let sizer = this.createSizerShape(bounds, index, fillColor);

    if (sizer.isHtmlAllowed() && this.state.text != null && this.state.text.node.parentNode == this.graph.container) {
      sizer.bounds.height -= 1;
      sizer.bounds.width -= 1;
      sizer.dialect = wangConstants.DIALECT_STRICTHTML;
      sizer.init(this.graph.container);
    } else {
      sizer.dialect =
        this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_MIXEDHTML : wangConstants.DIALECT_SVG;
      sizer.init(this.graph.getView().getOverlayPane());
    }

    wangEvent.redirectMouseEvents(sizer.node, this.graph, this.state);

    if (this.graph.isEnabled()) {
      sizer.setCursor(cursor);
    }

    if (!this.isSizerVisible(index)) {
      sizer.visible = false;
    }

    return sizer;
  }

  isSizerVisible(index) {
    return true;
  }

  createSizerShape(bounds, index, fillColor) {
    if (this.handleImage != null) {
      bounds = new wangRectangle(bounds.x, bounds.y, this.handleImage.width, this.handleImage.height);
      let shape = new wangImageShape(bounds, this.handleImage.src);
      shape.preserveImageAspect = false;
      return shape;
    } else if (index == wangEvent.ROTATION_HANDLE) {
      return new wangEllipse(bounds, fillColor || wangConstants.HANDLE_FILLCOLOR, wangConstants.HANDLE_STROKECOLOR);
    } else {
      return new wangRectangleShape(
        bounds,
        fillColor || wangConstants.HANDLE_FILLCOLOR,
        wangConstants.HANDLE_STROKECOLOR
      );
    }
  }

  moveSizerTo(shape, x, y) {
    if (shape != null) {
      shape.bounds.x = Math.floor(x - shape.bounds.width / 2);
      shape.bounds.y = Math.floor(y - shape.bounds.height / 2);

      if (shape.node != null && shape.node.style.display != 'none') {
        shape.redraw();
      }
    }
  }

  getHandleForEvent(me) {
    let tol = !wangEvent.isMouseEvent(me.getEvent()) ? this.tolerance : 1;
    let hit =
      this.allowHandleBoundsCheck && tol > 0
        ? new wangRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol)
        : null;

    let checkShape = (shape) => {
      let real =
        shape != null && shape.constructor != wangImageShape && this.allowHandleBoundsCheck
          ? new wangRectangle(
              me.getGraphX() - shape.svgStrokeTolerance,
              me.getGraphY() - shape.svgStrokeTolerance,
              2 * shape.svgStrokeTolerance,
              2 * shape.svgStrokeTolerance
            )
          : hit;
      return (
        shape != null &&
        (me.isSource(shape) ||
          (real != null &&
            wangUtils.intersects(shape.bounds, real) &&
            shape.node.style.display != 'none' &&
            shape.node.style.visibility != 'hidden'))
      );
    };

    if (checkShape(this.rotationShape)) {
      return wangEvent.ROTATION_HANDLE;
    } else if (checkShape(this.labelShape)) {
      return wangEvent.LABEL_HANDLE;
    }

    if (this.sizers != null) {
      for (let i = 0; i < this.sizers.length; i++) {
        if (checkShape(this.sizers[i])) {
          return i;
        }
      }
    }

    if (this.customHandles != null && this.isCustomHandleEvent(me)) {
      for (let i = this.customHandles.length - 1; i >= 0; i--) {
        if (checkShape(this.customHandles[i].shape)) {
          return wangEvent.CUSTOM_HANDLE - i;
        }
      }
    }

    return null;
  }

  isCustomHandleEvent(me) {
    return true;
  }

  mouseDown(sender, me) {
    if (!me.isConsumed() && this.graph.isEnabled()) {
      let handle = this.getHandleForEvent(me);

      if (handle != null) {
        this.start(me.getGraphX(), me.getGraphY(), handle);
        me.consume();
      }
    }
  }

  isLivePreviewBorder() {
    return this.state.shape != null && this.state.shape.fill == null && this.state.shape.stroke == null;
  }

  start(x, y, index) {
    if (this.selectionBorder != null) {
      this.livePreviewActive = this.livePreview && this.graph.model.getChildCount(this.state.cell) == 0;
      this.inTolerance = true;
      this.childOffsetX = 0;
      this.childOffsetY = 0;
      this.index = index;
      this.startX = x;
      this.startY = y;

      if (this.index <= wangEvent.CUSTOM_HANDLE && this.isGhostPreview()) {
        this.ghostPreview = this.createGhostPreview();
      } else {
        let model = this.state.view.graph.model;
        let parent = model.getParent(this.state.cell);

        if (this.state.view.currentRoot != parent && (model.isVertex(parent) || model.isEdge(parent))) {
          this.parentState = this.state.view.graph.view.getState(parent);
        }

        this.selectionBorder.node.style.display = index == wangEvent.ROTATION_HANDLE ? 'inline' : 'none';

        if (!this.livePreviewActive || this.isLivePreviewBorder()) {
          this.preview = this.createSelectionShape(this.bounds);

          if (
            !(wangClient.IS_SVG && Number(this.state.style[wangConstants.STYLE_ROTATION] || '0') != 0) &&
            this.state.text != null &&
            this.state.text.node.parentNode == this.graph.container
          ) {
            this.preview.dialect = wangConstants.DIALECT_STRICTHTML;
            this.preview.init(this.graph.container);
          } else {
            this.preview.dialect =
              this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
            this.preview.init(this.graph.view.getOverlayPane());
          }
        }

        if (index == wangEvent.ROTATION_HANDLE) {
          let pos = this.getRotationHandlePosition();
          let dx = pos.x - this.state.getCenterX();
          let dy = pos.y - this.state.getCenterY();
          this.startAngle = dx != 0 ? (Math.atan(dy / dx) * 180) / Math.PI + 90 : dy < 0 ? 180 : 0;
          this.startDist = Math.sqrt(dx * dx + dy * dy);
        }

        if (this.livePreviewActive) {
          this.hideSizers();

          if (index == wangEvent.ROTATION_HANDLE) {
            this.rotationShape.node.style.display = '';
          } else if (index == wangEvent.LABEL_HANDLE) {
            this.labelShape.node.style.display = '';
          } else if (this.sizers != null && this.sizers[index] != null) {
            this.sizers[index].node.style.display = '';
          } else if (index <= wangEvent.CUSTOM_HANDLE && this.customHandles != null) {
            this.customHandles[wangEvent.CUSTOM_HANDLE - index].setVisible(true);
          }

          let edges = this.graph.getEdges(this.state.cell);
          this.edgeHandlers = [];

          for (let i = 0; i < edges.length; i++) {
            let handler = this.graph.selectionCellsHandler.getHandler(edges[i]);

            if (handler != null) {
              this.edgeHandlers.push(handler);
            }
          }
        }
      }
    }
  }

  createGhostPreview() {
    let shape = this.graph.cellRenderer.createShape(this.state);
    shape.init(this.graph.view.getOverlayPane());
    shape.scale = this.state.view.scale;
    shape.bounds = this.bounds;
    shape.outline = true;
    return shape;
  }

  setHandlesVisible(visible) {
    if (this.sizers != null) {
      for (let i = 0; i < this.sizers.length; i++) {
        this.sizers[i].node.style.display = visible ? '' : 'none';
      }
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        this.customHandles[i].setVisible(visible);
      }
    }
  }

  hideSizers() {
    this.setHandlesVisible(false);
  }

  checkTolerance(me) {
    if (this.inTolerance && this.startX != null && this.startY != null) {
      if (
        wangEvent.isMouseEvent(me.getEvent()) ||
        Math.abs(me.getGraphX() - this.startX) > this.graph.tolerance ||
        Math.abs(me.getGraphY() - this.startY) > this.graph.tolerance
      ) {
        this.inTolerance = false;
      }
    }
  }

  updateHint(me) {}

  removeHint() {}

  roundAngle(angle) {
    return Math.round(angle * 10) / 10;
  }

  roundLength(length) {
    return Math.round(length * 100) / 100;
  }

  mouseMove(sender, me) {
    if (!me.isConsumed() && this.index != null) {
      this.checkTolerance(me);

      if (!this.inTolerance) {
        if (this.index <= wangEvent.CUSTOM_HANDLE) {
          if (this.customHandles != null) {
            this.customHandles[wangEvent.CUSTOM_HANDLE - this.index].processEvent(me);
            this.customHandles[wangEvent.CUSTOM_HANDLE - this.index].active = true;

            if (this.ghostPreview != null) {
              this.ghostPreview.apply(this.state);
              this.ghostPreview.strokewidth =
                this.getSelectionStrokeWidth() / this.ghostPreview.scale / this.ghostPreview.scale;
              this.ghostPreview.isDashed = this.isSelectionDashed();
              this.ghostPreview.stroke = this.getSelectionColor();
              this.ghostPreview.redraw();

              if (this.selectionBounds != null) {
                this.selectionBorder.node.style.display = 'none';
              }
            } else {
              this.moveToFront();
              this.customHandles[wangEvent.CUSTOM_HANDLE - this.index].positionChanged();
            }
          }
        } else if (this.index == wangEvent.LABEL_HANDLE) {
          this.moveLabel(me);
        } else if (this.index == wangEvent.ROTATION_HANDLE) {
          this.rotateVertex(me);
        } else {
          this.resizeVertex(me);
          this.updateHint(me);
        }
      }

      me.consume();
    } else if (!this.graph.isMouseDown && this.getHandleForEvent(me) != null) {
      me.consume(false);
    }
  }

  isGhostPreview() {
    return this.state.view.graph.model.getChildCount(this.state.cell) > 0;
  }

  moveLabel(me) {
    let point = new wangPoint(me.getGraphX(), me.getGraphY());
    let tr = this.graph.view.translate;
    let scale = this.graph.view.scale;

    if (this.graph.isGridEnabledEvent(me.getEvent())) {
      point.x = (this.graph.snap(point.x / scale - tr.x) + tr.x) * scale;
      point.y = (this.graph.snap(point.y / scale - tr.y) + tr.y) * scale;
    }

    let index = this.rotationShape != null ? this.sizers.length - 2 : this.sizers.length - 1;
    this.moveSizerTo(this.sizers[index], point.x, point.y);
  }

  rotateVertex(me) {
    let point = new wangPoint(me.getGraphX(), me.getGraphY());
    let dx = this.state.x + this.state.width / 2 - point.x;
    let dy = this.state.y + this.state.height / 2 - point.y;
    this.currentAlpha = dx != 0 ? (Math.atan(dy / dx) * 180) / Math.PI + 90 : dy < 0 ? 180 : 0;

    if (dx > 0) {
      this.currentAlpha -= 180;
    }

    this.currentAlpha -= this.startAngle;

    if (this.rotationRaster && this.graph.isGridEnabledEvent(me.getEvent())) {
      let dx = point.x - this.state.getCenterX();
      let dy = point.y - this.state.getCenterY();
      let dist = Math.sqrt(dx * dx + dy * dy);
      let raster;

      if (dist - this.startDist < 2) {
        raster = 15;
      } else if (dist - this.startDist < 25) {
        raster = 5;
      } else {
        raster = 1;
      }

      this.currentAlpha = Math.round(this.currentAlpha / raster) * raster;
    } else {
      this.currentAlpha = this.roundAngle(this.currentAlpha);
    }

    this.selectionBorder.rotation = this.currentAlpha;
    this.selectionBorder.redraw();

    if (this.livePreviewActive) {
      this.redrawHandles();
    }
  }

  resizeVertex(me) {
    let ct = new wangPoint(this.state.getCenterX(), this.state.getCenterY());
    let alpha = wangUtils.toRadians(this.state.style[wangConstants.STYLE_ROTATION] || '0');
    let point = new wangPoint(me.getGraphX(), me.getGraphY());
    let tr = this.graph.view.translate;
    let scale = this.graph.view.scale;
    let cos = Math.cos(-alpha);
    let sin = Math.sin(-alpha);
    let dx = point.x - this.startX;
    let dy = point.y - this.startY;
    let tx = cos * dx - sin * dy;
    let ty = sin * dx + cos * dy;
    dx = tx;
    dy = ty;
    let geo = this.graph.getCellGeometry(this.state.cell);
    this.unscaledBounds = this.union(
      geo,
      dx / scale,
      dy / scale,
      this.index,
      this.graph.isGridEnabledEvent(me.getEvent()),
      1,
      new wangPoint(0, 0),
      this.isConstrainedEvent(me),
      this.isCenteredEvent(this.state, me)
    );

    if (!geo.relative) {
      let max = this.graph.getMaximumGraphBounds();

      if (max != null && this.parentState != null) {
        max = wangRectangle.fromRectangle(max);
        max.x -= (this.parentState.x - tr.x * scale) / scale;
        max.y -= (this.parentState.y - tr.y * scale) / scale;
      }

      if (this.graph.isConstrainChild(this.state.cell)) {
        let tmp = this.graph.getCellContainmentArea(this.state.cell);

        if (tmp != null) {
          let overlap = this.graph.getOverlap(this.state.cell);

          if (overlap > 0) {
            tmp = wangRectangle.fromRectangle(tmp);
            tmp.x -= tmp.width * overlap;
            tmp.y -= tmp.height * overlap;
            tmp.width += 2 * tmp.width * overlap;
            tmp.height += 2 * tmp.height * overlap;
          }

          if (max == null) {
            max = tmp;
          } else {
            max = wangRectangle.fromRectangle(max);
            max.intersect(tmp);
          }
        }
      }

      if (max != null) {
        if (this.unscaledBounds.x < max.x) {
          this.unscaledBounds.width -= max.x - this.unscaledBounds.x;
          this.unscaledBounds.x = max.x;
        }

        if (this.unscaledBounds.y < max.y) {
          this.unscaledBounds.height -= max.y - this.unscaledBounds.y;
          this.unscaledBounds.y = max.y;
        }

        if (this.unscaledBounds.x + this.unscaledBounds.width > max.x + max.width) {
          this.unscaledBounds.width -= this.unscaledBounds.x + this.unscaledBounds.width - max.x - max.width;
        }

        if (this.unscaledBounds.y + this.unscaledBounds.height > max.y + max.height) {
          this.unscaledBounds.height -= this.unscaledBounds.y + this.unscaledBounds.height - max.y - max.height;
        }
      }
    }

    let old = this.bounds;
    this.bounds = new wangRectangle(
      (this.parentState != null ? this.parentState.x : tr.x * scale) + this.unscaledBounds.x * scale,
      (this.parentState != null ? this.parentState.y : tr.y * scale) + this.unscaledBounds.y * scale,
      this.unscaledBounds.width * scale,
      this.unscaledBounds.height * scale
    );

    if (geo.relative && this.parentState != null) {
      this.bounds.x += this.state.x - this.parentState.x;
      this.bounds.y += this.state.y - this.parentState.y;
    }

    cos = Math.cos(alpha);
    sin = Math.sin(alpha);
    let c2 = new wangPoint(this.bounds.getCenterX(), this.bounds.getCenterY());
    dx = c2.x - ct.x;
    dy = c2.y - ct.y;
    let dx2 = cos * dx - sin * dy;
    let dy2 = sin * dx + cos * dy;
    let dx3 = dx2 - dx;
    let dy3 = dy2 - dy;
    let dx4 = this.bounds.x - this.state.x;
    let dy4 = this.bounds.y - this.state.y;
    let dx5 = cos * dx4 - sin * dy4;
    let dy5 = sin * dx4 + cos * dy4;
    this.bounds.x += dx3;
    this.bounds.y += dy3;
    this.unscaledBounds.x = this.roundLength(this.unscaledBounds.x + dx3 / scale);
    this.unscaledBounds.y = this.roundLength(this.unscaledBounds.y + dy3 / scale);
    this.unscaledBounds.width = this.roundLength(this.unscaledBounds.width);
    this.unscaledBounds.height = this.roundLength(this.unscaledBounds.height);

    if (!this.graph.isCellCollapsed(this.state.cell) && (dx3 != 0 || dy3 != 0)) {
      this.childOffsetX = this.state.x - this.bounds.x + dx5;
      this.childOffsetY = this.state.y - this.bounds.y + dy5;
    } else {
      this.childOffsetX = 0;
      this.childOffsetY = 0;
    }

    if (!old.equals(this.bounds)) {
      if (this.livePreviewActive) {
        this.updateLivePreview(me);
      }

      if (this.preview != null) {
        this.drawPreview();
      } else {
        this.updateParentHighlight();
      }
    }
  }

  updateLivePreview(me) {
    let scale = this.graph.view.scale;
    let tr = this.graph.view.translate;
    let tempState = this.state.clone();
    this.state.x = this.bounds.x;
    this.state.y = this.bounds.y;
    this.state.origin = new wangPoint(this.state.x / scale - tr.x, this.state.y / scale - tr.y);
    this.state.width = this.bounds.width;
    this.state.height = this.bounds.height;
    let off = this.state.absoluteOffset;
    off = new wangPoint(off.x, off.y);
    this.state.absoluteOffset.x = 0;
    this.state.absoluteOffset.y = 0;
    let geo = this.graph.getCellGeometry(this.state.cell);

    if (geo != null) {
      let offset = geo.offset || this.EMPTY_POINT;

      if (offset != null && !geo.relative) {
        this.state.absoluteOffset.x = this.state.view.scale * offset.x;
        this.state.absoluteOffset.y = this.state.view.scale * offset.y;
      }

      this.state.view.updateVertexLabelOffset(this.state);
    }

    this.state.view.graph.cellRenderer.redraw(this.state, true);
    this.state.view.invalidate(this.state.cell);
    this.state.invalid = false;
    this.state.view.validate();
    this.redrawHandles();
    this.moveToFront();

    if (this.state.control != null && this.state.control.node != null) {
      this.state.control.node.style.visibility = 'hidden';
    }

    this.state.setState(tempState);
  }

  moveToFront() {
    if (
      (this.state.text != null && this.state.text.node != null && this.state.text.node.nextSibling != null) ||
      (this.state.shape != null &&
        this.state.shape.node != null &&
        this.state.shape.node.nextSibling != null &&
        (this.state.text == null || this.state.shape.node.nextSibling != this.state.text.node))
    ) {
      if (this.state.shape != null && this.state.shape.node != null) {
        this.state.shape.node.parentNode.appendChild(this.state.shape.node);
      }

      if (this.state.text != null && this.state.text.node != null) {
        this.state.text.node.parentNode.appendChild(this.state.text.node);
      }
    }
  }

  mouseUp(sender, me) {
    if (this.index != null && this.state != null) {
      let point = new wangPoint(me.getGraphX(), me.getGraphY());
      let index = this.index;
      this.index = null;

      if (this.ghostPreview == null) {
        this.state.view.invalidate(this.state.cell, false, false);
        this.state.view.validate();
      }

      this.graph.getModel().beginUpdate();

      try {
        if (index <= wangEvent.CUSTOM_HANDLE) {
          if (this.customHandles != null) {
            let style = this.state.view.graph.getCellStyle(this.state.cell);
            this.customHandles[wangEvent.CUSTOM_HANDLE - index].active = false;
            this.customHandles[wangEvent.CUSTOM_HANDLE - index].execute(me);

            if (this.customHandles != null && this.customHandles[wangEvent.CUSTOM_HANDLE - index] != null) {
              this.state.style = style;
              this.customHandles[wangEvent.CUSTOM_HANDLE - index].positionChanged();
            }
          }
        } else if (index == wangEvent.ROTATION_HANDLE) {
          if (this.currentAlpha != null) {
            let delta = this.currentAlpha - (this.state.style[wangConstants.STYLE_ROTATION] || 0);

            if (delta != 0) {
              this.rotateCell(this.state.cell, delta);
            }
          } else {
            this.rotateClick();
          }
        } else {
          let gridEnabled = this.graph.isGridEnabledEvent(me.getEvent());
          let alpha = wangUtils.toRadians(this.state.style[wangConstants.STYLE_ROTATION] || '0');
          let cos = Math.cos(-alpha);
          let sin = Math.sin(-alpha);
          let dx = point.x - this.startX;
          let dy = point.y - this.startY;
          let tx = cos * dx - sin * dy;
          let ty = sin * dx + cos * dy;
          dx = tx;
          dy = ty;
          let s = this.graph.view.scale;
          let recurse = this.isRecursiveResize(this.state, me);
          this.resizeCell(
            this.state.cell,
            this.roundLength(dx / s),
            this.roundLength(dy / s),
            index,
            gridEnabled,
            this.isConstrainedEvent(me),
            recurse
          );
        }
      } finally {
        this.graph.getModel().endUpdate();
      }

      me.consume();
      this.reset();
    }
  }

  isRecursiveResize(state, me) {
    return this.graph.isRecursiveResize(this.state);
  }

  rotateClick() {}

  rotateCell(cell, angle, parent) {
    if (angle != 0) {
      let model = this.graph.getModel();

      if (model.isVertex(cell) || model.isEdge(cell)) {
        if (!model.isEdge(cell)) {
          let style = this.graph.getCurrentCellStyle(cell);
          let total = (style[wangConstants.STYLE_ROTATION] || 0) + angle;
          this.graph.setCellStyles(wangConstants.STYLE_ROTATION, total, [cell]);
        }

        let geo = this.graph.getCellGeometry(cell);

        if (geo != null) {
          let pgeo = this.graph.getCellGeometry(parent);

          if (pgeo != null && !model.isEdge(parent)) {
            geo = geo.clone();
            geo.rotate(angle, new wangPoint(pgeo.width / 2, pgeo.height / 2));
            model.setGeometry(cell, geo);
          }

          if ((model.isVertex(cell) && !geo.relative) || model.isEdge(cell)) {
            let childCount = model.getChildCount(cell);

            for (let i = 0; i < childCount; i++) {
              this.rotateCell(model.getChildAt(cell, i), angle, cell);
            }
          }
        }
      }
    }
  }

  reset() {
    if (
      this.sizers != null &&
      this.index != null &&
      this.sizers[this.index] != null &&
      this.sizers[this.index].node.style.display == 'none'
    ) {
      this.sizers[this.index].node.style.display = '';
    }

    this.currentAlpha = null;
    this.inTolerance = null;
    this.index = null;

    if (this.preview != null) {
      this.preview.destroy();
      this.preview = null;
    }

    if (this.ghostPreview != null) {
      this.ghostPreview.destroy();
      this.ghostPreview = null;
    }

    if (this.livePreviewActive && this.sizers != null) {
      for (let i = 0; i < this.sizers.length; i++) {
        if (this.sizers[i] != null) {
          this.sizers[i].node.style.display = '';
        }
      }

      if (this.state.control != null && this.state.control.node != null) {
        this.state.control.node.style.visibility = '';
      }
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        if (this.customHandles[i].active) {
          this.customHandles[i].active = false;
          this.customHandles[i].reset();
        } else {
          this.customHandles[i].setVisible(true);
        }
      }
    }

    if (this.selectionBorder != null) {
      this.selectionBorder.node.style.display = 'inline';
      this.selectionBounds = this.getSelectionBounds(this.state);
      this.bounds = new wangRectangle(
        this.selectionBounds.x,
        this.selectionBounds.y,
        this.selectionBounds.width,
        this.selectionBounds.height
      );
      this.drawPreview();
    }

    this.removeHint();
    this.redrawHandles();
    this.edgeHandlers = null;
    this.unscaledBounds = null;
    this.livePreviewActive = null;
  }

  resizeCell(cell, dx, dy, index, gridEnabled, constrained, recurse) {
    let geo = this.graph.model.getGeometry(cell);

    if (geo != null) {
      if (index == wangEvent.LABEL_HANDLE) {
        let alpha = -wangUtils.toRadians(this.state.style[wangConstants.STYLE_ROTATION] || '0');
        let cos = Math.cos(alpha);
        let sin = Math.sin(alpha);
        let scale = this.graph.view.scale;
        let pt = wangUtils.getRotatedPoint(
          new wangPoint(
            Math.round((this.labelShape.bounds.getCenterX() - this.startX) / scale),
            Math.round((this.labelShape.bounds.getCenterY() - this.startY) / scale)
          ),
          cos,
          sin
        );
        geo = geo.clone();

        if (geo.offset == null) {
          geo.offset = pt;
        } else {
          geo.offset.x += pt.x;
          geo.offset.y += pt.y;
        }

        this.graph.model.setGeometry(cell, geo);
      } else if (this.unscaledBounds != null) {
        let scale = this.graph.view.scale;

        if (this.childOffsetX != 0 || this.childOffsetY != 0) {
          this.moveChildren(cell, Math.round(this.childOffsetX / scale), Math.round(this.childOffsetY / scale));
        }

        this.graph.resizeCell(cell, this.unscaledBounds, recurse);
      }
    }
  }

  moveChildren(cell, dx, dy) {
    let model = this.graph.getModel();
    let childCount = model.getChildCount(cell);

    for (let i = 0; i < childCount; i++) {
      let child = model.getChildAt(cell, i);
      let geo = this.graph.getCellGeometry(child);

      if (geo != null) {
        geo = geo.clone();
        geo.translate(dx, dy);
        model.setGeometry(child, geo);
      }
    }
  }

  union(bounds, dx, dy, index, gridEnabled, scale, tr, constrained, centered) {
    gridEnabled = gridEnabled != null ? gridEnabled && this.graph.gridEnabled : this.graph.gridEnabled;

    if (this.singleSizer) {
      let x = bounds.x + bounds.width + dx;
      let y = bounds.y + bounds.height + dy;

      if (gridEnabled) {
        x = this.graph.snap(x / scale) * scale;
        y = this.graph.snap(y / scale) * scale;
      }

      let rect = new wangRectangle(bounds.x, bounds.y, 0, 0);
      rect.add(new wangRectangle(x, y, 0, 0));
      return rect;
    } else {
      let w0 = bounds.width;
      let h0 = bounds.height;
      let left = bounds.x - tr.x * scale;
      let right = left + w0;
      let top = bounds.y - tr.y * scale;
      let bottom = top + h0;
      let cx = left + w0 / 2;
      let cy = top + h0 / 2;

      if (index > 4) {
        bottom = bottom + dy;

        if (gridEnabled) {
          bottom = this.graph.snap(bottom / scale) * scale;
        } else {
          bottom = Math.round(bottom / scale) * scale;
        }
      } else if (index < 3) {
        top = top + dy;

        if (gridEnabled) {
          top = this.graph.snap(top / scale) * scale;
        } else {
          top = Math.round(top / scale) * scale;
        }
      }

      if (index == 0 || index == 3 || index == 5) {
        left += dx;

        if (gridEnabled) {
          left = this.graph.snap(left / scale) * scale;
        } else {
          left = Math.round(left / scale) * scale;
        }
      } else if (index == 2 || index == 4 || index == 7) {
        right += dx;

        if (gridEnabled) {
          right = this.graph.snap(right / scale) * scale;
        } else {
          right = Math.round(right / scale) * scale;
        }
      }

      let width = right - left;
      let height = bottom - top;

      if (constrained) {
        let geo = this.graph.getCellGeometry(this.state.cell);

        if (geo != null) {
          let aspect = geo.width / geo.height;

          if (index == 1 || index == 2 || index == 7 || index == 6) {
            width = height * aspect;
          } else {
            height = width / aspect;
          }

          if (index == 0) {
            left = right - width;
            top = bottom - height;
          }
        }
      }

      if (centered) {
        width += width - w0;
        height += height - h0;
        let cdx = cx - (left + width / 2);
        let cdy = cy - (top + height / 2);
        left += cdx;
        top += cdy;
        right += cdx;
        bottom += cdy;
      }

      if (width < 0) {
        left += width;
        width = Math.abs(width);
      }

      if (height < 0) {
        top += height;
        height = Math.abs(height);
      }

      let result = new wangRectangle(left + tr.x * scale, top + tr.y * scale, width, height);

      if (this.minBounds != null) {
        result.width = Math.max(
          result.width,
          this.minBounds.x * scale + this.minBounds.width * scale + Math.max(0, this.x0 * scale - result.x)
        );
        result.height = Math.max(
          result.height,
          this.minBounds.y * scale + this.minBounds.height * scale + Math.max(0, this.y0 * scale - result.y)
        );
      }

      return result;
    }
  }

  redraw(ignoreHandles) {
    this.selectionBounds = this.getSelectionBounds(this.state);
    this.bounds = new wangRectangle(
      this.selectionBounds.x,
      this.selectionBounds.y,
      this.selectionBounds.width,
      this.selectionBounds.height
    );
    this.drawPreview();

    if (!ignoreHandles) {
      this.redrawHandles();
    }
  }

  getHandlePadding() {
    let result = new wangPoint(0, 0);
    let tol = this.tolerance;

    if (
      this.sizers != null &&
      this.sizers.length > 0 &&
      this.sizers[0] != null &&
      (this.bounds.width < 2 * this.sizers[0].bounds.width + 2 * tol ||
        this.bounds.height < 2 * this.sizers[0].bounds.height + 2 * tol)
    ) {
      tol /= 2;
      result.x = this.sizers[0].bounds.width + tol;
      result.y = this.sizers[0].bounds.height + tol;
    }

    return result;
  }

  getSizerBounds() {
    return this.bounds;
  }

  redrawHandles() {
    let s = this.getSizerBounds();
    let tol = this.tolerance;
    this.horizontalOffset = 0;
    this.verticalOffset = 0;

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

    if (this.sizers != null && this.sizers.length > 0 && this.sizers[0] != null) {
      if (this.index == null && this.manageSizers && this.sizers.length >= 8) {
        let padding = this.getHandlePadding();
        this.horizontalOffset = padding.x;
        this.verticalOffset = padding.y;

        if (this.horizontalOffset != 0 || this.verticalOffset != 0) {
          s = new wangRectangle(s.x, s.y, s.width, s.height);
          s.x -= this.horizontalOffset / 2;
          s.width += this.horizontalOffset;
          s.y -= this.verticalOffset / 2;
          s.height += this.verticalOffset;
        }

        if (this.sizers.length >= 8) {
          if (
            s.width < 2 * this.sizers[0].bounds.width + 2 * tol ||
            s.height < 2 * this.sizers[0].bounds.height + 2 * tol
          ) {
            this.sizers[0].node.style.display = 'none';
            this.sizers[2].node.style.display = 'none';
            this.sizers[5].node.style.display = 'none';
            this.sizers[7].node.style.display = 'none';
          } else {
            this.sizers[0].node.style.display = '';
            this.sizers[2].node.style.display = '';
            this.sizers[5].node.style.display = '';
            this.sizers[7].node.style.display = '';
          }
        }
      }

      let r = s.x + s.width;
      let b = s.y + s.height;

      if (this.singleSizer) {
        this.moveSizerTo(this.sizers[0], r, b);
      } else {
        let cx = s.x + s.width / 2;
        let cy = s.y + s.height / 2;

        if (this.sizers.length >= 8) {
          let crs = [
            'nw-resize',
            'n-resize',
            'ne-resize',
            'e-resize',
            'se-resize',
            's-resize',
            'sw-resize',
            'w-resize'
          ];
          let alpha = wangUtils.toRadians(this.state.style[wangConstants.STYLE_ROTATION] || '0');
          let cos = Math.cos(alpha);
          let sin = Math.sin(alpha);
          let da = Math.round((alpha * 4) / Math.PI);
          let ct = new wangPoint(s.getCenterX(), s.getCenterY());
          let pt = wangUtils.getRotatedPoint(new wangPoint(s.x, s.y), cos, sin, ct);
          this.moveSizerTo(this.sizers[0], pt.x, pt.y);
          this.sizers[0].setCursor(crs[wangUtils.mod(0 + da, crs.length)]);
          pt.x = cx;
          pt.y = s.y;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[1], pt.x, pt.y);
          this.sizers[1].setCursor(crs[wangUtils.mod(1 + da, crs.length)]);
          pt.x = r;
          pt.y = s.y;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[2], pt.x, pt.y);
          this.sizers[2].setCursor(crs[wangUtils.mod(2 + da, crs.length)]);
          pt.x = s.x;
          pt.y = cy;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[3], pt.x, pt.y);
          this.sizers[3].setCursor(crs[wangUtils.mod(7 + da, crs.length)]);
          pt.x = r;
          pt.y = cy;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[4], pt.x, pt.y);
          this.sizers[4].setCursor(crs[wangUtils.mod(3 + da, crs.length)]);
          pt.x = s.x;
          pt.y = b;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[5], pt.x, pt.y);
          this.sizers[5].setCursor(crs[wangUtils.mod(6 + da, crs.length)]);
          pt.x = cx;
          pt.y = b;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[6], pt.x, pt.y);
          this.sizers[6].setCursor(crs[wangUtils.mod(5 + da, crs.length)]);
          pt.x = r;
          pt.y = b;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[7], pt.x, pt.y);
          this.sizers[7].setCursor(crs[wangUtils.mod(4 + da, crs.length)]);
          pt.x = cx + this.state.absoluteOffset.x;
          pt.y = cy + this.state.absoluteOffset.y;
          pt = wangUtils.getRotatedPoint(pt, cos, sin, ct);
          this.moveSizerTo(this.sizers[8], pt.x, pt.y);
        } else if (this.state.width >= 2 && this.state.height >= 2) {
          this.moveSizerTo(this.sizers[0], cx + this.state.absoluteOffset.x, cy + this.state.absoluteOffset.y);
        } else {
          this.moveSizerTo(this.sizers[0], this.state.x, this.state.y);
        }
      }
    }

    if (this.rotationShape != null) {
      let alpha = wangUtils.toRadians(
        this.currentAlpha != null ? this.currentAlpha : this.state.style[wangConstants.STYLE_ROTATION] || '0'
      );
      let cos = Math.cos(alpha);
      let sin = Math.sin(alpha);
      let ct = new wangPoint(this.state.getCenterX(), this.state.getCenterY());
      let pt = wangUtils.getRotatedPoint(this.getRotationHandlePosition(), cos, sin, ct);

      if (this.rotationShape.node != null) {
        this.moveSizerTo(this.rotationShape, pt.x, pt.y);
        this.rotationShape.node.style.visibility = this.state.view.graph.isEditing() ? 'hidden' : '';
      }
    }

    if (this.selectionBorder != null) {
      this.selectionBorder.rotation = Number(this.state.style[wangConstants.STYLE_ROTATION] || '0');
    }

    if (this.edgeHandlers != null) {
      for (let i = 0; i < this.edgeHandlers.length; i++) {
        this.edgeHandlers[i].redraw();
      }
    }
  }

  isCustomHandleVisible(handle) {
    return !this.graph.isEditing() && this.state.view.graph.getSelectionCount() == 1;
  }

  getRotationHandlePosition() {
    return new wangPoint(this.bounds.x + this.bounds.width / 2, this.bounds.y + this.rotationHandleVSpacing);
  }

  isParentHighlightVisible() {
    return true;
  }

  updateParentHighlight() {
    if (this.selectionBorder != null && this.isParentHighlightVisible()) {
      if (this.parentHighlight != null) {
        let parent = this.graph.model.getParent(this.state.cell);

        if (this.graph.model.isVertex(parent)) {
          let pstate = this.graph.view.getState(parent);
          let b = this.parentHighlight.bounds;

          if (
            pstate != null &&
            (b.x != pstate.x || b.y != pstate.y || b.width != pstate.width || b.height != pstate.height)
          ) {
            this.parentHighlight.bounds = wangRectangle.fromRectangle(pstate);
            this.parentHighlight.redraw();
          }
        } else {
          this.parentHighlight.destroy();
          this.parentHighlight = null;
        }
      } else if (this.parentHighlightEnabled) {
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
            this.parentHighlight.redraw();
          }
        }
      }
    }
  }

  drawPreview() {
    if (this.preview != null) {
      this.preview.bounds = this.bounds;

      if (this.preview.node.parentNode == this.graph.container) {
        this.preview.bounds.width = Math.max(0, this.preview.bounds.width - 1);
        this.preview.bounds.height = Math.max(0, this.preview.bounds.height - 1);
      }

      this.preview.rotation = Number(this.state.style[wangConstants.STYLE_ROTATION] || '0');
      this.preview.redraw();
    }

    this.selectionBorder.bounds = this.getSelectionBorderBounds();
    this.selectionBorder.redraw();
    this.updateParentHighlight();
  }

  getSelectionBorderBounds() {
    return this.bounds;
  }

  destroy() {
    if (this.escapeHandler != null) {
      this.state.view.graph.removeListener(this.escapeHandler);
      this.escapeHandler = null;
    }

    if (this.preview != null) {
      this.preview.destroy();
      this.preview = null;
    }

    if (this.parentHighlight != null) {
      this.parentHighlight.destroy();
      this.parentHighlight = null;
    }

    if (this.ghostPreview != null) {
      this.ghostPreview.destroy();
      this.ghostPreview = null;
    }

    if (this.selectionBorder != null) {
      this.selectionBorder.destroy();
      this.selectionBorder = null;
    }

    this.labelShape = null;
    this.removeHint();

    if (this.sizers != null) {
      for (let i = 0; i < this.sizers.length; i++) {
        this.sizers[i].destroy();
      }

      this.sizers = null;
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        this.customHandles[i].destroy();
      }

      this.customHandles = null;
    }
  }
}
