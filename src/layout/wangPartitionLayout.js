import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';
import { wangRectangle } from '@wangGraph/util/wangRectangle';

export class wangPartitionLayout extends wangGraphLayout {
  resizeVertices = true;

  constructor(graph, horizontal, spacing, border) {
    super(graph);
    this.horizontal = horizontal != null ? horizontal : true;
    this.spacing = spacing || 0;
    this.border = border || 0;
  }

  isHorizontal() {
    return this.horizontal;
  }

  moveCell(cell, x, y) {
    let model = this.graph.getModel();
    let parent = model.getParent(cell);

    if (cell != null && parent != null) {
      let i = 0;
      let last = 0;
      let childCount = model.getChildCount(parent);

      for (i = 0; i < childCount; i++) {
        let child = model.getChildAt(parent, i);
        let bounds = this.getVertexBounds(child);

        if (bounds != null) {
          let tmp = bounds.x + bounds.width / 2;

          if (last < x && tmp > x) {
            break;
          }

          last = tmp;
        }
      }

      let idx = parent.getIndex(cell);
      idx = Math.max(0, i - (i > idx ? 1 : 0));
      model.add(parent, cell, idx);
    }
  }

  execute(parent) {
    let horizontal = this.isHorizontal();
    let model = this.graph.getModel();
    let pgeo = model.getGeometry(parent);

    if (
      this.graph.container != null &&
      ((pgeo == null && model.isLayer(parent)) || parent == this.graph.getView().currentRoot)
    ) {
      let width = this.graph.container.offsetWidth - 1;
      let height = this.graph.container.offsetHeight - 1;
      pgeo = new wangRectangle(0, 0, width, height);
    }

    if (pgeo != null) {
      let children = [];
      let childCount = model.getChildCount(parent);

      for (let i = 0; i < childCount; i++) {
        let child = model.getChildAt(parent, i);

        if (!this.isVertexIgnored(child) && this.isVertexMovable(child)) {
          children.push(child);
        }
      }

      let n = children.length;

      if (n > 0) {
        let x0 = this.border;
        let y0 = this.border;
        let other = horizontal ? pgeo.height : pgeo.width;
        other -= 2 * this.border;
        let size = this.graph.isSwimlane(parent) ? this.graph.getStartSize(parent) : new wangRectangle();
        other -= horizontal ? size.height : size.width;
        x0 = x0 + size.width;
        y0 = y0 + size.height;
        let tmp = this.border + (n - 1) * this.spacing;
        let value = horizontal ? (pgeo.width - x0 - tmp) / n : (pgeo.height - y0 - tmp) / n;

        if (value > 0) {
          model.beginUpdate();

          try {
            for (let i = 0; i < n; i++) {
              let child = children[i];
              let geo = model.getGeometry(child);

              if (geo != null) {
                geo = geo.clone();
                geo.x = x0;
                geo.y = y0;

                if (horizontal) {
                  if (this.resizeVertices) {
                    geo.width = value;
                    geo.height = other;
                  }

                  x0 += value + this.spacing;
                } else {
                  if (this.resizeVertices) {
                    geo.height = value;
                    geo.width = other;
                  }

                  y0 += value + this.spacing;
                }

                model.setGeometry(child, geo);
              }
            }
          } finally {
            model.endUpdate();
          }
        }
      }
    }
  }
}
