import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangUndoableEdit } from '@wangGraph/util/wangUndoableEdit';
import { wangSelectionChange } from '@wangGraph/view/wangSelectionChange';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangClient } from '@wangGraph/wangClient';

export class wangGraphSelectionModel extends wangEventSource {
  doneResource = wangClient.language != 'none' ? 'done' : '';
  updatingSelectionResource = wangClient.language != 'none' ? 'updatingSelection' : '';
  singleSelection = false;

  constructor(graph) {
    super();
    this.graph = graph;
    this.cells = [];
  }

  isSingleSelection() {
    return this.singleSelection;
  }

  setSingleSelection(singleSelection) {
    this.singleSelection = singleSelection;
  }

  isSelected(cell) {
    if (cell != null) {
      return wangUtils.indexOf(this.cells, cell) >= 0;
    }

    return false;
  }

  isEmpty() {
    return this.cells.length == 0;
  }

  clear() {
    this.changeSelection(null, this.cells);
  }

  setCell(cell) {
    if (cell != null) {
      this.setCells([cell]);
    }
  }

  setCells(cells) {
    if (cells != null) {
      if (this.singleSelection) {
        cells = [this.getFirstSelectableCell(cells)];
      }

      let tmp = [];

      for (let i = 0; i < cells.length; i++) {
        if (this.graph.isCellSelectable(cells[i])) {
          tmp.push(cells[i]);
        }
      }

      this.changeSelection(tmp, this.cells);
    }
  }

  getFirstSelectableCell(cells) {
    if (cells != null) {
      for (let i = 0; i < cells.length; i++) {
        if (this.graph.isCellSelectable(cells[i])) {
          return cells[i];
        }
      }
    }

    return null;
  }

  addCell(cell) {
    if (cell != null) {
      this.addCells([cell]);
    }
  }

  addCells(cells) {
    if (cells != null) {
      let remove = null;

      if (this.singleSelection) {
        remove = this.cells;
        cells = [this.getFirstSelectableCell(cells)];
      }

      let tmp = [];

      for (let i = 0; i < cells.length; i++) {
        if (!this.isSelected(cells[i]) && this.graph.isCellSelectable(cells[i])) {
          tmp.push(cells[i]);
        }
      }

      this.changeSelection(tmp, remove);
    }
  }

  removeCell(cell) {
    if (cell != null) {
      this.removeCells([cell]);
    }
  }

  removeCells(cells) {
    if (cells != null) {
      let tmp = [];

      for (let i = 0; i < cells.length; i++) {
        if (this.isSelected(cells[i])) {
          tmp.push(cells[i]);
        }
      }

      this.changeSelection(null, tmp);
    }
  }

  changeSelection(added, removed) {
    if (
      (added != null && added.length > 0 && added[0] != null) ||
      (removed != null && removed.length > 0 && removed[0] != null)
    ) {
      let change = new wangSelectionChange(this, added, removed);
      change.execute();
      let edit = new wangUndoableEdit(this, false);
      edit.add(change);
      this.fireEvent(new wangEventObject(wangEvent.UNDO, 'edit', edit));
    }
  }

  cellAdded(cell) {
    if (cell != null && !this.isSelected(cell)) {
      this.cells.push(cell);
    }
  }

  cellRemoved(cell) {
    if (cell != null) {
      let index = wangUtils.indexOf(this.cells, cell);

      if (index >= 0) {
        this.cells.splice(index, 1);
      }
    }
  }
}
