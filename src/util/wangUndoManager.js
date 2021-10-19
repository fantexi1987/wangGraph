import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';

export class wangUndoManager extends wangEventSource {
  history = null;
  indexOfNextAdd = 0;

  constructor(size) {
    super();
    this.size = size != null ? size : 100;
    this.clear();
  }

  isEmpty() {
    return this.history.length == 0;
  }

  clear() {
    this.history = [];
    this.indexOfNextAdd = 0;
    this.fireEvent(new wangEventObject(wangEvent.CLEAR));
  }

  canUndo() {
    return this.indexOfNextAdd > 0;
  }

  undo() {
    while (this.indexOfNextAdd > 0) {
      let edit = this.history[--this.indexOfNextAdd];
      edit.undo();

      if (edit.isSignificant()) {
        this.fireEvent(new wangEventObject(wangEvent.UNDO, 'edit', edit));
        break;
      }
    }
  }

  canRedo() {
    return this.indexOfNextAdd < this.history.length;
  }

  redo() {
    let n = this.history.length;

    while (this.indexOfNextAdd < n) {
      let edit = this.history[this.indexOfNextAdd++];
      edit.redo();

      if (edit.isSignificant()) {
        this.fireEvent(new wangEventObject(wangEvent.REDO, 'edit', edit));
        break;
      }
    }
  }

  undoableEditHappened(undoableEdit) {
    this.trim();

    if (this.size > 0 && this.size == this.history.length) {
      this.history.shift();
    }

    this.history.push(undoableEdit);
    this.indexOfNextAdd = this.history.length;
    this.fireEvent(new wangEventObject(wangEvent.ADD, 'edit', undoableEdit));
  }

  trim() {
    if (this.history.length > this.indexOfNextAdd) {
      let edits = this.history.splice(this.indexOfNextAdd, this.history.length - this.indexOfNextAdd);

      for (let i = 0; i < edits.length; i++) {
        edits[i].die();
      }
    }
  }
}
