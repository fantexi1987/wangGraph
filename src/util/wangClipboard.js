export class wangClipboard {
  static STEPSIZE = 10;
  static insertCount = 1;
  static cells = null;

  static setCells(cells) {
    wangClipboard.cells = cells;
  }

  static getCells() {
    return wangClipboard.cells;
  }

  static isEmpty() {
    return wangClipboard.getCells() == null;
  }

  static cut(graph, cells) {
    cells = wangClipboard.copy(graph, cells);
    wangClipboard.insertCount = 0;
    wangClipboard.removeCells(graph, cells);
    return cells;
  }

  static removeCells(graph, cells) {
    graph.removeCells(cells);
  }

  static copy(graph, cells) {
    cells = cells || graph.getSelectionCells();
    let result = graph.getExportableCells(graph.model.getTopmostCells(cells));
    wangClipboard.insertCount = 1;
    wangClipboard.setCells(graph.cloneCells(result));
    return result;
  }

  static paste(graph) {
    let cells = null;

    if (!wangClipboard.isEmpty()) {
      cells = graph.getImportableCells(wangClipboard.getCells());
      let delta = wangClipboard.insertCount * wangClipboard.STEPSIZE;
      let parent = graph.getDefaultParent();
      cells = graph.importCells(cells, delta, delta, parent);
      wangClipboard.insertCount++;
      graph.setSelectionCells(cells);
    }

    return cells;
  }
}
