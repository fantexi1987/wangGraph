import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangStyleChange } from '@wangGraph/model/changes/wangStyleChange';
import { wangVisibleChange } from '@wangGraph/model/changes/wangVisibleChange';
import { wangGeometryChange } from '@wangGraph/model/changes/wangGeometryChange';
import { wangTerminalChange } from '@wangGraph/model/changes/wangTerminalChange';
import { wangChildChange } from '@wangGraph/model/changes/wangChildChange';
import { wangRootChange } from '@wangGraph/model/changes/wangRootChange';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangLayoutManager extends wangEventSource {
  graph = null;
  bubbling = true;
  enabled = true;

  constructor(graph) {
    super();

    this.undoHandler = (sender, evt) => {
      if (this.isEnabled()) {
        this.beforeUndo(evt.getProperty('edit'));
      }
    };

    this.moveHandler = (sender, evt) => {
      if (this.isEnabled()) {
        this.cellsMoved(evt.getProperty('cells'), evt.getProperty('event'));
      }
    };

    this.resizeHandler = (sender, evt) => {
      if (this.isEnabled()) {
        this.cellsResized(evt.getProperty('cells'), evt.getProperty('bounds'), evt.getProperty('previous'));
      }
    };

    this.setGraph(graph);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  isBubbling() {
    return this.bubbling;
  }

  setBubbling(value) {
    this.bubbling = value;
  }

  getGraph() {
    return this.graph;
  }

  setGraph(graph) {
    if (this.graph != null) {
      let model = this.graph.getModel();
      model.removeListener(this.undoHandler);
      this.graph.removeListener(this.moveHandler);
      this.graph.removeListener(this.resizeHandler);
    }

    this.graph = graph;

    if (this.graph != null) {
      let model = this.graph.getModel();
      model.addListener(wangEvent.BEFORE_UNDO, this.undoHandler);
      this.graph.addListener(wangEvent.MOVE_CELLS, this.moveHandler);
      this.graph.addListener(wangEvent.RESIZE_CELLS, this.resizeHandler);
    }
  }

  hasLayout(cell) {
    return this.getLayout(cell, wangEvent.LAYOUT_CELLS);
  }

  getLayout(cell, eventName) {
    return null;
  }

  beforeUndo(undoableEdit) {
    this.executeLayoutForCells(this.getCellsForChanges(undoableEdit.changes));
  }

  cellsMoved(cells, evt) {
    if (cells != null && evt != null) {
      let point = wangUtils.convertPoint(this.getGraph().container, wangEvent.getClientX(evt), wangEvent.getClientY(evt));

      for (let i = 0; i < cells.length; i++) {
        let layout = this.getAncestorLayout(cells[i], wangEvent.MOVE_CELLS);

        if (layout != null) {
          layout.moveCell(cells[i], point.x, point.y);
        }
      }
    }
  }

  cellsResized(cells, bounds, prev) {
    if (cells != null && bounds != null) {
      for (let i = 0; i < cells.length; i++) {
        let layout = this.getAncestorLayout(cells[i], wangEvent.RESIZE_CELLS);

        if (layout != null) {
          layout.resizeCell(cells[i], bounds[i], prev[i]);
        }
      }
    }
  }

  getAncestorLayout(cell, eventName) {
    let model = this.getGraph().getModel();

    while (cell != null) {
      let layout = this.getLayout(cell, eventName);

      if (layout != null) {
        return layout;
      }

      cell = model.getParent(cell);
    }

    return null;
  }

  getCellsForChanges(changes) {
    let result = [];

    for (let i = 0; i < changes.length; i++) {
      let change = changes[i];

      if (change instanceof wangRootChange) {
        return [];
      } else {
        result = result.concat(this.getCellsForChange(change));
      }
    }

    return result;
  }

  getCellsForChange(change) {
    if (change instanceof wangChildChange) {
      return this.addCellsWithLayout(change.child, this.addCellsWithLayout(change.previous));
    } else if (change instanceof wangTerminalChange || change instanceof wangGeometryChange) {
      return this.addCellsWithLayout(change.cell);
    } else if (change instanceof wangVisibleChange || change instanceof wangStyleChange) {
      return this.addCellsWithLayout(change.cell);
    }

    return [];
  }

  addCellsWithLayout(cell, result) {
    return this.addDescendantsWithLayout(cell, this.addAncestorsWithLayout(cell, result));
  }

  addAncestorsWithLayout(cell, result) {
    result = result != null ? result : [];

    if (cell != null) {
      let layout = this.hasLayout(cell);

      if (layout != null) {
        result.push(cell);
      }

      if (this.isBubbling()) {
        let model = this.getGraph().getModel();
        this.addAncestorsWithLayout(model.getParent(cell), result);
      }
    }

    return result;
  }

  addDescendantsWithLayout(cell, result) {
    result = result != null ? result : [];

    if (cell != null && this.hasLayout(cell)) {
      let model = this.getGraph().getModel();

      for (let i = 0; i < model.getChildCount(cell); i++) {
        let child = model.getChildAt(cell, i);

        if (this.hasLayout(child)) {
          result.push(child);
          this.addDescendantsWithLayout(child, result);
        }
      }
    }

    return result;
  }

  executeLayoutForCells(cells) {
    let sorted = wangUtils.sortCells(cells, false);
    this.layoutCells(sorted, true);
    this.layoutCells(sorted.reverse(), false);
  }

  layoutCells(cells, bubble) {
    if (cells.length > 0) {
      let model = this.getGraph().getModel();
      model.beginUpdate();

      try {
        let last = null;

        for (let i = 0; i < cells.length; i++) {
          if (cells[i] != model.getRoot() && cells[i] != last) {
            this.executeLayout(cells[i], bubble);
            last = cells[i];
          }
        }

        this.fireEvent(new wangEventObject(wangEvent.LAYOUT_CELLS, 'cells', cells));
      } finally {
        model.endUpdate();
      }
    }
  }

  executeLayout(cell, bubble) {
    let layout = this.getLayout(cell, bubble ? wangEvent.BEGIN_UPDATE : wangEvent.END_UPDATE);

    if (layout != null) {
      layout.execute(cell);
    }
  }

  destroy() {
    this.setGraph(null);
  }
}
