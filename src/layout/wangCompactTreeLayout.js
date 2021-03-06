import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { WeightedCellSorter } from '@wangGraph/layout/WeightedCellSorter';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangCellPath } from '@wangGraph/model/wangCellPath';
import { wangDictionary } from '@wangGraph/util/wangDictionary';

export class wangCompactTreeLayout extends wangGraphLayout {
  resizeParent = true;
  maintainParentLocation = false;
  groupPadding = 10;
  groupPaddingTop = 0;
  groupPaddingRight = 0;
  groupPaddingBottom = 0;
  groupPaddingLeft = 0;
  parentsChanged = null;
  moveTree = false;
  visited = null;
  levelDistance = 10;
  nodeDistance = 20;
  resetEdges = true;
  prefHozEdgeSep = 5;
  prefVertEdgeOff = 0;
  minEdgeJetty = 10;
  channelBuffer = 4;
  edgeRouting = true;
  sortEdges = false;
  alignRanks = false;
  maxRankHeight = null;
  root = null;
  node = null;

  constructor(graph, horizontal, invert) {
    super(graph);
    this.horizontal = horizontal != null ? horizontal : true;
    this.invert = invert != null ? invert : false;
  }

  isVertexIgnored(vertex) {
    return super.isVertexIgnored(vertex) || this.graph.getConnections(vertex).length == 0;
  }

