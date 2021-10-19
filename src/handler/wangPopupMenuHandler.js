import { wangPopupMenu } from '@wangGraph/util/wangPopupMenu';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangPopupMenuHandler extends wangPopupMenu {
  graph = null;
  selectOnPopup = true;
  clearSelectionOnBackground = true;
  triggerX = null;
  triggerY = null;
  screenX = null;
  screenY = null;

  constructor(graph, factoryMethod) {
    super();

    if (graph != null) {
      this.graph = graph;
      this.factoryMethod = factoryMethod;
      this.graph.addMouseListener(this);

      this.gestureHandler = (sender, eo) => {
        this.inTolerance = false;
      };

      this.graph.addListener(wangEvent.GESTURE, this.gestureHandler);
      this.init();
    }
  }

  init() {
    super.init();
    wangEvent.addGestureListeners(this.div, (evt) => {
      this.graph.tooltipHandler.hide();
    });
  }

  isSelectOnPopup(me) {
    return this.selectOnPopup;
  }

  mouseDown(sender, me) {
    if (this.isEnabled() && !wangEvent.isMultiTouchEvent(me.getEvent())) {
      this.hideMenu();
      this.triggerX = me.getGraphX();
      this.triggerY = me.getGraphY();
      this.screenX = wangEvent.getMainEvent(me.getEvent()).screenX;
      this.screenY = wangEvent.getMainEvent(me.getEvent()).screenY;
      this.popupTrigger = this.isPopupTrigger(me);
      this.inTolerance = true;
    }
  }

  mouseMove(sender, me) {
    if (this.inTolerance && this.screenX != null && this.screenY != null) {
      if (
        Math.abs(wangEvent.getMainEvent(me.getEvent()).screenX - this.screenX) > this.graph.tolerance ||
        Math.abs(wangEvent.getMainEvent(me.getEvent()).screenY - this.screenY) > this.graph.tolerance
      ) {
        this.inTolerance = false;
      }
    }
  }

  mouseUp(sender, me) {
    if (this.popupTrigger && this.inTolerance && this.triggerX != null && this.triggerY != null) {
      let cell = this.getCellForPopupEvent(me);

      if (this.graph.isEnabled() && this.isSelectOnPopup(me) && cell != null && !this.graph.isCellSelected(cell)) {
        this.graph.setSelectionCell(cell);
      } else if (this.clearSelectionOnBackground && cell == null) {
        this.graph.clearSelection();
      }

      this.graph.tooltipHandler.hide();
      let origin = wangUtils.getScrollOrigin();
      this.popup(me.getX() + origin.x + 1, me.getY() + origin.y + 1, cell, me.getEvent());
      me.consume();
    }

    this.popupTrigger = false;
    this.inTolerance = false;
  }

  getCellForPopupEvent(me) {
    return me.getCell();
  }

  destroy() {
    this.graph.removeMouseListener(this);
    this.graph.removeListener(this.gestureHandler);
    super.destroy();
  }
}
