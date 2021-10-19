import { wangAnimation } from '@wangGraph/util/wangAnimation';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangCellStatePreview } from '@wangGraph/view/wangCellStatePreview';

export class wangMorphing extends wangAnimation {
  step = 0;
  cells = null;

  constructor(graph, steps, ease, delay) {
    super(delay);
    this.graph = graph;
    this.steps = steps != null ? steps : 6;
    this.ease = ease != null ? ease : 1.5;
  }

  updateAnimation() {
    super.updateAnimation();
    let move = new wangCellStatePreview(this.graph);

    if (this.cells != null) {
      for (let i = 0; i < this.cells.length; i++) {
        this.animateCell(this.cells[i], move, false);
      }
    } else {
      this.animateCell(this.graph.getModel().getRoot(), move, true);
    }

    this.show(move);

    if (move.isEmpty() || this.step++ >= this.steps) {
      this.stopAnimation();
    }
  }

  show(move) {
    move.show();
  }

  animateCell(cell, move, recurse) {
    let state = this.graph.getView().getState(cell);
    let delta = null;

    if (state != null) {
      delta = this.getDelta(state);

      if (this.graph.getModel().isVertex(cell) && (delta.x != 0 || delta.y != 0)) {
        let translate = this.graph.view.getTranslate();
        let scale = this.graph.view.getScale();
        delta.x += translate.x * scale;
        delta.y += translate.y * scale;
        move.moveState(state, -delta.x / this.ease, -delta.y / this.ease);
      }
    }

    if (recurse && !this.stopRecursion(state, delta)) {
      let childCount = this.graph.getModel().getChildCount(cell);

      for (let i = 0; i < childCount; i++) {
        this.animateCell(this.graph.getModel().getChildAt(cell, i), move, recurse);
      }
    }
  }

  stopRecursion(state, delta) {
    return delta != null && (delta.x != 0 || delta.y != 0);
  }

  getDelta(state) {
    let origin = this.getOriginForCell(state.cell);
    let translate = this.graph.getView().getTranslate();
    let scale = this.graph.getView().getScale();
    let x = state.x / scale - translate.x;
    let y = state.y / scale - translate.y;
    return new wangPoint((origin.x - x) * scale, (origin.y - y) * scale);
  }

  getOriginForCell(cell) {
    let result = null;

    if (cell != null) {
      let parent = this.graph.getModel().getParent(cell);
      let geo = this.graph.getCellGeometry(cell);
      result = this.getOriginForCell(parent);

      if (geo != null) {
        if (geo.relative) {
          let pgeo = this.graph.getCellGeometry(parent);

          if (pgeo != null) {
            result.x += geo.x * pgeo.width;
            result.y += geo.y * pgeo.height;
          }
        } else {
          result.x += geo.x;
          result.y += geo.y;
        }
      }
    }

    if (result == null) {
      let t = this.graph.view.getTranslate();
      result = new wangPoint(-t.x, -t.y);
    }

    return result;
  }
}
