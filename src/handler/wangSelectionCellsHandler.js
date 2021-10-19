import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangDictionary } from '@wangGraph/util/wangDictionary';

export class wangSelectionCellsHandler extends wangEventSource {
  enabled = true;
  maxHandlers = 100;

  constructor(graph) {
    super();
    this.graph = graph;
    this.handlers = new wangDictionary();
    this.graph.addMouseListener(this);

    this.refreshHandler = (sender, evt) => {
      if (this.isEnabled()) {
        this.refresh();
      }
    };

    this.graph.getSelectionModel().addListener(wangEvent.CHANGE, this.refreshHandler);
    this.graph.getModel().addListener(wangEvent.CHANGE, this.refreshHandler);
    this.graph.getView().addListener(wangEvent.SCALE, this.refreshHandler);
    this.graph.getView().addListener(wangEvent.TRANSLATE, this.refreshHandler);
    this.graph.getView().addListener(wangEvent.SCALE_AND_TRANSLATE, this.refreshHandler);
    this.graph.getView().addListener(wangEvent.DOWN, this.refreshHandler);
    this.graph.getView().addListener(wangEvent.UP, this.refreshHandler);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = value;
  }

  getHandler(cell) {
    return this.handlers.get(cell);
  }

  isHandled(cell) {
    return this.getHandler(cell) != null;
  }

  reset() {
    this.handlers.visit(function (key, handler) {
      handler.reset.apply(handler);
    });
  }

  getHandledSelectionCells() {
    return this.graph.getSelectionCells();
  }

  refresh() {
    let oldHandlers = this.handlers;
    this.handlers = new wangDictionary();
    let tmp = wangUtils.sortCells(this.getHandledSelectionCells(), false);

    for (let i = 0; i < tmp.length; i++) {
      let state = this.graph.view.getState(tmp[i]);

      if (state != null) {
        let handler = oldHandlers.remove(tmp[i]);

        if (handler != null) {
          if (handler.state != state) {
            handler.destroy();
            handler = null;
          } else if (!this.isHandlerActive(handler)) {
            if (handler.refresh != null) {
              handler.refresh();
            }

            handler.redraw();
          }
        }

        if (handler == null) {
          handler = this.graph.createHandler(state);
          this.fireEvent(new wangEventObject(wangEvent.ADD, 'state', state));
        }

        if (handler != null) {
          this.handlers.put(tmp[i], handler);
        }
      }
    }

    oldHandlers.visit((key, handler) => {
      this.fireEvent(new wangEventObject(wangEvent.REMOVE, 'state', handler.state));
      handler.destroy();
    });
  }

  isHandlerActive(handler) {
    return handler.index != null;
  }

  updateHandler(state) {
    let handler = this.handlers.remove(state.cell);

    if (handler != null) {
      let index = handler.index;
      let x = handler.startX;
      let y = handler.startY;
      handler.destroy();
      handler = this.graph.createHandler(state);

      if (handler != null) {
        this.handlers.put(state.cell, handler);

        if (index != null && x != null && y != null) {
          handler.start(x, y, index);
        }
      }
    }
  }

  mouseDown(sender, me) {
    if (this.graph.isEnabled() && this.isEnabled()) {
      let args = [sender, me];
      this.handlers.visit(function (key, handler) {
        handler.mouseDown.apply(handler, args);
      });
    }
  }

  mouseMove(sender, me) {
    if (this.graph.isEnabled() && this.isEnabled()) {
      let args = [sender, me];
      this.handlers.visit(function (key, handler) {
        handler.mouseMove.apply(handler, args);
      });
    }
  }

  mouseUp(sender, me) {
    if (this.graph.isEnabled() && this.isEnabled()) {
      let args = [sender, me];
      this.handlers.visit(function (key, handler) {
        handler.mouseUp.apply(handler, args);
      });
    }
  }

  destroy() {
    this.graph.removeMouseListener(this);

    if (this.refreshHandler != null) {
      this.graph.getSelectionModel().removeListener(this.refreshHandler);
      this.graph.getModel().removeListener(this.refreshHandler);
      this.graph.getView().removeListener(this.refreshHandler);
      this.refreshHandler = null;
    }
  }
}