  isHorizontal() {
    return this.horizontal;
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

  moveNode(node, dx, dy) {
    node.x += dx;
    node.y += dy;
    this.apply(node);
    let child = node.child;

    while (child != null) {
      this.moveNode(child, dx, dy);
      child = child.next;
    }
  }

  sortOutgoingEdges(source, edges) {
    let lookup = new wangDictionary();
    edges.sort(function (e1, e2) {
      let end1 = e1.getTerminal(e1.getTerminal(false) == source);
      let p1 = lookup.get(end1);

      if (p1 == null) {
        p1 = wangCellPath.create(end1).split(wangCellPath.PATH_SEPARATOR);
        lookup.put(end1, p1);
      }

      let end2 = e2.getTerminal(e2.getTerminal(false) == source);
      let p2 = lookup.get(end2);

      if (p2 == null) {
        p2 = wangCellPath.create(end2).split(wangCellPath.PATH_SEPARATOR);
        lookup.put(end2, p2);
      }

      return wangCellPath.compare(p1, p2);
    });
  }

  findRankHeights(node, rank) {
    if (this.maxRankHeight[rank] == null || this.maxRankHeight[rank] < node.height) {
      this.maxRankHeight[rank] = node.height;
    }

    let child = node.child;

    while (child != null) {
      this.findRankHeights(child, rank + 1);
      child = child.next;
    }
  }

  setCellHeights(node, rank) {
    if (this.maxRankHeight[rank] != null && this.maxRankHeight[rank] > node.height) {
      node.height = this.maxRankHeight[rank];
    }

    let child = node.child;

    while (child != null) {
      this.setCellHeights(child, rank + 1);
      child = child.next;
    }
  }

  dfs(cell, parent) {
    let id = wangCellPath.create(cell);
    let node = null;

    if (cell != null && this.visited[id] == null && !this.isVertexIgnored(cell)) {
      this.visited[id] = cell;
      node = this.createNode(cell);
      let model = this.graph.getModel();
      let prev = null;
      let out = this.graph.getEdges(cell, parent, this.invert, !this.invert, false, true);
      let view = this.graph.getView();

      if (this.sortEdges) {
        this.sortOutgoingEdges(cell, out);
      }

      for (let i = 0; i < out.length; i++) {
        let edge = out[i];

        if (!this.isEdgeIgnored(edge)) {
          if (this.resetEdges) {
            this.setEdgePoints(edge, null);
          }

          if (this.edgeRouting) {
            this.setEdgeStyleEnabled(edge, false);
            this.setEdgePoints(edge, null);
          }

          let state = view.getState(edge);
          let target =
            state != null ? state.getVisibleterminal(this.invert) : view.getVisibleterminal(edge, this.invert);
          let tmp = this.dfs(target, parent);

          if (tmp != null && model.getGeometry(target) != null) {
            if (prev == null) {
              node.child = tmp;
            } else {
              prev.next = tmp;
            }

            prev = tmp;
          }
        }
      }
    }

    return node;
  }

  layout(node) {
    if (node != null) {
      let child = node.child;

      while (child != null) {
        this.layout(child);
        child = child.next;
      }

      if (node.child != null) {
        this.attachParent(node, this.join(node));
      } else {
        this.layoutLeaf(node);
      }
    }
  }

  horizontalLayout(node, x0, y0, bounds) {
    node.x += x0 + node.offsetX;
    node.y += y0 + node.offsetY;
    bounds = this.apply(node, bounds);
    let child = node.child;

    if (child != null) {
      bounds = this.horizontalLayout(child, node.x, node.y, bounds);
      let siblingOffset = node.y + child.offsetY;
      let s = child.next;

      while (s != null) {
        bounds = this.horizontalLayout(s, node.x + child.offsetX, siblingOffset, bounds);
        siblingOffset += s.offsetY;
        s = s.next;
      }
    }

    return bounds;
  }

  verticalLayout(node, parent, x0, y0, bounds) {
    node.x += x0 + node.offsetY;
    node.y += y0 + node.offsetX;
    bounds = this.apply(node, bounds);
    let child = node.child;

    if (child != null) {
      bounds = this.verticalLayout(child, node, node.x, node.y, bounds);
      let siblingOffset = node.x + child.offsetY;
      let s = child.next;

      while (s != null) {
        bounds = this.verticalLayout(s, node, siblingOffset, node.y + child.offsetX, bounds);
        siblingOffset += s.offsetY;
        s = s.next;
      }
    }

    return bounds;
  }

  attachParent(node, height) {
    let x = this.nodeDistance + this.levelDistance;
    let y2 = (height - node.width) / 2 - this.nodeDistance;
    let y1 = y2 + node.width + 2 * this.nodeDistance - height;
    node.child.offsetX = x + node.height;
    node.child.offsetY = y1;
    node.contour.upperHead = this.createLine(node.height, 0, this.createLine(x, y1, node.contour.upperHead));
    node.contour.lowerHead = this.createLine(node.height, 0, this.createLine(x, y2, node.contour.lowerHead));
  }

  layoutLeaf(node) {
    let dist = 2 * this.nodeDistance;
    node.contour.upperTail = this.createLine(node.height + dist, 0);
    node.contour.upperHead = node.contour.upperTail;
    node.contour.lowerTail = this.createLine(0, -node.width - dist);
    node.contour.lowerHead = this.createLine(node.height + dist, 0, node.contour.lowerTail);
  }

  join(node) {
    let dist = 2 * this.nodeDistance;
    let child = node.child;
    node.contour = child.contour;
    let h = child.width + dist;
    let sum = h;
    child = child.next;

    while (child != null) {
      let d = this.merge(node.contour, child.contour);
      child.offsetY = d + h;
      child.offsetX = 0;
      h = child.width + dist;
      sum += d + h;
      child = child.next;
    }

    return sum;
  }

  merge(p1, p2) {
    let x = 0;
    let y = 0;
    let total = 0;
    let upper = p1.lowerHead;
    let lower = p2.upperHead;

    while (lower != null && upper != null) {
      let d = this.offset(x, y, lower.dx, lower.dy, upper.dx, upper.dy);
      y += d;
      total += d;

      if (x + lower.dx <= upper.dx) {
        x += lower.dx;
        y += lower.dy;
        lower = lower.next;
      } else {
        x -= upper.dx;
        y -= upper.dy;
        upper = upper.next;
      }
    }

    if (lower != null) {
      let b = this.bridge(p1.upperTail, 0, 0, lower, x, y);
      p1.upperTail = b.next != null ? p2.upperTail : b;
      p1.lowerTail = p2.lowerTail;
    } else {
      let b = this.bridge(p2.lowerTail, x, y, upper, 0, 0);

      if (b.next == null) {
        p1.lowerTail = b;
      }
    }

    p1.lowerHead = p2.lowerHead;
    return total;
  }

  offset(p1, p2, a1, a2, b1, b2) {
    let d = 0;

    if (b1 <= p1 || p1 + a1 <= 0) {
      return 0;
    }

    let t = b1 * a2 - a1 * b2;

    if (t > 0) {
      if (p1 < 0) {
        let s = p1 * a2;
        d = s / a1 - p2;
      } else if (p1 > 0) {
        let s = p1 * b2;
        d = s / b1 - p2;
      } else {
        d = -p2;
      }
    } else if (b1 < p1 + a1) {
      let s = (b1 - p1) * a2;
      d = b2 - (p2 + s / a1);
    } else if (b1 > p1 + a1) {
      let s = (a1 + p1) * b2;
      d = s / b1 - (p2 + a2);
    } else {
      d = b2 - (p2 + a2);
    }

    if (d > 0) {
      return d;
    } else {
      return 0;
    }
  }

  bridge(line1, x1, y1, line2, x2, y2) {
    let dx = x2 + line2.dx - x1;
    let dy = 0;
    let s = 0;

    if (line2.dx == 0) {
      dy = line2.dy;
    } else {
      s = dx * line2.dy;
      dy = s / line2.dx;
    }

    let r = this.createLine(dx, dy, line2.next);
    line1.next = this.createLine(0, y2 + line2.dy - dy - y1, r);
    return r;
  }

  createNode(cell) {
    let node = new Object();
    node.cell = cell;
    node.x = 0;
    node.y = 0;
    node.width = 0;
    node.height = 0;
    let geo = this.getVertexBounds(cell);

    if (geo != null) {
      if (this.isHorizontal()) {
        node.width = geo.height;
        node.height = geo.width;
      } else {
        node.width = geo.width;
        node.height = geo.height;
      }
    }

    node.offsetX = 0;
    node.offsetY = 0;
    node.contour = new Object();
    return node;
  }

  apply(node, bounds) {
    let model = this.graph.getModel();
    let cell = node.cell;
    let g = model.getGeometry(cell);

    if (cell != null && g != null) {
      if (this.isVertexMovable(cell)) {
        g = this.setVertexLocation(cell, node.x, node.y);

        if (this.resizeParent) {
          let parent = model.getParent(cell);
          let id = wangCellPath.create(parent);

          if (this.parentsChanged[id] == null) {
            this.parentsChanged[id] = parent;
          }
        }
      }

      if (bounds == null) {
        bounds = new wangRectangle(g.x, g.y, g.width, g.height);
      } else {
        bounds = new wangRectangle(
          Math.min(bounds.x, g.x),
          Math.min(bounds.y, g.y),
          Math.max(bounds.x + bounds.width, g.x + g.width),
          Math.max(bounds.y + bounds.height, g.y + g.height)
        );
      }
    }

    return bounds;
  }

  createLine(dx, dy, next) {
    let line = new Object();
    line.dx = dx;
    line.dy = dy;
    line.next = next;
    return line;
  }

  adjustParents() {
    let tmp = [];

    for (let id in this.parentsChanged) {
      tmp.push(this.parentsChanged[id]);
    }

    this.arrangeGroups(
      wangUtils.sortCells(tmp, true),
      this.groupPadding,
      this.groupPaddingTop,
      this.groupPaddingRight,
      this.groupPaddingBottom,
      this.groupPaddingLeft
    );
  }

  localEdgeProcessing(node) {
    this.processNodeOutgoing(node);
    let child = node.child;

    while (child != null) {
      this.localEdgeProcessing(child);
      child = child.next;
    }
  }

  processNodeOutgoing(node) {
    let child = node.child;
    let parentCell = node.cell;
    let childCount = 0;
    let sortedCells = [];

    while (child != null) {
      childCount++;
      let sortingCriterion = child.x;

      if (this.horizontal) {
        sortingCriterion = child.y;
      }

      sortedCells.push(new WeightedCellSorter(child, sortingCriterion));
      child = child.next;
    }

    sortedCells.sort(WeightedCellSorter.compare);
    let availableWidth = node.width;
    let requiredWidth = (childCount + 1) * this.prefHozEdgeSep;

    if (availableWidth > requiredWidth + 2 * this.prefHozEdgeSep) {
      availableWidth -= 2 * this.prefHozEdgeSep;
    }

    let edgeSpacing = availableWidth / childCount;
    let currentXOffset = edgeSpacing / 2.0;

    if (availableWidth > requiredWidth + 2 * this.prefHozEdgeSep) {
      currentXOffset += this.prefHozEdgeSep;
    }

    let currentYOffset = this.minEdgeJetty - this.prefVertEdgeOff;
    let maxYOffset = 0;
    let parentBounds = this.getVertexBounds(parentCell);
    child = node.child;

    for (let j = 0; j < sortedCells.length; j++) {
      let childCell = sortedCells[j].cell.cell;
      let childBounds = this.getVertexBounds(childCell);
      let edges = this.graph.getEdgesBetween(parentCell, childCell, false);
      let newPoints = [];
      let x = 0;
      let y = 0;

      for (let i = 0; i < edges.length; i++) {
        if (this.horizontal) {
          x = parentBounds.x + parentBounds.width;
          y = parentBounds.y + currentXOffset;
          newPoints.push(new wangPoint(x, y));
          x = parentBounds.x + parentBounds.width + currentYOffset;
          newPoints.push(new wangPoint(x, y));
          y = childBounds.y + childBounds.height / 2.0;
          newPoints.push(new wangPoint(x, y));
          this.setEdgePoints(edges[i], newPoints);
        } else {
          x = parentBounds.x + currentXOffset;
          y = parentBounds.y + parentBounds.height;
          newPoints.push(new wangPoint(x, y));
          y = parentBounds.y + parentBounds.height + currentYOffset;
          newPoints.push(new wangPoint(x, y));
          x = childBounds.x + childBounds.width / 2.0;
          newPoints.push(new wangPoint(x, y));
          this.setEdgePoints(edges[i], newPoints);
        }
      }

      if (j < childCount / 2) {
        currentYOffset += this.prefVertEdgeOff;
      } else if (j > childCount / 2) {
        currentYOffset -= this.prefVertEdgeOff;
      }

      currentXOffset += edgeSpacing;
      maxYOffset = Math.max(maxYOffset, currentYOffset);
    }
  }
}
