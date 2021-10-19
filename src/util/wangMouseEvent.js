import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangMouseEvent {
  consumed = false;
  graphX = null;
  graphY = null;

  constructor(evt, state) {
    this.evt = evt;
    this.state = state;
    this.sourceState = state;
  }

  getEvent() {
    return this.evt;
  }

  getSource() {
    return wangEvent.getSource(this.evt);
  }

  isSource(shape) {
    if (shape != null) {
      return wangUtils.isAncestorNode(shape.node, this.getSource());
    }

    return false;
  }

  getX() {
    return wangEvent.getClientX(this.getEvent());
  }

  getY() {
    return wangEvent.getClientY(this.getEvent());
  }

  getGraphX() {
    return this.graphX;
  }

  getGraphY() {
    return this.graphY;
  }

  getState() {
    return this.state;
  }

  getCell() {
    let state = this.getState();

    if (state != null) {
      return state.cell;
    }

    return null;
  }

  isPopupTrigger() {
    return wangEvent.isPopupTrigger(this.getEvent());
  }

  isConsumed() {
    return this.consumed;
  }

  consume(preventDefault) {
    preventDefault =
      preventDefault != null ? preventDefault : this.evt.touches != null || wangEvent.isMouseEvent(this.evt);

    if (preventDefault && this.evt.preventDefault) {
      this.evt.preventDefault();
    }

    this.consumed = true;
  }
}
