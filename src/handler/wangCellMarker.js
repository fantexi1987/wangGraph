import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangCellHighlight } from '@wangGraph/handler/wangCellHighlight';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangCellMarker extends wangEventSource {
  graph = null;
  enabled = true;
  hotspot = wangConstants.DEFAULT_HOTSPOT;
  hotspotEnabled = false;
  validColor = null;
  invalidColor = null;
  currentColor = null;
  validState = null;
  markedState = null;

  constructor(graph, validColor, invalidColor, hotspot) {
    super();

    if (graph != null) {
      this.graph = graph;
      this.validColor = validColor != null ? validColor : wangConstants.DEFAULT_VALID_COLOR;
      this.invalidColor = invalidColor != null ? invalidColor : wangConstants.DEFAULT_INVALID_COLOR;
      this.hotspot = hotspot != null ? hotspot : wangConstants.DEFAULT_HOTSPOT;
      this.highlight = new wangCellHighlight(graph);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setHotspot(hotspot) {
    this.hotspot = hotspot;
  }

  getHotspot() {
    return this.hotspot;
  }

  setHotspotEnabled(enabled) {
    this.hotspotEnabled = enabled;
  }

  isHotspotEnabled() {
    return this.hotspotEnabled;
  }

  hasValidState() {
    return this.validState != null;
  }

  getValidState() {
    return this.validState;
  }

  getMarkedState() {
    return this.markedState;
  }

  reset() {
    this.validState = null;

    if (this.markedState != null) {
      this.markedState = null;
      this.unmark();
    }
  }

  process(me) {
    let state = null;

    if (this.isEnabled()) {
      state = this.getState(me);
      this.setCurrentState(state, me);
    }

    return state;
  }

  setCurrentState(state, me, color) {
    let isValid = state != null ? this.isValidState(state) : false;
    color = color != null ? color : this.getMarkerColor(me.getEvent(), state, isValid);

    if (isValid) {
      this.validState = state;
    } else {
      this.validState = null;
    }

    if (state != this.markedState || color != this.currentColor) {
      this.currentColor = color;

      if (state != null && this.currentColor != null) {
        this.markedState = state;
        this.mark();
      } else if (this.markedState != null) {
        this.markedState = null;
        this.unmark();
      }
    }
  }

  markCell(cell, color) {
    let state = this.graph.getView().getState(cell);

    if (state != null) {
      this.currentColor = color != null ? color : this.validColor;
      this.markedState = state;
      this.mark();
    }
  }

  mark() {
    this.highlight.setHighlightColor(this.currentColor);
    this.highlight.highlight(this.markedState);
    this.fireEvent(new wangEventObject(wangEvent.MARK, 'state', this.markedState));
  }

  unmark() {
    this.mark();
  }

  isValidState(state) {
    return true;
  }

  getMarkerColor(evt, state, isValid) {
    return isValid ? this.validColor : this.invalidColor;
  }

  getState(me) {
    let view = this.graph.getView();
    let cell = this.getCell(me);
    let state = this.getStateToMark(view.getState(cell));
    return state != null && this.intersects(state, me) ? state : null;
  }

  getCell(me) {
    return me.getCell();
  }

  getStateToMark(state) {
    return state;
  }

  intersects(state, me) {
    if (this.hotspotEnabled) {
      return wangUtils.intersectsHotspot(
        state,
        me.getGraphX(),
        me.getGraphY(),
        this.hotspot,
        wangConstants.MIN_HOTSPOT_SIZE,
        wangConstants.MAX_HOTSPOT_SIZE
      );
    }

    return true;
  }

  destroy() {
    this.graph.getView().removeListener(this.resetHandler);
    this.graph.getModel().removeListener(this.resetHandler);
    this.highlight.destroy();
  }
}
