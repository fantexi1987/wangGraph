import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangCellState extends wangRectangle {
  invalidStyle = false;
  invalid = true;
  absolutePoints = null;
  visibleSourceState = null;
  visibletargetState = null;
  terminalDistance = 0;
  length = 0;
  segments = null;
  shape = null;
  text = null;
  unscaledWidth = null;
  unscaledHeight = null;

  constructor(view, cell, style) {
    super();
    this.view = view;
    this.cell = cell;
    this.style = style != null ? style : {};
    this.origin = new wangPoint();
    this.absoluteOffset = new wangPoint();
  }

  getPerimeterBounds(border, bounds) {
    border = border || 0;
    bounds = bounds != null ? bounds : new wangRectangle(this.x, this.y, this.width, this.height);

    if (this.shape != null && this.shape.stencil != null && this.shape.stencil.aspect == 'fixed') {
      let aspect = this.shape.stencil.computeAspect(this.style, bounds.x, bounds.y, bounds.width, bounds.height);
      bounds.x = aspect.x;
      bounds.y = aspect.y;
      bounds.width = this.shape.stencil.w0 * aspect.width;
      bounds.height = this.shape.stencil.h0 * aspect.height;
    }

    if (border != 0) {
      bounds.grow(border);
    }

    return bounds;
  }

  setAbsoluteTerminalPoint(point, isSource) {
    if (isSource) {
      if (this.absolutePoints == null) {
        this.absolutePoints = [];
      }

      if (this.absolutePoints.length == 0) {
        this.absolutePoints.push(point);
      } else {
        this.absolutePoints[0] = point;
      }
    } else {
      if (this.absolutePoints == null) {
        this.absolutePoints = [];
        this.absolutePoints.push(null);
        this.absolutePoints.push(point);
      } else if (this.absolutePoints.length == 1) {
        this.absolutePoints.push(point);
      } else {
        this.absolutePoints[this.absolutePoints.length - 1] = point;
      }
    }
  }

  setCursor(cursor) {
    if (this.shape != null) {
      this.shape.setCursor(cursor);
    }

    if (this.text != null) {
      this.text.setCursor(cursor);
    }
  }

  getVisibleterminal(source) {
    let tmp = this.getVisibleterminalState(source);
    return tmp != null ? tmp.cell : null;
  }

  getVisibleterminalState(source) {
    return source ? this.visibleSourceState : this.visibletargetState;
  }

  setVisibleterminalState(terminalState, source) {
    if (source) {
      this.visibleSourceState = terminalState;
    } else {
      this.visibletargetState = terminalState;
    }
  }

  getCellBounds() {
    return this.cellBounds;
  }

  getPaintBounds() {
    return this.paintBounds;
  }

  updateCachedBounds() {
    let tr = this.view.translate;
    let s = this.view.scale;
    this.cellBounds = new wangRectangle(this.x / s - tr.x, this.y / s - tr.y, this.width / s, this.height / s);
    this.paintBounds = wangRectangle.fromRectangle(this.cellBounds);

    if (this.shape != null && this.shape.isPaintBoundsInverted()) {
      this.paintBounds.rotate90();
    }
  }

  setState(state) {
    this.view = state.view;
    this.cell = state.cell;
    this.style = state.style;
    this.absolutePoints = state.absolutePoints;
    this.origin = state.origin;
    this.absoluteOffset = state.absoluteOffset;
    this.boundingBox = state.boundingBox;
    this.terminalDistance = state.terminalDistance;
    this.segments = state.segments;
    this.length = state.length;
    this.x = state.x;
    this.y = state.y;
    this.width = state.width;
    this.height = state.height;
    this.unscaledWidth = state.unscaledWidth;
    this.unscaledHeight = state.unscaledHeight;
  }

  clone() {
    let clone = new wangCellState(this.view, this.cell, this.style);

    if (this.absolutePoints != null) {
      clone.absolutePoints = [];

      for (let i = 0; i < this.absolutePoints.length; i++) {
        clone.absolutePoints[i] = this.absolutePoints[i].clone();
      }
    }

    if (this.origin != null) {
      clone.origin = this.origin.clone();
    }

    if (this.absoluteOffset != null) {
      clone.absoluteOffset = this.absoluteOffset.clone();
    }

    if (this.boundingBox != null) {
      clone.boundingBox = this.boundingBox.clone();
    }

    clone.terminalDistance = this.terminalDistance;
    clone.segments = this.segments;
    clone.length = this.length;
    clone.x = this.x;
    clone.y = this.y;
    clone.width = this.width;
    clone.height = this.height;
    clone.unscaledWidth = this.unscaledWidth;
    clone.unscaledHeight = this.unscaledHeight;
    return clone;
  }

  destroy() {
    this.view.graph.cellRenderer.destroy(this);
  }
}
