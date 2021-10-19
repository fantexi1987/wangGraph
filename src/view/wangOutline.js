import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangMouseEvent } from '@wangGraph/util/wangMouseEvent';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangClient } from '@wangGraph/wangClient';
import { wangGraph } from '@wangGraph/view/wangGraph';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangOutline {
  outline = null;
  graphRenderHint = wangConstants.RENDERING_HINT_FASTER;
  enabled = true;
  showViewport = true;
  border = 10;
  sizerSize = 8;
  labelsVisible = false;
  updateOnPan = false;
  sizerImage = null;
  minScale = 0.0001;
  suspended = false;
  forceVmlHandles = document.documentMode == 8;

  constructor(source, container) {
    this.source = source;

    if (container != null) {
      this.init(container);
    }
  }

  createGraph(container) {
    let graph = new wangGraph(container, this.source.getModel(), this.graphRenderHint, this.source.getStylesheet());
    graph.foldingEnabled = false;
    graph.autoScroll = false;
    return graph;
  }

  init(container) {
    this.outline = this.createGraph(container);
    let outlineGraphModelChanged = this.outline.graphModelChanged;

    this.outline.graphModelChanged = (changes) => {
      if (!this.suspended && this.outline != null) {
        outlineGraphModelChanged.apply(this.outline, arguments);
      }
    };

    if (wangClient.IS_SVG) {
      let node = this.outline.getView().getCanvas().parentNode;
      node.setAttribute('shape-rendering', 'optimizeSpeed');
      node.setAttribute('image-rendering', 'optimizeSpeed');
    }

    this.outline.labelsVisible = this.labelsVisible;
    this.outline.setEnabled(false);

    this.updateHandler = (sender, evt) => {
      if (!this.suspended && !this.active) {
        this.update();
      }
    };

    this.source.getModel().addListener(wangEvent.CHANGE, this.updateHandler);
    this.outline.addMouseListener(this);
    let view = this.source.getView();
    view.addListener(wangEvent.SCALE, this.updateHandler);
    view.addListener(wangEvent.TRANSLATE, this.updateHandler);
    view.addListener(wangEvent.SCALE_AND_TRANSLATE, this.updateHandler);
    view.addListener(wangEvent.DOWN, this.updateHandler);
    view.addListener(wangEvent.UP, this.updateHandler);
    wangEvent.addListener(this.source.container, 'scroll', this.updateHandler);

    this.panHandler = (sender) => {
      if (this.updateOnPan) {
        this.updateHandler.apply(this, arguments);
      }
    };

    this.source.addListener(wangEvent.PAN, this.panHandler);

    this.refreshHandler = (sender) => {
      this.outline.setStylesheet(this.source.getStylesheet());
      this.outline.refresh();
    };

    this.source.addListener(wangEvent.REFRESH, this.refreshHandler);
    this.bounds = new wangRectangle(0, 0, 0, 0);
    this.selectionBorder = new wangRectangleShape(
      this.bounds,
      null,
      wangConstants.OUTLINE_COLOR,
      wangConstants.OUTLINE_STROKEWIDTH
    );
    this.selectionBorder.dialect = this.outline.dialect;

    if (this.forceVmlHandles) {
      this.selectionBorder.isHtmlAllowed = function () {
        return false;
      };
    }

    this.selectionBorder.init(this.outline.getView().getOverlayPane());

    let handler = (evt) => {
      let t = wangEvent.getSource(evt);

      let redirect = (evt) => {
        this.outline.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt));
      };

      let redirect2 = (evt) => {
        wangEvent.removeGestureListeners(t, null, redirect, redirect2);
        this.outline.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt));
      };

      wangEvent.addGestureListeners(t, null, redirect, redirect2);
      this.outline.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt));
    };

    wangEvent.addGestureListeners(this.selectionBorder.node, handler);
    this.sizer = this.createSizer();

    if (this.forceVmlHandles) {
      this.sizer.isHtmlAllowed = function () {
        return false;
      };
    }

    this.sizer.init(this.outline.getView().getOverlayPane());

    if (this.enabled) {
      this.sizer.node.style.cursor = 'nwse-resize';
    }

    wangEvent.addGestureListeners(this.sizer.node, handler);
    this.selectionBorder.node.style.display = this.showViewport ? '' : 'none';
    this.sizer.node.style.display = this.selectionBorder.node.style.display;
    this.selectionBorder.node.style.cursor = 'move';
    this.update(false);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = value;
  }

  setZoomEnabled(value) {
    this.sizer.node.style.visibility = value ? 'visible' : 'hidden';
  }

  refresh() {
    this.update(true);
  }

  createSizer() {
    if (this.sizerImage != null) {
      let sizer = new wangImageShape(
        new wangRectangle(0, 0, this.sizerImage.width, this.sizerImage.height),
        this.sizerImage.src
      );
      sizer.dialect = this.outline.dialect;
      return sizer;
    } else {
      let sizer = new wangRectangleShape(
        new wangRectangle(0, 0, this.sizerSize, this.sizerSize),
        wangConstants.OUTLINE_HANDLE_FILLCOLOR,
        wangConstants.OUTLINE_HANDLE_STROKECOLOR
      );
      sizer.dialect = this.outline.dialect;
      return sizer;
    }
  }

  getSourceContainerSize() {
    return new wangRectangle(0, 0, this.source.container.scrollWidth, this.source.container.scrollHeight);
  }

  getOutlineOffset(scale) {
    return null;
  }

  getSourceGraphBounds() {
    return this.source.getGraphBounds();
  }

  update(revalidate) {
    if (
      this.source != null &&
      this.source.container != null &&
      this.outline != null &&
      this.outline.container != null
    ) {
      let sourceScale = this.source.view.scale;
      let scaledGraphBounds = this.getSourceGraphBounds();
      let unscaledGraphBounds = new wangRectangle(
        scaledGraphBounds.x / sourceScale + this.source.panDx,
        scaledGraphBounds.y / sourceScale + this.source.panDy,
        scaledGraphBounds.width / sourceScale,
        scaledGraphBounds.height / sourceScale
      );
      let unscaledFinderBounds = new wangRectangle(
        0,
        0,
        this.source.container.clientWidth / sourceScale,
        this.source.container.clientHeight / sourceScale
      );
      let union = unscaledGraphBounds.clone();
      union.add(unscaledFinderBounds);
      let size = this.getSourceContainerSize();
      let completeWidth = Math.max(size.width / sourceScale, union.width);
      let completeHeight = Math.max(size.height / sourceScale, union.height);
      let availableWidth = Math.max(0, this.outline.container.clientWidth - this.border);
      let availableHeight = Math.max(0, this.outline.container.clientHeight - this.border);
      let outlineScale = Math.min(availableWidth / completeWidth, availableHeight / completeHeight);
      let scale = isNaN(outlineScale) ? this.minScale : Math.max(this.minScale, outlineScale);

      if (scale > 0) {
        if (this.outline.getView().scale != scale) {
          this.outline.getView().scale = scale;
          revalidate = true;
        }

        let navView = this.outline.getView();

        if (navView.currentRoot != this.source.getView().currentRoot) {
          navView.setCurrentRoot(this.source.getView().currentRoot);
        }

        let t = this.source.view.translate;
        let tx = t.x + this.source.panDx;
        let ty = t.y + this.source.panDy;
        let off = this.getOutlineOffset(scale);

        if (off != null) {
          tx += off.x;
          ty += off.y;
        }

        if (unscaledGraphBounds.x < 0) {
          tx = tx - unscaledGraphBounds.x;
        }

        if (unscaledGraphBounds.y < 0) {
          ty = ty - unscaledGraphBounds.y;
        }

        if (navView.translate.x != tx || navView.translate.y != ty) {
          navView.translate.x = tx;
          navView.translate.y = ty;
          revalidate = true;
        }

        let t2 = navView.translate;
        scale = this.source.getView().scale;
        let scale2 = scale / navView.scale;
        let scale3 = 1.0 / navView.scale;
        let container = this.source.container;
        this.bounds = new wangRectangle(
          (t2.x - t.x - this.source.panDx) / scale3,
          (t2.y - t.y - this.source.panDy) / scale3,
          container.clientWidth / scale2,
          container.clientHeight / scale2
        );
        this.bounds.x += (this.source.container.scrollLeft * navView.scale) / scale;
        this.bounds.y += (this.source.container.scrollTop * navView.scale) / scale;
        let b = this.selectionBorder.bounds;

        if (
          b.x != this.bounds.x ||
          b.y != this.bounds.y ||
          b.width != this.bounds.width ||
          b.height != this.bounds.height
        ) {
          this.selectionBorder.bounds = this.bounds;
          this.selectionBorder.redraw();
        }

        b = this.sizer.bounds;
        let b2 = new wangRectangle(
          this.bounds.x + this.bounds.width - b.width / 2,
          this.bounds.y + this.bounds.height - b.height / 2,
          b.width,
          b.height
        );

        if (b.x != b2.x || b.y != b2.y || b.width != b2.width || b.height != b2.height) {
          this.sizer.bounds = b2;

          if (this.sizer.node.style.visibility != 'hidden') {
            this.sizer.redraw();
          }
        }

        if (revalidate) {
          this.outline.view.revalidate();
        }
      }
    }
  }

  mouseDown(sender, me) {
    if (this.enabled && this.showViewport) {
      let tol = !wangEvent.isMouseEvent(me.getEvent()) ? this.source.tolerance : 0;
      let hit =
        this.source.allowHandleBoundsCheck && tol > 0
          ? new wangRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol)
          : null;
      // eslint-disable-next-line no-undef
      this.zoom = me.isSource(this.sizer) || (hit != null && wangUtils.intersects(shape.bounds, hit));
      this.startX = me.getX();
      this.startY = me.getY();
      this.active = true;

      if (this.source.useScrollbarsForPanning && wangUtils.hasScrollbars(this.source.container)) {
        this.dx0 = this.source.container.scrollLeft;
        this.dy0 = this.source.container.scrollTop;
      } else {
        this.dx0 = 0;
        this.dy0 = 0;
      }
    }

    me.consume();
  }

  mouseMove(sender, me) {
    if (this.active) {
      this.selectionBorder.node.style.display = this.showViewport ? '' : 'none';
      this.sizer.node.style.display = this.selectionBorder.node.style.display;
      let delta = this.getTranslateForEvent(me);
      let dx = delta.x;
      let dy = delta.y;
      let bounds = null;

      if (!this.zoom) {
        let scale = this.outline.getView().scale;
        bounds = new wangRectangle(this.bounds.x + dx, this.bounds.y + dy, this.bounds.width, this.bounds.height);
        this.selectionBorder.bounds = bounds;
        this.selectionBorder.redraw();
        dx /= scale;
        dx *= this.source.getView().scale;
        dy /= scale;
        dy *= this.source.getView().scale;
        this.source.panGraph(-dx - this.dx0, -dy - this.dy0);
      } else {
        let container = this.source.container;
        let viewRatio = container.clientWidth / container.clientHeight;
        dy = dx / viewRatio;
        bounds = new wangRectangle(
          this.bounds.x,
          this.bounds.y,
          Math.max(1, this.bounds.width + dx),
          Math.max(1, this.bounds.height + dy)
        );
        this.selectionBorder.bounds = bounds;
        this.selectionBorder.redraw();
      }

      let b = this.sizer.bounds;
      this.sizer.bounds = new wangRectangle(
        bounds.x + bounds.width - b.width / 2,
        bounds.y + bounds.height - b.height / 2,
        b.width,
        b.height
      );

      if (this.sizer.node.style.visibility != 'hidden') {
        this.sizer.redraw();
      }

      me.consume();
    }
  }

  getTranslateForEvent(me) {
    return new wangPoint(me.getX() - this.startX, me.getY() - this.startY);
  }

  mouseUp(sender, me) {
    if (this.active) {
      let delta = this.getTranslateForEvent(me);
      let dx = delta.x;
      let dy = delta.y;

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        if (!this.zoom) {
          if (!this.source.useScrollbarsForPanning || !wangUtils.hasScrollbars(this.source.container)) {
            this.source.panGraph(0, 0);
            dx /= this.outline.getView().scale;
            dy /= this.outline.getView().scale;
            let t = this.source.getView().translate;
            this.source.getView().setTranslate(t.x - dx, t.y - dy);
          }
        } else {
          let w = this.selectionBorder.bounds.width;
          let scale = this.source.getView().scale;
          this.source.zoomTo(Math.max(this.minScale, scale - (dx * scale) / w), false);
        }

        this.update();
        me.consume();
      }

      this.index = null;
      this.active = false;
    }
  }

  destroy() {
    if (this.source != null) {
      this.source.removeListener(this.panHandler);
      this.source.removeListener(this.refreshHandler);
      this.source.getModel().removeListener(this.updateHandler);
      this.source.getView().removeListener(this.updateHandler);
      wangEvent.removeListener(this.source.container, 'scroll', this.updateHandler);
      this.source = null;
    }

    if (this.outline != null) {
      this.outline.removeMouseListener(this);
      this.outline.destroy();
      this.outline = null;
    }

    if (this.selectionBorder != null) {
      this.selectionBorder.destroy();
      this.selectionBorder = null;
    }

    if (this.sizer != null) {
      this.sizer.destroy();
      this.sizer = null;
    }
  }
}
