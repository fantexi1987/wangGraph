import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangAnimation extends wangEventSource {
  thread = null;

  constructor(delay) {
    super();
    this.delay = delay != null ? delay : 20;
  }

  isRunning() {
    return this.thread != null;
  }

  startAnimation() {
    if (this.thread == null) {
      this.thread = window.setInterval(wangUtils.bind(this, this.updateAnimation), this.delay);
    }
  }

  updateAnimation() {
    this.fireEvent(new wangEventObject(wangEvent.EXECUTE));
  }

  stopAnimation() {
    if (this.thread != null) {
      window.clearInterval(this.thread);
      this.thread = null;
      this.fireEvent(new wangEventObject(wangEvent.DONE));
    }
  }
}
