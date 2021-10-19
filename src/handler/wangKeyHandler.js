import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangKeyHandler {
  graph = null;
  target = null;
  normalKeys = null;
  shiftKeys = null;
  controlKeys = null;
  controlShiftKeys = null;
  enabled = true;

  constructor(graph, target) {
    if (graph != null) {
      this.graph = graph;
      this.target = target || document.documentElement;
      this.normalKeys = [];
      this.shiftKeys = [];
      this.controlKeys = [];
      this.controlShiftKeys = [];

      this.keydownHandler = (evt) => {
        this.keyDown(evt);
      };

      wangEvent.addListener(this.target, 'keydown', this.keydownHandler);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  bindKey(code, funct) {
    this.normalKeys[code] = funct;
  }

  bindShiftKey(code, funct) {
    this.shiftKeys[code] = funct;
  }

  bindControlKey(code, funct) {
    this.controlKeys[code] = funct;
  }

  bindControlShiftKey(code, funct) {
    this.controlShiftKeys[code] = funct;
  }

  isControlDown(evt) {
    return wangEvent.isControlDown(evt);
  }

  getFunction(evt) {
    if (evt != null && !wangEvent.isAltDown(evt)) {
      if (this.isControlDown(evt)) {
        if (wangEvent.isShiftDown(evt)) {
          return this.controlShiftKeys[evt.keyCode];
        } else {
          return this.controlKeys[evt.keyCode];
        }
      } else {
        if (wangEvent.isShiftDown(evt)) {
          return this.shiftKeys[evt.keyCode];
        } else {
          return this.normalKeys[evt.keyCode];
        }
      }
    }

    return null;
  }

  isGraphEvent(evt) {
    let source = wangEvent.getSource(evt);

    if (
      source == this.target ||
      source.parentNode == this.target ||
      (this.graph.cellEditor != null && this.graph.cellEditor.isEventSource(evt))
    ) {
      return true;
    }

    return wangUtils.isAncestorNode(this.graph.container, source);
  }

  keyDown(evt) {
    if (this.isEnabledForEvent(evt)) {
      if (evt.keyCode == 27) {
        this.escape(evt);
      } else if (!this.isEventIgnored(evt)) {
        let boundFunction = this.getFunction(evt);

        if (boundFunction != null) {
          boundFunction(evt);
          wangEvent.consume(evt);
        }
      }
    }
  }

  isEnabledForEvent(evt) {
    return this.graph.isEnabled() && !wangEvent.isConsumed(evt) && this.isGraphEvent(evt) && this.isEnabled();
  }

  isEventIgnored(evt) {
    return this.graph.isEditing();
  }

  escape(evt) {
    if (this.graph.isEscapeEnabled()) {
      this.graph.escape(evt);
    }
  }

  destroy() {
    if (this.target != null && this.keydownHandler != null) {
      wangEvent.removeListener(this.target, 'keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.target = null;
  }
}
