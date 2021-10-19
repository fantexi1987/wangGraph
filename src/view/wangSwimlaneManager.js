import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';

export class wangSwimlaneManager extends wangEventSource {
  graph = null;
  enabled = true;

  constructor(graph, horizontal, addEnabled, resizeEnabled) {
    super();
    this.horizontal = horizontal != null ? horizontal : true;
    this.addEnabled = addEnabled != null ? addEnabled : true;
    this.resizeEnabled = resizeEnabled != null ? resizeEnabled : true;

    this.addHandler = (sender, evt) => {
      if (this.isEnabled() && this.isAddEnabled()) {
        this.cellsAdded(evt.getProperty('cells'));
      }
    };

    this.resizeHandler = (sender, evt) => {
      if (this.isEnabled() && this.isResizeEnabled()) {
        this.cellsResized(evt.getProperty('cells'));
      }
    };

    this.setGraph(graph);
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = value;
  }

  isHorizontal() {
    return this.horizontal;
  }

  setHorizontal(value) {
    this.horizontal = value;
  }

  isAddEnabled() {
    return this.addEnabled;
  }

  setAddEnabled(value) {
    this.addEnabled = value;
  }

  isResizeEnabled() {
    return this.resizeEnabled;
  }

  setResizeEnabled(value) {
    this.resizeEnabled = value;
  }

  getGraph() {
    return this.graph;
  }

  setGraph(graph) {
    if (this.graph != null) {
      this.graph.removeListener(this.addHandler);
      this.graph.removeListener(this.resizeHandler);
    }

    this.graph = graph;

    if (this.graph != null) {
      this.graph.addListener(wangEvent.ADD_CELLS, this.addHandler);
      this.graph.addListener(wangEvent.CELLS_RESIZED, this.resizeHandler);
    }
  }

  isSwimlaneIgnored(swimlane) {
    return !this.getGraph().isSwimlane(swimlane);
  }

  isCellHorizontal(cell) {
    if (this.graph.isSwimlane(cell)) {
      let style = this.graph.getCellStyle(cell);
      return wangUtils.getValue(style, wangConstants.STYLE_HORIZONTAL, 1) == 1;
    }

    return !this.isHorizontal();
  }

  cellsAdded(cells) {
    if (cells != null) {
      let model = this.getGraph().getModel();
      model.beginUpdate();

      try {
        for (let i = 0; i < cells.length; i++) {
          if (!this.isSwimlaneIgnored(cells[i])) {
            this.swimlaneAdded(cells[i]);
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }

  swimlaneAdded(swimlane) {
    let model = this.getGraph().getModel();
    let parent = model.getParent(swimlane);
    let childCount = model.getChildCount(parent);
    let geo = null;

    for (let i = 0; i < childCount; i++) {
      let child = model.getChildAt(parent, i);

      if (child != swimlane && !this.isSwimlaneIgnored(child)) {
        geo = model.getGeometry(child);

        if (geo != null) {
          break;
        }
      }
    }

    if (geo != null) {
      let parentHorizontal = parent != null ? this.isCellHorizontal(parent) : this.horizontal;
      this.resizeSwimlane(swimlane, geo.width, geo.height, parentHorizontal);
    }
  }

  cellsResized(cells) {
    if (cells != null) {
      let model = this.getGraph().getModel();
      model.beginUpdate();

      try {
        for (let i = 0; i < cells.length; i++) {
          if (!this.isSwimlaneIgnored(cells[i])) {
            let geo = model.getGeometry(cells[i]);

            if (geo != null) {
              let size = new wangRectangle(0, 0, geo.width, geo.height);
              let top = cells[i];
              let current = top;

              while (current != null) {
                top = current;
                current = model.getParent(current);
                let tmp = this.graph.isSwimlane(current) ? this.graph.getStartSize(current) : new wangRectangle();
                size.width += tmp.width;
                size.height += tmp.height;
              }

              let parentHorizontal = current != null ? this.isCellHorizontal(current) : this.horizontal;
              this.resizeSwimlane(top, size.width, size.height, parentHorizontal);
            }
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }

  resizeSwimlane(swimlane, w, h, parentHorizontal) {
    let model = this.getGraph().getModel();
    model.beginUpdate();

    try {
      let horizontal = this.isCellHorizontal(swimlane);

      if (!this.isSwimlaneIgnored(swimlane)) {
        let geo = model.getGeometry(swimlane);

        if (geo != null) {
          if ((parentHorizontal && geo.height != h) || (!parentHorizontal && geo.width != w)) {
            geo = geo.clone();

            if (parentHorizontal) {
              geo.height = h;
            } else {
              geo.width = w;
            }

            model.setGeometry(swimlane, geo);
          }
        }
      }

      let tmp = this.graph.isSwimlane(swimlane) ? this.graph.getStartSize(swimlane) : new wangRectangle();
      w -= tmp.width;
      h -= tmp.height;
      let childCount = model.getChildCount(swimlane);

      for (let i = 0; i < childCount; i++) {
        let child = model.getChildAt(swimlane, i);
        this.resizeSwimlane(child, w, h, horizontal);
      }
    } finally {
      model.endUpdate();
    }
  }

  destroy() {
    this.setGraph(null);
  }
}
