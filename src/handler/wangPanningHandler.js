import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangPanningHandler extends wangEventSource {
  graph = null;
  useLeftButtonForPanning = false;
  usePopupTrigger = true;
  ignoreCell = false;
  previewEnabled = true;
  useGrid = false;
  panningEnabled = true;
  pinchEnabled = true;
  maxScale = 8;
  minScale = 0.01;
  dx = null;
  dy = null;
  startX = 0;
  startY = 0;

  constructor(graph) {
    super();

    if (graph != null) {
      this.graph = graph;
      this.graph.addMouseListener(this);

      this.forcePanningHandler = (sender, evt) => {
        let evtName = evt.getProperty('eventName');
        let me = evt.getProperty('event');

        if (evtName == wangEvent.MOUSE_DOWN && this.isForcePanningEvent(me)) {
          this.start(me);
          this.active = true;
          this.fireEvent(new wangEventObject(wangEvent.PAN_START, 'event', me));
          me.consume();
        }
      };

      this.graph.addListener(wangEvent.FIRE_MOUSE_EVENT, this.forcePanningHandler);

      this.gestureHandler = (sender, eo) => {
        if (this.isPinchEnabled()) {
          let evt = eo.getProperty('event');

          if (!wangEvent.isConsumed(evt) && evt.type == 'gesturestart') {
            this.initialScale = this.graph.view.scale;

            if (!this.active && this.mouseDownEvent != null) {
              this.start(this.mouseDownEvent);
              this.mouseDownEvent = null;
            }
          } else if (evt.type == 'gestureend' && this.initialScale != null) {
            this.initialScale = null;
          }

          if (this.initialScale != null) {
            this.zoomGraph(evt);
          }
        }
      };

      this.graph.addListener(wangEvent.GESTURE, this.gestureHandler);

      this.mouseUpListener = () => {
        if (this.active) {
          this.reset();
        }
      };

      wangEvent.addListener(document, 'mouseup', this.mouseUpListener);
    }
  }

  isActive() {
    return this.active || this.initialScale != null;
  }

  isPanningEnabled() {
    return this.panningEnabled;
  }

  setPanningEnabled(value) {
    this.panningEnabled = value;
  }

  isPinchEnabled() {
    return this.pinchEnabled;
  }

  setPinchEnabled(value) {
    this.pinchEnabled = value;
  }

  isPanningTrigger(me) {
    let evt = me.getEvent();
    return (
      (this.useLeftButtonForPanning && me.getState() == null && wangEvent.isLeftMouseButton(evt)) ||
      (wangEvent.isControlDown(evt) && wangEvent.isShiftDown(evt)) ||
      (this.usePopupTrigger && wangEvent.isPopupTrigger(evt))
    );
  }

  isForcePanningEvent(me) {
    return this.ignoreCell || wangEvent.isMultiTouchEvent(me.getEvent());
  }

  mouseDown(sender, me) {
    this.mouseDownEvent = me;

    if (!me.isConsumed() && this.isPanningEnabled() && !this.active && this.isPanningTrigger(me)) {
      this.start(me);
      this.consumePanningTrigger(me);
    }
  }

  start(me) {
    this.dx0 = -this.graph.container.scrollLeft;
    this.dy0 = -this.graph.container.scrollTop;
    this.startX = me.getX();
    this.startY = me.getY();
    this.dx = null;
    this.dy = null;
    this.panningTrigger = true;
  }

  consumePanningTrigger(me) {
    me.consume();
  }

  mouseMove(sender, me) {
    this.dx = me.getX() - this.startX;
    this.dy = me.getY() - this.startY;

    if (this.active) {
      if (this.previewEnabled) {
        if (this.useGrid) {
          this.dx = this.graph.snap(this.dx);
          this.dy = this.graph.snap(this.dy);
        }

        this.graph.panGraph(this.dx + this.dx0, this.dy + this.dy0);
      }

      this.fireEvent(new wangEventObject(wangEvent.PAN, 'event', me));
    } else if (this.panningTrigger) {
      let tmp = this.active;
      this.active = Math.abs(this.dx) > this.graph.tolerance || Math.abs(this.dy) > this.graph.tolerance;

      if (!tmp && this.active) {
        this.fireEvent(new wangEventObject(wangEvent.PAN_START, 'event', me));
      }
    }

    if (this.active || this.panningTrigger) {
      me.consume();
    }
  }

  mouseUp(sender, me) {
    if (this.active) {
      if (this.dx != null && this.dy != null) {
        if (!this.graph.useScrollbarsForPanning || !wangUtils.hasScrollbars(this.graph.container)) {
          let scale = this.graph.getView().scale;
          let t = this.graph.getView().translate;
          this.graph.panGraph(0, 0);
          this.panGraph(t.x + this.dx / scale, t.y + this.dy / scale);
        }

        me.consume();
      }

      this.fireEvent(new wangEventObject(wangEvent.PAN_END, 'event', me));
    }

    this.reset();
  }

  zoomGraph(evt) {
    let value = Math.round(this.initialScale * evt.scale * 100) / 100;

    if (this.minScale != null) {
      value = Math.max(this.minScale, value);
    }

    if (this.maxScale != null) {
      value = Math.min(this.maxScale, value);
    }

    if (this.graph.view.scale != value) {
      this.graph.zoomTo(value);
      wangEvent.consume(evt);
    }
  }

  reset() {
    this.panningTrigger = false;
    this.mouseDownEvent = null;
    this.active = false;
    this.dx = null;
    this.dy = null;
  }

  panGraph(dx, dy) {
    this.graph.getView().setTranslate(dx, dy);
  }

  destroy() {
    this.graph.removeMouseListener(this);
    this.graph.removeListener(this.forcePanningHandler);
    this.graph.removeListener(this.gestureHandler);
    wangEvent.removeListener(document, 'mouseup', this.mouseUpListener);
  }
}
