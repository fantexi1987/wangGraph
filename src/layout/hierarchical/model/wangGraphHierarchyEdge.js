import { wangGraphAbstractHierarchyCell } from '@wangGraph/layout/hierarchical/model/wangGraphAbstractHierarchyCell';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';

export class wangGraphHierarchyEdge extends wangGraphAbstractHierarchyCell {
  source = null;
  target = null;
  isReversed = false;

  constructor(edges) {
    super(edges);
    this.edges = edges;
    this.ids = [];

    for (let i = 0; i < edges.length; i++) {
      this.ids.push(wangObjectIdentity.get(edges[i]));
    }
  }

  invert(layer) {
    let temp = this.source;
    this.source = this.target;
    this.target = temp;
    this.isReversed = !this.isReversed;
  }

  getNextLayerConnectedCells(layer) {
    if (this.nextLayerConnectedCells == null) {
      this.nextLayerConnectedCells = [];

      for (let i = 0; i < this.temp.length; i++) {
        this.nextLayerConnectedCells[i] = [];

        if (i == this.temp.length - 1) {
          this.nextLayerConnectedCells[i].push(this.source);
        } else {
          this.nextLayerConnectedCells[i].push(this);
        }
      }
    }

    return this.nextLayerConnectedCells[layer - this.minRank - 1];
  }

  getPreviousLayerConnectedCells(layer) {
    if (this.previousLayerConnectedCells == null) {
      this.previousLayerConnectedCells = [];

      for (let i = 0; i < this.temp.length; i++) {
        this.previousLayerConnectedCells[i] = [];

        if (i == 0) {
          this.previousLayerConnectedCells[i].push(this.target);
        } else {
          this.previousLayerConnectedCells[i].push(this);
        }
      }
    }

    return this.previousLayerConnectedCells[layer - this.minRank - 1];
  }

  isEdge() {
    return true;
  }

  getGeneralPurposeletiable(layer) {
    return this.temp[layer - this.minRank - 1];
  }

  setGeneralPurposeletiable(layer, value) {
    this.temp[layer - this.minRank - 1] = value;
  }

  getCoreCell() {
    if (this.edges != null && this.edges.length > 0) {
      return this.edges[0];
    }

    return null;
  }
}
