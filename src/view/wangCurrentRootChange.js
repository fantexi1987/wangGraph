import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangCurrentRootChange {
  constructor(view, root) {
    this.view = view;
    this.root = root;
    this.previous = root;
    this.isUp = root == null;

    if (!this.isUp) {
      let tmp = this.view.currentRoot;
      let model = this.view.graph.getModel();

      while (tmp != null) {
        if (tmp == root) {
          this.isUp = true;
          break;
        }

        tmp = model.getParent(tmp);
      }
    }
  }

  execute() {
    let tmp = this.view.currentRoot;
    this.view.currentRoot = this.previous;
    this.previous = tmp;
    let translate = this.view.graph.getTranslateForRoot(this.view.currentRoot);

    if (translate != null) {
      this.view.translate = new wangPoint(-translate.x, -translate.y);
    }

    if (this.isUp) {
      this.view.clear(this.view.currentRoot, true);
      this.view.validate();
    } else {
      this.view.refresh();
    }

    let name = this.isUp ? wangEvent.UP : wangEvent.DOWN;
    this.view.fireEvent(new wangEventObject(name, 'root', this.view.currentRoot, 'previous', this.previous));
    this.isUp = !this.isUp;
  }
}
