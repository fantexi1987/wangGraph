import { wangCompactTreeLayout } from '@wangGraph/layout/wangCompactTreeLayout';

export class wangRadialTreeLayout extends wangCompactTreeLayout {
  angleOffset = 0.5;
  rootx = 0;
  rooty = 0;
  levelDistance = 120;
  nodeDistance = 10;
  autoRadius = false;
  sortEdges = false;
  rowMinX = [];
  rowMaxX = [];
  rowMinCenX = [];
  rowMaxCenX = [];
  rowRadi = [];
  row = [];

  constructor(graph) {
    super(graph, false);
  }

  isVertexIgnored(vertex) {
    return super.isVertexIgnored(vertex) || this.graph.getConnections(vertex).length == 0;
  }

  execute(parent, root) {
    this.parent = parent;
    this.useBoundingBox = false;
    this.edgeRouting = false;
    super.execute(parent, root);
    let bounds = null;
    let rootBounds = this.getVertexBounds(this.root);
    this.centerX = rootBounds.x + rootBounds.width / 2;
    this.centerY = rootBounds.y + rootBounds.height / 2;

    for (let vertex in this.visited) {
      let vertexBounds = this.getVertexBounds(this.visited[vertex]);
      bounds = bounds != null ? bounds : vertexBounds.clone();
      bounds.add(vertexBounds);
    }

    this.calcRowDims([this.node], 0);
    let maxLeftGrad = 0;
    let maxRightGrad = 0;

    for (let i = 0; i < this.row.length; i++) {
      let leftGrad = (this.centerX - this.rowMinX[i] - this.nodeDistance) / this.rowRadi[i];
      let rightGrad = (this.rowMaxX[i] - this.centerX - this.nodeDistance) / this.rowRadi[i];
      maxLeftGrad = Math.max(maxLeftGrad, leftGrad);
      maxRightGrad = Math.max(maxRightGrad, rightGrad);
    }

    for (let i = 0; i < this.row.length; i++) {
      let xLeftLimit = this.centerX - this.nodeDistance - maxLeftGrad * this.rowRadi[i];
      let xRightLimit = this.centerX + this.nodeDistance + maxRightGrad * this.rowRadi[i];
      let fullWidth = xRightLimit - xLeftLimit;

      for (let j = 0; j < this.row[i].length; j++) {
        let row = this.row[i];
        let node = row[j];
        let vertexBounds = this.getVertexBounds(node.cell);
        let xProportion = (vertexBounds.x + vertexBounds.width / 2 - xLeftLimit) / fullWidth;
        let theta = 2 * Math.PI * xProportion;
        node.theta = theta;
      }
    }

    for (let i = this.row.length - 2; i >= 0; i--) {
      let row = this.row[i];

      for (let j = 0; j < row.length; j++) {
        let node = row[j];
        let child = node.child;
        let counter = 0;
        let totalTheta = 0;

        while (child != null) {
          totalTheta += child.theta;
          counter++;
          child = child.next;
        }

        if (counter > 0) {
          let averTheta = totalTheta / counter;

          if (averTheta > node.theta && j < row.length - 1) {
            let nextTheta = row[j + 1].theta;
            node.theta = Math.min(averTheta, nextTheta - Math.PI / 10);
          } else if (averTheta < node.theta && j > 0) {
            let lastTheta = row[j - 1].theta;
            node.theta = Math.max(averTheta, lastTheta + Math.PI / 10);
          }
        }
      }
    }

    for (let i = 0; i < this.row.length; i++) {
      for (let j = 0; j < this.row[i].length; j++) {
        let row = this.row[i];
        let node = row[j];
        let vertexBounds = this.getVertexBounds(node.cell);
        this.setVertexLocation(
          node.cell,
          this.centerX - vertexBounds.width / 2 + this.rowRadi[i] * Math.cos(node.theta),
          this.centerY - vertexBounds.height / 2 + this.rowRadi[i] * Math.sin(node.theta)
        );
      }
    }
  }

  calcRowDims(row, rowNum) {
    if (row == null || row.length == 0) {
      return;
    }

    this.rowMinX[rowNum] = this.centerX;
    this.rowMaxX[rowNum] = this.centerX;
    this.rowMinCenX[rowNum] = this.centerX;
    this.rowMaxCenX[rowNum] = this.centerX;
    this.row[rowNum] = [];
    let rowHasChildren = false;

    for (let i = 0; i < row.length; i++) {
      let child = row[i] != null ? row[i].child : null;

      while (child != null) {
        let cell = child.cell;
        let vertexBounds = this.getVertexBounds(cell);
        this.rowMinX[rowNum] = Math.min(vertexBounds.x, this.rowMinX[rowNum]);
        this.rowMaxX[rowNum] = Math.max(vertexBounds.x + vertexBounds.width, this.rowMaxX[rowNum]);
        this.rowMinCenX[rowNum] = Math.min(vertexBounds.x + vertexBounds.width / 2, this.rowMinCenX[rowNum]);
        this.rowMaxCenX[rowNum] = Math.max(vertexBounds.x + vertexBounds.width / 2, this.rowMaxCenX[rowNum]);
        this.rowRadi[rowNum] = vertexBounds.y - this.getVertexBounds(this.root).y;

        if (child.child != null) {
          rowHasChildren = true;
        }

        this.row[rowNum].push(child);
        child = child.next;
      }
    }

    if (rowHasChildren) {
      this.calcRowDims(this.row[rowNum], rowNum + 1);
    }
  }
}
