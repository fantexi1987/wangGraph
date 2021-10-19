import { wangClient } from '@wangGraph/wangClient';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangCellHighlight {
  keepOnTop = false;
  graph = null;
  state = null;
  spacing = 2;
  resetHandler = null;

  constructor(graph, highlightColor, strokeWidth, dashed) {
    if (graph != null) {
      this.graph = graph;
      this.highlightColor = highlightColor != null ? highlightColor : wangConstants.DEFAULT_VALID_COLOR;
      this.strokeWidth = strokeWidth != null ? strokeWidth : wangConstants.HIGHLIGHT_STROKEWIDTH;
      this.dashed = dashed != null ? dashed : false;
      this.opacity = wangConstants.HIGHLIGHT_OPACITY;

      this.repaintHandler = () => {
        if (this.state != null) {
          let tmp = this.graph.view.getState(this.state.cell);

          if (tmp == null) {
            this.hide();
          } else {
            this.state = tmp;
            this.repaint();
          }
        }
      };

      this.graph.getView().addListener(wangEvent.SCALE, this.repaintHandler);
      this.graph.getView().addListener(wangEvent.TRANSLATE, this.repaintHandler);
      this.graph.getView().addListener(wangEvent.SCALE_AND_TRANSLATE, this.repaintHandler);
      this.graph.getModel().addListener(wangEvent.CHANGE, this.repaintHandler);

      this.resetHandler = () => {
        this.hide();
      };

      this.graph.getView().addListener(wangEvent.DOWN, this.resetHandler);
      this.graph.getView().addListener(wangEvent.UP, this.resetHandler);
    }
  }

  setHighlightColor(color) {
    this.highlightColor = color;

    if (this.shape != null) {
      this.shape.stroke = color;
    }
  }

  drawHighlight() {
    this.shape = this.createShape();
    this.repaint();

    if (!this.keepOnTop && this.shape.node.parentNode.firstChild != this.shape.node) {
      this.shape.node.parentNode.insertBefore(this.shape.node, this.shape.node.parentNode.firstChild);
    }
  }

  createShape() {
    let shape = this.graph.cellRenderer.createShape(this.state);
    shape.svgStrokeTolerance = this.graph.tolerance;
    shape.points = this.state.absolutePoints;
    shape.apply(this.state);
    shape.stroke = this.highlightColor;
    shape.opacity = this.opacity;
    shape.isDashed = this.dashed;
    shape.isShadow = false;
    shape.dialect = this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
    shape.init(this.graph.getView().getOverlayPane());
    wangEvent.redirectMouseEvents(shape.node, this.graph, this.state);

    if (this.graph.dialect != wangConstants.DIALECT_SVG) {
      shape.pointerEvents = false;
    } else {
      shape.svgPointerEvents = 'stroke';
    }

    return shape;
  }

  getStrokeWidth(state) {
    return this.strokeWidth;
  }

  repaint() {
    if (this.state != null && this.shape != null) {
      this.shape.scale = this.state.view.scale;

      if (this.graph.model.isEdge(this.state.cell)) {
        this.shape.strokewidth = this.getStrokeWidth();
        this.shape.points = this.state.absolutePoints;
        this.shape.outline = false;
      } else {
        this.shape.bounds = new wangRectangle(
          this.state.x - this.spacing,
          this.state.y - this.spacing,
          this.state.width + 2 * this.spacing,
          this.state.height + 2 * this.spacing
        );
        this.shape.rotation = Number(this.state.style[wangConstants.STYLE_ROTATION] || '0');
        this.shape.strokewidth = this.getStrokeWidth() / this.state.view.scale;
        this.shape.outline = true;
      }

      if (this.state.shape != null) {
        this.shape.setCursor(this.state.shape.getCursor());
      }

      if (wangClient.IS_QUIRKS || document.documentMode == 8) {
        if (this.shape.stroke == 'transparent') {
          this.shape.stroke = 'white';
          this.shape.opacity = 1;
        } else {
          this.shape.opacity = this.opacity;
        }
      }

      this.shape.redraw();
    }
  }

  hide() {
    this.highlight(null);
  }

  highlight(state) {
    if (this.state != state) {
      if (this.shape != null) {
        this.shape.destroy();
        this.shape = null;
      }

      this.state = state;

      if (this.state != null) {
        this.drawHighlight();
      }
    }
  }

  isHighlightAt(x, y) {
    let hit = false;

    if (this.shape != null && document.elementFromPoint != null && !wangClient.IS_QUIRKS) {
      let elt = document.elementFromPoint(x, y);

      while (elt != null) {
        if (elt == this.shape.node) {
          hit = true;
          break;
        }

        elt = elt.parentNode;
      }
    }

    return hit;
  }

  destroy() {
    this.graph.getView().removeListener(this.resetHandler);
    this.graph.getView().removeListener(this.repaintHandler);
    this.graph.getModel().removeListener(this.repaintHandler);

    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }
  }
}
