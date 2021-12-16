import { wangCompactTreeLayout } from '@wangGraph/layout/wangCompactTreeLayout';

export class wangLooseTreeLayout extends wangCompactTreeLayout {
  maxTreeRank = 0;
  findNodeRank(node, rank) {
    node.rank = rank;
    if (this.maxTreeRank < rank) {
      this.maxTreeRank = rank;
    }

    let child = node.child;

    while (child != null) {
      this.findNodeRank(child, rank + 1);
      child = child.next;
    }
  }
  layoutLeaf(node) {
    let dist = 2 * this.nodeDistance;
    let rank = this.maxTreeRank - node.rank + 1;
    node.contour.upperTail = this.createLine((node.height + dist) * rank, 0);
    node.contour.upperHead = node.contour.upperTail;
    node.contour.lowerTail = this.createLine(0, -node.width - dist);
    node.contour.lowerHead = this.createLine(node.height + dist, 0, node.contour.lowerTail);
  }
  execute(parent, root) {
    this.parent = parent;
    let model = this.graph.getModel();

    if (root == null) {
      if (this.graph.getEdges(parent, model.getParent(parent), this.invert, !this.invert, false).length > 0) {
        this.root = parent;
      } else {
        let roots = this.graph.findTreeRoots(parent, true, this.invert);

        if (roots.length > 0) {
          for (let i = 0; i < roots.length; i++) {
            if (
              !this.isVertexIgnored(roots[i]) &&
              this.graph.getEdges(roots[i], null, this.invert, !this.invert, false).length > 0
            ) {
              this.root = roots[i];
              break;
            }
          }
        }
      }
    } else {
      this.root = root;
    }

    if (this.root != null) {
      if (this.resizeParent) {
        this.parentsChanged = new Object();
      } else {
        this.parentsChanged = null;
      }

      this.parentX = null;
      this.parentY = null;

      if (parent != this.root && model.isVertex(parent) != null && this.maintainParentLocation) {
        let geo = this.graph.getCellGeometry(parent);

        if (geo != null) {
          this.parentX = geo.x;
          this.parentY = geo.y;
        }
      }

      model.beginUpdate();

      try {
        this.visited = new Object();
        this.node = this.dfs(this.root, parent);

        if (this.alignRanks) {
          this.maxRankHeight = [];
          this.findRankHeights(this.node, 0);
          this.setCellHeights(this.node, 0);
        }

        if (this.node != null) {
          this.findNodeRank(this.node, 0);
          this.layout(this.node);
          let x0 = this.graph.gridSize;
          let y0 = x0;

          if (!this.moveTree) {
            let g = this.getVertexBounds(this.root);

            if (g != null) {
              x0 = g.x;
              y0 = g.y;
            }
          }

          let bounds = null;

          if (this.isHorizontal()) {
            bounds = this.horizontalLayout(this.node, x0, y0);
          } else {
            bounds = this.verticalLayout(this.node, null, x0, y0);
          }

          if (bounds != null) {
            let dx = 0;
            let dy = 0;

            if (bounds.x < 0) {
              dx = Math.abs(x0 - bounds.x);
            }

            if (bounds.y < 0) {
              dy = Math.abs(y0 - bounds.y);
            }

            if (dx != 0 || dy != 0) {
              this.moveNode(this.node, dx, dy);
            }

            if (this.resizeParent) {
              this.adjustParents();
            }

            if (this.edgeRouting) {
              this.localEdgeProcessing(this.node);
            }
          }

          if (this.parentX != null && this.parentY != null) {
            let geo = this.graph.getCellGeometry(parent);

            if (geo != null) {
              geo = geo.clone();
              geo.x = this.parentX;
              geo.y = this.parentY;
              model.setGeometry(parent, geo);
            }
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }
}
