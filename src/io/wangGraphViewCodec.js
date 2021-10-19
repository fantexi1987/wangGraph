import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangStyleRegistry } from '@wangGraph/view/wangStyleRegistry';
import { wangGraphView } from '@wangGraph/view/wangGraphView';

export class wangGraphViewCodec extends wangObjectCodec {
  constructor() {
    super(new wangGraphView());
  }

  encode(enc, view) {
    return this.encodeCell(enc, view, view.graph.getModel().getRoot());
  }

  encodeCell(enc, view, cell) {
    let model = view.graph.getModel();
    let state = view.getState(cell);
    let parent = model.getParent(cell);

    if (parent == null || state != null) {
      let childCount = model.getChildCount(cell);
      let geo = view.graph.getCellGeometry(cell);
      let name = null;

      if (parent == model.getRoot()) {
        name = 'layer';
      } else if (parent == null) {
        name = 'graph';
      } else if (model.isEdge(cell)) {
        name = 'edge';
      } else if (childCount > 0 && geo != null) {
        name = 'group';
      } else if (model.isVertex(cell)) {
        name = 'vertex';
      }

      if (name != null) {
        let node = enc.document.createElement(name);
        let lab = view.graph.getLabel(cell);

        if (lab != null) {
          node.setAttribute('label', view.graph.getLabel(cell));

          if (view.graph.isHtmlLabel(cell)) {
            node.setAttribute('html', true);
          }
        }

        if (parent == null) {
          let bounds = view.getGraphBounds();

          if (bounds != null) {
            node.setAttribute('x', Math.round(bounds.x));
            node.setAttribute('y', Math.round(bounds.y));
            node.setAttribute('width', Math.round(bounds.width));
            node.setAttribute('height', Math.round(bounds.height));
          }

          node.setAttribute('scale', view.scale);
        } else if (state != null && geo != null) {
          for (let i in state.style) {
            let value = state.style[i];

            if (typeof value == 'function' && typeof value == 'object') {
              value = wangStyleRegistry.getName(value);
            }

            if (value != null && typeof value != 'function' && typeof value != 'object') {
              node.setAttribute(i, value);
            }
          }

          let abs = state.absolutePoints;

          if (abs != null && abs.length > 0) {
            let pts = Math.round(abs[0].x) + ',' + Math.round(abs[0].y);

            for (let i = 1; i < abs.length; i++) {
              pts += ' ' + Math.round(abs[i].x) + ',' + Math.round(abs[i].y);
            }

            node.setAttribute('points', pts);
          } else {
            node.setAttribute('x', Math.round(state.x));
            node.setAttribute('y', Math.round(state.y));
            node.setAttribute('width', Math.round(state.width));
            node.setAttribute('height', Math.round(state.height));
          }

          let offset = state.absoluteOffset;

          if (offset != null) {
            if (offset.x != 0) {
              node.setAttribute('dx', Math.round(offset.x));
            }

            if (offset.y != 0) {
              node.setAttribute('dy', Math.round(offset.y));
            }
          }
        }

        for (let i = 0; i < childCount; i++) {
          let childNode = this.encodeCell(enc, view, model.getChildAt(cell, i));

          if (childNode != null) {
            node.appendChild(childNode);
          }
        }
      }
    }

    return node;
  }
}
