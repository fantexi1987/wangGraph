import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangEdgeLabelLayout extends wangGraphLayout {
  constructor(graph, radius) {
    super(graph);
  }

  execute(parent) {
    let view = this.graph.view;
    let model = this.graph.getModel();
    let edges = [];
    let vertices = [];
    let childCount = model.getChildCount(parent);

    for (let i = 0; i < childCount; i++) {
      let cell = model.getChildAt(parent, i);
      let state = view.getState(cell);

      if (state != null) {
        if (!this.isVertexIgnored(cell)) {
          vertices.push(state);
        } else if (!this.isEdgeIgnored(cell)) {
          edges.push(state);
        }
      }
    }

    this.placeLabels(vertices, edges);
  }

  placeLabels(v, e) {
    let model = this.graph.getModel();
    model.beginUpdate();

    try {
      for (let i = 0; i < e.length; i++) {
        let edge = e[i];

        if (edge != null && edge.text != null && edge.text.boundingBox != null) {
          for (let j = 0; j < v.length; j++) {
            let vertex = v[j];

            if (vertex != null) {
              this.avoid(edge, vertex);
            }
          }
        }
      }
    } finally {
      model.endUpdate();
    }
  }

  avoid(edge, vertex) {
    let model = this.graph.getModel();
    let labRect = edge.text.boundingBox;

    if (wangUtils.intersects(labRect, vertex)) {
      let dy1 = -labRect.y - labRect.height + vertex.y;
      let dy2 = -labRect.y + vertex.y + vertex.height;
      let dy = Math.abs(dy1) < Math.abs(dy2) ? dy1 : dy2;
      let dx1 = -labRect.x - labRect.width + vertex.x;
      let dx2 = -labRect.x + vertex.x + vertex.width;
      let dx = Math.abs(dx1) < Math.abs(dx2) ? dx1 : dx2;

      if (Math.abs(dx) < Math.abs(dy)) {
        dy = 0;
      } else {
        dx = 0;
      }

      let g = model.getGeometry(edge.cell);

      if (g != null) {
        g = g.clone();

        if (g.offset != null) {
          g.offset.x += dx;
          g.offset.y += dy;
        } else {
          g.offset = new wangPoint(dx, dy);
        }

        model.setGeometry(edge.cell, g);
      }
    }
  }
}
