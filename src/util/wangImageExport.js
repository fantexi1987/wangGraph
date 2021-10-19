import { wangShape } from '@wangGraph/shape/wangShape';

export class wangImageExport {
  includeOverlays = false;

  constructor() {}

  drawState(state, canvas) {
    if (state != null) {
      this.visitStatesRecursive(state, canvas, () => {
        this.drawCellState.apply(this, arguments);
      });

      if (this.includeOverlays) {
        this.visitStatesRecursive(state, canvas, () => {
          this.drawOverlays.apply(this, arguments);
        });
      }
    }
  }

  visitStatesRecursive(state, canvas, visitor) {
    if (state != null) {
      visitor(state, canvas);
      let graph = state.view.graph;
      let childCount = graph.model.getChildCount(state.cell);

      for (let i = 0; i < childCount; i++) {
        let childState = graph.view.getState(graph.model.getChildAt(state.cell, i));
        this.visitStatesRecursive(childState, canvas, visitor);
      }
    }
  }

  getLinkForCellState(state, canvas) {
    return null;
  }

  drawCellState(state, canvas) {
    let link = this.getLinkForCellState(state, canvas);

    if (link != null) {
      canvas.setLink(link);
    }

    this.drawShape(state, canvas);
    this.drawText(state, canvas);

    if (link != null) {
      canvas.setLink(null);
    }
  }

  drawShape(state, canvas) {
    if (state.shape instanceof wangShape && state.shape.checkBounds()) {
      canvas.save();
      state.shape.paint(canvas);
      canvas.restore();
    }
  }

  drawText(state, canvas) {
    if (state.text != null && state.text.checkBounds()) {
      canvas.save();
      state.text.paint(canvas);
      canvas.restore();
    }
  }

  drawOverlays(state, canvas) {
    if (state.overlays != null) {
      state.overlays.visit(function (id, shape) {
        if (shape instanceof wangShape) {
          shape.paint(canvas);
        }
      });
    }
  }
}
