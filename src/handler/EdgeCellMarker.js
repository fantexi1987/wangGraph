import { wangCellMarker } from '@wangGraph/handler/wangCellMarker';

export class EdgeCellMarker extends wangCellMarker {
  constructor(edgeHandler, graph) {
    super(graph);
    this.edgeHandler = edgeHandler;
  }

  getCell(me) {
    let cell = super.getCell(me);

    if ((cell == this.edgeHandler.state.cell || cell == null) && this.edgeHandler.currentPoint != null) {
      cell = this.edgeHandler.graph.getCellAt(this.edgeHandler.currentPoint.x, this.edgeHandler.currentPoint.y);
    }

    if (cell != null && !this.edgeHandler.graph.isCellConnectable(cell)) {
      let parent = this.edgeHandler.graph.getModel().getParent(cell);

      if (this.edgeHandler.graph.getModel().isVertex(parent) && this.edgeHandler.graph.isCellConnectable(parent)) {
        cell = parent;
      }
    }

    let model = this.edgeHandler.graph.getModel();

    if (
      (this.edgeHandler.graph.isSwimlane(cell) &&
        this.edgeHandler.currentPoint != null &&
        this.edgeHandler.graph.hitsSwimlaneContent(
          cell,
          this.edgeHandler.currentPoint.x,
          this.edgeHandler.currentPoint.y
        )) ||
      !this.edgeHandler.isConnectableCell(cell) ||
      cell == this.edgeHandler.state.cell ||
      (cell != null && !this.edgeHandler.graph.connectableEdges && model.isEdge(cell)) ||
      model.isAncestor(this.edgeHandler.state.cell, cell)
    ) {
      cell = null;
    }

    if (!this.edgeHandler.graph.isCellConnectable(cell)) {
      cell = null;
    }

    return cell;
  }

  isValidState(state) {
    let model = this.edgeHandler.graph.getModel();
    let other = this.edgeHandler.graph.view.getTerminalPort(
      state,
      this.edgeHandler.graph.view.getState(model.getTerminal(this.edgeHandler.state.cell, !this.edgeHandler.isSource)),
      !this.edgeHandler.isSource
    );
    let otherCell = other != null ? other.cell : null;
    let source = this.edgeHandler.isSource ? state.cell : otherCell;
    let target = this.edgeHandler.isSource ? otherCell : state.cell;
    this.edgeHandler.error = this.edgeHandler.validateConnection(source, target);
    return this.edgeHandler.error == null;
  }
}
