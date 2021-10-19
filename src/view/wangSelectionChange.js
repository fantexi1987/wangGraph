import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangLog } from '@wangGraph/util/wangLog';

export class wangSelectionChange {
  constructor(selectionModel, added, removed) {
    this.selectionModel = selectionModel;
    this.added = added != null ? added.slice() : null;
    this.removed = removed != null ? removed.slice() : null;
  }

  execute() {
    let t0 = wangLog.enter('wangSelectionChange.execute');
    window.status =
      wangResources.get(this.selectionModel.updatingSelectionResource) || this.selectionModel.updatingSelectionResource;

    if (this.removed != null) {
      for (let i = 0; i < this.removed.length; i++) {
        this.selectionModel.cellRemoved(this.removed[i]);
      }
    }

    if (this.added != null) {
      for (let i = 0; i < this.added.length; i++) {
        this.selectionModel.cellAdded(this.added[i]);
      }
    }

    let tmp = this.added;
    this.added = this.removed;
    this.removed = tmp;
    window.status = wangResources.get(this.selectionModel.doneResource) || this.selectionModel.doneResource;
    wangLog.leave('wangSelectionChange.execute', t0);
    this.selectionModel.fireEvent(new wangEventObject(wangEvent.CHANGE, 'added', this.added, 'removed', this.removed));
  }
}
