import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangStyleChange } from '@wangGraph/model/changes/wangStyleChange';
import { wangChildChange } from '@wangGraph/model/changes/wangChildChange';
import { wangValueChange } from '@wangGraph/model/changes/wangValueChange';
import { wangTerminalChange } from '@wangGraph/model/changes/wangTerminalChange';
import { wangGeometryChange } from '@wangGraph/model/changes/wangGeometryChange';

export class wangEffects {
  static animateChanges(graph, changes, done) {
    let maxStep = 10;
    let step = 0;

    let animate = function () {
      let isRequired = false;

      for (let i = 0; i < changes.length; i++) {
        let change = changes[i];

        if (
          change instanceof wangGeometryChange ||
          change instanceof wangTerminalChange ||
          change instanceof wangValueChange ||
          change instanceof wangChildChange ||
          change instanceof wangStyleChange
        ) {
          let state = graph.getView().getState(change.cell || change.child, false);

          if (state != null) {
            isRequired = true;

            if (change.constructor != wangGeometryChange || graph.model.isEdge(change.cell)) {
              wangUtils.setOpacity(state.shape.node, (100 * step) / maxStep);
            } else {
              let scale = graph.getView().scale;
              let dx = (change.geometry.x - change.previous.x) * scale;
              let dy = (change.geometry.y - change.previous.y) * scale;
              let sx = (change.geometry.width - change.previous.width) * scale;
              let sy = (change.geometry.height - change.previous.height) * scale;

              if (step == 0) {
                state.x -= dx;
                state.y -= dy;
                state.width -= sx;
                state.height -= sy;
              } else {
                state.x += dx / maxStep;
                state.y += dy / maxStep;
                state.width += sx / maxStep;
                state.height += sy / maxStep;
              }

              graph.cellRenderer.redraw(state);
              wangEffects.cascadeOpacity(graph, change.cell, (100 * step) / maxStep);
            }
          }
        }
      }

      if (step < maxStep && isRequired) {
        step++;
        window.setTimeout(animate, delay);
      } else if (done != null) {
        done();
      }
    };

    let delay = 30;
    animate();
  }

  static cascadeOpacity(graph, cell, opacity) {
    let childCount = graph.model.getChildCount(cell);

    for (let i = 0; i < childCount; i++) {
      let child = graph.model.getChildAt(cell, i);
      let childState = graph.getView().getState(child);

      if (childState != null) {
        wangUtils.setOpacity(childState.shape.node, opacity);
        wangEffects.cascadeOpacity(graph, child, opacity);
      }
    }

    let edges = graph.model.getEdges(cell);

    if (edges != null) {
      for (let i = 0; i < edges.length; i++) {
        let edgeState = graph.getView().getState(edges[i]);

        if (edgeState != null) {
          wangUtils.setOpacity(edgeState.shape.node, opacity);
        }
      }
    }
  }

  static fadeOut(node, from, remove, step, delay, isEnabled) {
    step = step || 40;
    delay = delay || 30;
    let opacity = from || 100;
    wangUtils.setOpacity(node, opacity);

    if (isEnabled || isEnabled == null) {
      let f = function () {
        opacity = Math.max(opacity - step, 0);
        wangUtils.setOpacity(node, opacity);

        if (opacity > 0) {
          window.setTimeout(f, delay);
        } else {
          node.style.visibility = 'hidden';

          if (remove && node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }
      };

      window.setTimeout(f, delay);
    } else {
      node.style.visibility = 'hidden';

      if (remove && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  }
}
