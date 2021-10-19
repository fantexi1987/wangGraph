import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangCellHighlight } from '@wangGraph/handler/wangCellHighlight';
import { wangGuide } from '@wangGraph/util/wangGuide';
import { wangClient } from '@wangGraph/wangClient';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangDragSource {
  dragOffset = null;
  dragElement = null;
  previewElement = null;
  enabled = true;
  currentGraph = null;
  currentDropTarget = null;
  currentPoint = null;
  currentGuide = null;
  currentHighlight = null;
  autoscroll = true;
  guidesEnabled = true;
  gridEnabled = true;
  highlightDropTargets = true;
  dragElementZIndex = 100;
  dragElementOpacity = 70;
  checkEventSource = true;

  constructor(element, dropHandler) {
    this.element = element;
    this.dropHandler = dropHandler;
    wangEvent.addGestureListeners(element, (evt) => {
      this.mouseDown(evt);
    });
    wangEvent.addListener(element, 'dragstart', function (evt) {
      wangEvent.consume(evt);
    });

    this.eventConsumer = function (sender, evt) {
      let evtName = evt.getProperty('eventName');
      let me = evt.getProperty('event');

      if (evtName != wangEvent.MOUSE_DOWN) {
        me.consume();
      }
    };
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = value;
  }

  isGuidesEnabled() {
    return this.guidesEnabled;
  }

  setGuidesEnabled(value) {
    this.guidesEnabled = value;
  }

  isGridEnabled() {
    return this.gridEnabled;
  }

  setGridEnabled(value) {
    this.gridEnabled = value;
  }

  getGraphForEvent(evt) {
    return null;
  }

  getDropTarget(graph, x, y, evt) {
    return graph.getCellAt(x, y);
  }

  createDragElement(evt) {
    return this.element.cloneNode(true);
  }

  createPreviewElement(graph) {
    return null;
  }

  isActive() {
    return this.mouseMoveHandler != null;
  }

  reset() {
    if (this.currentGraph != null) {
      this.dragExit(this.currentGraph);
      this.currentGraph = null;
    }

    this.removeDragElement();
    this.removeListeners();
    this.stopDrag();
  }

  mouseDown(evt) {
    if (this.enabled && !wangEvent.isConsumed(evt) && this.mouseMoveHandler == null) {
      this.startDrag(evt);
      this.mouseMoveHandler = wangUtils.bind(this, this.mouseMove);
      this.mouseUpHandler = wangUtils.bind(this, this.mouseUp);
      wangEvent.addGestureListeners(document, null, this.mouseMoveHandler, this.mouseUpHandler);

      if (wangClient.IS_TOUCH && !wangEvent.isMouseEvent(evt)) {
        this.eventSource = wangEvent.getSource(evt);
        wangEvent.addGestureListeners(this.eventSource, null, this.mouseMoveHandler, this.mouseUpHandler);
      }
    }
  }

  startDrag(evt) {
    this.dragElement = this.createDragElement(evt);
    this.dragElement.style.position = 'absolute';
    this.dragElement.style.zIndex = this.dragElementZIndex;
    wangUtils.setOpacity(this.dragElement, this.dragElementOpacity);

    if (this.checkEventSource && wangClient.IS_SVG) {
      this.dragElement.style.pointerEvents = 'none';
    }
  }

  stopDrag() {
    this.removeDragElement();
  }

  removeDragElement() {
    if (this.dragElement != null) {
      if (this.dragElement.parentNode != null) {
        this.dragElement.parentNode.removeChild(this.dragElement);
      }

      this.dragElement = null;
    }
  }

  getElementForEvent(evt) {
    return wangEvent.isTouchEvent(evt) || wangEvent.isPenEvent(evt)
      ? document.elementFromPoint(wangEvent.getClientX(evt), wangEvent.getClientY(evt))
      : wangEvent.getSource(evt);
  }

  graphContainsEvent(graph, evt) {
    let x = wangEvent.getClientX(evt);
    let y = wangEvent.getClientY(evt);
    let offset = wangUtils.getOffset(graph.container);
    let origin = wangUtils.getScrollOrigin();
    let elt = this.getElementForEvent(evt);

    if (this.checkEventSource) {
      while (elt != null && elt != graph.container) {
        elt = elt.parentNode;
      }
    }

    return (
      elt != null &&
      x >= offset.x - origin.x &&
      y >= offset.y - origin.y &&
      x <= offset.x - origin.x + graph.container.offsetWidth &&
      y <= offset.y - origin.y + graph.container.offsetHeight
    );
  }

  mouseMove(evt) {
    let graph = this.getGraphForEvent(evt);

    if (graph != null && !this.graphContainsEvent(graph, evt)) {
      graph = null;
    }

    if (graph != this.currentGraph) {
      if (this.currentGraph != null) {
        this.dragExit(this.currentGraph, evt);
      }

      this.currentGraph = graph;

      if (this.currentGraph != null) {
        this.dragEnter(this.currentGraph, evt);
      }
    }

    if (this.currentGraph != null) {
      this.dragOver(this.currentGraph, evt);
    }

    if (
      this.dragElement != null &&
      (this.previewElement == null || this.previewElement.style.visibility != 'visible')
    ) {
      let x = wangEvent.getClientX(evt);
      let y = wangEvent.getClientY(evt);

      if (this.dragElement.parentNode == null) {
        document.body.appendChild(this.dragElement);
      }

      this.dragElement.style.visibility = 'visible';

      if (this.dragOffset != null) {
        x += this.dragOffset.x;
        y += this.dragOffset.y;
      }

      let offset = wangUtils.getDocumentScrollOrigin(document);
      this.dragElement.style.left = x + offset.x + 'px';
      this.dragElement.style.top = y + offset.y + 'px';
    } else if (this.dragElement != null) {
      this.dragElement.style.visibility = 'hidden';
    }

    wangEvent.consume(evt);
  }

  mouseUp(evt) {
    if (this.currentGraph != null) {
      if (
        this.currentPoint != null &&
        (this.previewElement == null || this.previewElement.style.visibility != 'hidden')
      ) {
        let scale = this.currentGraph.view.scale;
        let tr = this.currentGraph.view.translate;
        let x = this.currentPoint.x / scale - tr.x;
        let y = this.currentPoint.y / scale - tr.y;
        this.drop(this.currentGraph, evt, this.currentDropTarget, x, y);
      }

      this.dragExit(this.currentGraph);
      this.currentGraph = null;
    }

    this.stopDrag();
    this.removeListeners();
    wangEvent.consume(evt);
  }

  removeListeners() {
    if (this.eventSource != null) {
      wangEvent.removeGestureListeners(this.eventSource, null, this.mouseMoveHandler, this.mouseUpHandler);
      this.eventSource = null;
    }

    wangEvent.removeGestureListeners(document, null, this.mouseMoveHandler, this.mouseUpHandler);
    this.mouseMoveHandler = null;
    this.mouseUpHandler = null;
  }

  dragEnter(graph, evt) {
    graph.isMouseDown = true;
    graph.isMouseTrigger = wangEvent.isMouseEvent(evt);
    this.previewElement = this.createPreviewElement(graph);

    if (this.previewElement != null && this.checkEventSource && wangClient.IS_SVG) {
      this.previewElement.style.pointerEvents = 'none';
    }

    if (this.isGuidesEnabled() && this.previewElement != null) {
      this.currentGuide = new wangGuide(graph, graph.graphHandler.getGuideStates());
    }

    if (this.highlightDropTargets) {
      this.currentHighlight = new wangCellHighlight(graph, wangConstants.DROP_TARGET_COLOR);
    }

    graph.addListener(wangEvent.FIRE_MOUSE_EVENT, this.eventConsumer);
  }

  dragExit(graph, evt) {
    this.currentDropTarget = null;
    this.currentPoint = null;
    graph.isMouseDown = false;
    graph.removeListener(this.eventConsumer);

    if (this.previewElement != null) {
      if (this.previewElement.parentNode != null) {
        this.previewElement.parentNode.removeChild(this.previewElement);
      }

      this.previewElement = null;
    }

    if (this.currentGuide != null) {
      this.currentGuide.destroy();
      this.currentGuide = null;
    }

    if (this.currentHighlight != null) {
      this.currentHighlight.destroy();
      this.currentHighlight = null;
    }
  }

  dragOver(graph, evt) {
    let offset = wangUtils.getOffset(graph.container);
    let origin = wangUtils.getScrollOrigin(graph.container);
    let x = wangEvent.getClientX(evt) - offset.x + origin.x - graph.panDx;
    let y = wangEvent.getClientY(evt) - offset.y + origin.y - graph.panDy;

    if (graph.autoScroll && (this.autoscroll == null || this.autoscroll)) {
      graph.scrollPointToVisible(x, y, graph.autoExtend);
    }

    if (this.currentHighlight != null && graph.isDropEnabled()) {
      this.currentDropTarget = this.getDropTarget(graph, x, y, evt);
      let state = graph.getView().getState(this.currentDropTarget);
      this.currentHighlight.highlight(state);
    }

    if (this.previewElement != null) {
      if (this.previewElement.parentNode == null) {
        graph.container.appendChild(this.previewElement);
        this.previewElement.style.zIndex = '3';
        this.previewElement.style.position = 'absolute';
      }

      let gridEnabled = this.isGridEnabled() && graph.isGridEnabledEvent(evt);
      let hideGuide = true;

      if (this.currentGuide != null && this.currentGuide.isEnabledForEvent(evt)) {
        let w = parseInt(this.previewElement.style.width);
        let h = parseInt(this.previewElement.style.height);
        let bounds = new wangRectangle(0, 0, w, h);
        let delta = new wangPoint(x, y);
        delta = this.currentGuide.move(bounds, delta, gridEnabled, true);
        hideGuide = false;
        x = delta.x;
        y = delta.y;
      } else if (gridEnabled) {
        let scale = graph.view.scale;
        let tr = graph.view.translate;
        let off = graph.gridSize / 2;
        x = (graph.snap(x / scale - tr.x - off) + tr.x) * scale;
        y = (graph.snap(y / scale - tr.y - off) + tr.y) * scale;
      }

      if (this.currentGuide != null && hideGuide) {
        this.currentGuide.hide();
      }

      if (this.previewOffset != null) {
        x += this.previewOffset.x;
        y += this.previewOffset.y;
      }

      this.previewElement.style.left = Math.round(x) + 'px';
      this.previewElement.style.top = Math.round(y) + 'px';
      this.previewElement.style.visibility = 'visible';
    }

    this.currentPoint = new wangPoint(x, y);
  }

  drop(graph, evt, dropTarget, x, y) {
    this.dropHandler.apply(this, arguments);

    if (graph.container.style.visibility != 'hidden') {
      graph.container.focus();
    }
  }
}
