import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';

export class wangUndoableEdit {
  undone = false;
  redone = false;

  constructor(source, significant) {
    this.source = source;
    this.changes = [];
    this.significant = significant != null ? significant : true;
  }

  isEmpty() {
    return this.changes.length == 0;
  }

  isSignificant() {
    return this.significant;
  }

  add(change) {
    this.changes.push(change);
  }

  notify() {}

  die() {}

  undo() {
    if (!this.undone) {
      this.source.fireEvent(new wangEventObject(wangEvent.START_EDIT));
      let count = this.changes.length;

      for (let i = count - 1; i >= 0; i--) {
        let change = this.changes[i];

        if (change.execute != null) {
          change.execute();
        } else if (change.undo != null) {
          change.undo();
        }

        this.source.fireEvent(new wangEventObject(wangEvent.EXECUTED, 'change', change));
      }

      this.undone = true;
      this.redone = false;
      this.source.fireEvent(new wangEventObject(wangEvent.END_EDIT));
    }

    this.notify();
  }

  redo() {
    if (!this.redone) {
      this.source.fireEvent(new wangEventObject(wangEvent.START_EDIT));
      let count = this.changes.length;

      for (let i = 0; i < count; i++) {
        let change = this.changes[i];

        if (change.execute != null) {
          change.execute();
        } else if (change.redo != null) {
          change.redo();
        }

        this.source.fireEvent(new wangEventObject(wangEvent.EXECUTED, 'change', change));
      }

      this.undone = false;
      this.redone = true;
      this.source.fireEvent(new wangEventObject(wangEvent.END_EDIT));
    }

    this.notify();
  }
}
