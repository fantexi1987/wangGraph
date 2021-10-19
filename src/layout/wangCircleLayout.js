import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';

export class wangCircleLayout extends wangGraphLayout {
  moveCircle = false;
  x0 = 0;
  y0 = 0;
  resetEdges = true;
  disableEdgeStyle = true;

  constructor(graph, radius) {
    super(graph);
    this.radius = radius != null ? radius : 100;
  }

  execute(parent) {
    let model = this.graph.getModel();
    model.beginUpdate();

    try {
      let max = 0;
      let top = null;
      let left = null;
      let vertices = [];
      let childCount = model.getChildCount(parent);

      for (let i = 0; i < childCount; i++) {
        let cell = model.getChildAt(parent, i);

        if (!this.isVertexIgnored(cell)) {
          vertices.push(cell);
          let bounds = this.getVertexBounds(cell);

          if (top == null) {
            top = bounds.y;
          } else {
            top = Math.min(top, bounds.y);
          }

          if (left == null) {
            left = bounds.x;
          } else {
            left = Math.min(left, bounds.x);
          }

          max = Math.max(max, Math.max(bounds.width, bounds.height));
        } else if (!this.isEdgeIgnored(cell)) {
          if (this.resetEdges) {
            this.graph.resetEdge(cell);
          }

          if (this.disableEdgeStyle) {
            this.setEdgeStyleEnabled(cell, false);
          }
        }
      }

      let r = this.getRadius(vertices.length, max);

      if (this.moveCircle) {
        left = this.x0;
        top = this.y0;
      }

      this.circle(vertices, r, left, top);
    } finally {
      model.endUpdate();
    }
  }

  getRadius(count, max) {
    return Math.max((count * max) / Math.PI, this.radius);
  }

  circle(vertices, r, left, top) {
    let vertexCount = vertices.length;
    let phi = (2 * Math.PI) / vertexCount;

    for (let i = 0; i < vertexCount; i++) {
      if (this.isVertexMovable(vertices[i])) {
        this.setVertexLocation(
          vertices[i],
          Math.round(left + r + r * Math.sin(i * phi)),
          Math.round(top + r + r * Math.cos(i * phi))
        );
      }
    }
  }
}
