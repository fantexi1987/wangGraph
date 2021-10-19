import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangClient } from '@wangGraph/wangClient';
import { wangMouseEvent } from '@wangGraph/util/wangMouseEvent';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangRubberband {
  defaultOpacity = 20;
  enabled = true;
  div = null;
  sharedDiv = null;
  currentX = 0;
  currentY = 0;
  fadeOut = false;

  constructor(graph) {
    if (graph != null) {
      this.graph = graph;
      this.graph.addMouseListener(this);

      this.forceRubberbandHandler = (sender, evt) => {
        let evtName = evt.getProperty('eventName');
        let me = evt.getProperty('event');

        if (evtName == wangEvent.MOUSE_DOWN && this.isForceRubberbandEvent(me)) {
          let offset = wangUtils.getOffset(this.graph.container);
          let origin = wangUtils.getScrollOrigin(this.graph.container);
          origin.x -= offset.x;
          origin.y -= offset.y;
          this.start(me.getX() + origin.x, me.getY() + origin.y);
          me.consume(false);
        }
      };

      this.graph.addListener(wangEvent.FIRE_MOUSE_EVENT, this.forceRubberbandHandler);

      this.panHandler = () => {
        this.repaint();
      };

      this.graph.addListener(wangEvent.PAN, this.panHandler);

      this.gestureHandler = (sender, eo) => {
        if (this.first != null) {
          this.reset();
        }
      };

      this.graph.addListener(wangEvent.GESTURE, this.gestureHandler);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  isForceRubberbandEvent(me) {
    return wangEvent.isAltDown(me.getEvent());
  }

  mouseDown(sender, me) {
    if (
      !me.isConsumed() &&
      this.isEnabled() &&
      this.graph.isEnabled() &&
      me.getState() == null &&
      !wangEvent.isMultiTouchEvent(me.getEvent())
    ) {
      let offset = wangUtils.getOffset(this.graph.container);
      let origin = wangUtils.getScrollOrigin(this.graph.container);
      origin.x -= offset.x;
      origin.y -= offset.y;
      this.start(me.getX() + origin.x, me.getY() + origin.y);
      me.consume(false);
    }
  }

  start(x, y) {
    this.first = new wangPoint(x, y);
    let container = this.graph.container;

    function createMouseEvent(evt) {
      let me = new wangMouseEvent(evt);
      let pt = wangUtils.convertPoint(container, me.getX(), me.getY());
      me.graphX = pt.x;
      me.graphY = pt.y;
      return me;
    }

    this.dragHandler = (evt) => {
      this.mouseMove(this.graph, createMouseEvent(evt));
    };

    this.dropHandler = (evt) => {
      this.mouseUp(this.graph, createMouseEvent(evt));
    };

    if (wangClient.IS_FF) {
      wangEvent.addGestureListeners(document, null, this.dragHandler, this.dropHandler);
    }
  }

  mouseMove(sender, me) {
    if (!me.isConsumed() && this.first != null) {
      let origin = wangUtils.getScrollOrigin(this.graph.container);
      let offset = wangUtils.getOffset(this.graph.container);
      origin.x -= offset.x;
      origin.y -= offset.y;
      let x = me.getX() + origin.x;
      let y = me.getY() + origin.y;
      let dx = this.first.x - x;
      let dy = this.first.y - y;
      let tol = this.graph.tolerance;

      if (this.div != null || Math.abs(dx) > tol || Math.abs(dy) > tol) {
        if (this.div == null) {
          this.div = this.createShape();
        }

        wangUtils.clearSelection();
        this.update(x, y);
        me.consume();
      }
    }
  }

  createShape() {
    if (this.sharedDiv == null) {
      this.sharedDiv = document.createElement('div');
      this.sharedDiv.className = 'wangRubberband';
      wangUtils.setOpacity(this.sharedDiv, this.defaultOpacity);
    }

    this.graph.container.appendChild(this.sharedDiv);
    let result = this.sharedDiv;

    if (wangClient.IS_SVG && document.documentMode >= 10 && this.fadeOut) {
      this.sharedDiv = null;
    }

    return result;
  }

  isActive(sender, me) {
    return this.div != null && this.div.style.display != 'none';
  }

  mouseUp(sender, me) {
    let active = this.isActive();
    this.reset();

    if (active) {
      this.execute(me.getEvent());
      me.consume();
    }
  }

  execute(evt) {
    let rect = new wangRectangle(this.x, this.y, this.width, this.height);
    this.graph.selectRegion(rect, evt);
  }

  reset() {
    if (this.div != null) {
      if (wangClient.IS_SVG && document.documentMode >= 10 && this.fadeOut) {
        let temp = this.div;
        wangUtils.setPrefixedStyle(temp.style, 'transition', 'all 0.2s linear');
        temp.style.pointerEvents = 'none';
        temp.style.opacity = 0;
        window.setTimeout(function () {
          temp.parentNode.removeChild(temp);
        }, 200);
      } else {
        this.div.parentNode.removeChild(this.div);
      }
    }

    wangEvent.removeGestureListeners(document, null, this.dragHandler, this.dropHandler);
    this.dragHandler = null;
    this.dropHandler = null;
    this.currentX = 0;
    this.currentY = 0;
    this.first = null;
    this.div = null;
  }

  update(x, y) {
    this.currentX = x;
    this.currentY = y;
    this.repaint();
  }

  repaint() {
    if (this.div != null) {
      let x = this.currentX - this.graph.panDx;
      let y = this.currentY - this.graph.panDy;
      this.x = Math.min(this.first.x, x);
      this.y = Math.min(this.first.y, y);
      this.width = Math.max(this.first.x, x) - this.x;
      this.height = Math.max(this.first.y, y) - this.y;
      let dx = 0;
      let dy = 0;
      this.div.style.left = this.x + dx + 'px';
      this.div.style.top = this.y + dy + 'px';
      this.div.style.width = Math.max(1, this.width) + 'px';
      this.div.style.height = Math.max(1, this.height) + 'px';
    }
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      this.graph.removeMouseListener(this);
      this.graph.removeListener(this.forceRubberbandHandler);
      this.graph.removeListener(this.panHandler);
      this.reset();

      if (this.sharedDiv != null) {
        this.sharedDiv = null;
      }
    }
  }
}
