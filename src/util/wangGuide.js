import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangPolyline } from '@wangGraph/shape/wangPolyline';

export class wangGuide {
  states = null;
  horizontal = true;
  vertical = true;
  guideX = null;
  guideY = null;
  rounded = false;
  tolerance = 2;

  constructor(graph, states) {
    this.graph = graph;
    this.setStates(states);
  }

  setStates(states) {
    this.states = states;
  }

  isEnabledForEvent(evt) {
    return true;
  }

  getGuideTolerance(gridEnabled) {
    return gridEnabled && this.graph.gridEnabled ? this.graph.gridSize / 2 : this.tolerance;
  }

  createGuideShape(horizontal) {
    let guide = new wangPolyline([], wangConstants.GUIDE_COLOR, wangConstants.GUIDE_STROKEWIDTH);
    guide.isDashed = true;
    return guide;
  }

  isStateIgnored(state) {
    return false;
  }

  move(bounds, delta, gridEnabled, clone) {
    if (this.states != null && (this.horizontal || this.vertical) && bounds != null && delta != null) {
      let scale = this.graph.getView().scale;
      let tt = this.getGuideTolerance(gridEnabled) * scale;
      let b = bounds.clone();
      b.x += delta.x;
      b.y += delta.y;
      let overrideX = false;
      let stateX = null;
      let valueX = null;
      let overrideY = false;
      let stateY = null;
      let valueY = null;
      let ttX = tt;
      let ttY = tt;
      let left = b.x;
      let right = b.x + b.width;
      let center = b.getCenterX();
      let top = b.y;
      let bottom = b.y + b.height;
      let middle = b.getCenterY();

      function snapX(x, state, centerAlign) {
        let override = false;

        if (centerAlign && Math.abs(x - center) < ttX) {
          delta.x = x - bounds.getCenterX();
          ttX = Math.abs(x - center);
          override = true;
        } else if (!centerAlign) {
          if (Math.abs(x - left) < ttX) {
            delta.x = x - bounds.x;
            ttX = Math.abs(x - left);
            override = true;
          } else if (Math.abs(x - right) < ttX) {
            delta.x = x - bounds.x - bounds.width;
            ttX = Math.abs(x - right);
            override = true;
          }
        }

        if (override) {
          stateX = state;
          valueX = x;

          if (this.guideX == null) {
            this.guideX = this.createGuideShape(true);
            this.guideX.dialect =
              this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
            this.guideX.pointerEvents = false;
            this.guideX.init(this.graph.getView().getOverlayPane());
          }
        }

        overrideX = overrideX || override;
      }

      function snapY(y, state, centerAlign) {
        let override = false;

        if (centerAlign && Math.abs(y - middle) < ttY) {
          delta.y = y - bounds.getCenterY();
          ttY = Math.abs(y - middle);
          override = true;
        } else if (!centerAlign) {
          if (Math.abs(y - top) < ttY) {
            delta.y = y - bounds.y;
            ttY = Math.abs(y - top);
            override = true;
          } else if (Math.abs(y - bottom) < ttY) {
            delta.y = y - bounds.y - bounds.height;
            ttY = Math.abs(y - bottom);
            override = true;
          }
        }

        if (override) {
          stateY = state;
          valueY = y;

          if (this.guideY == null) {
            this.guideY = this.createGuideShape(false);
            this.guideY.dialect =
              this.graph.dialect != wangConstants.DIALECT_SVG ? wangConstants.DIALECT_VML : wangConstants.DIALECT_SVG;
            this.guideY.pointerEvents = false;
            this.guideY.init(this.graph.getView().getOverlayPane());
          }
        }

        overrideY = overrideY || override;
      }

      for (let i = 0; i < this.states.length; i++) {
        let state = this.states[i];

        if (state != null && !this.isStateIgnored(state)) {
          if (this.horizontal) {
            snapX.call(this, state.getCenterX(), state, true);
            snapX.call(this, state.x, state, false);
            snapX.call(this, state.x + state.width, state, false);

            if (state.cell == null) {
              snapX.call(this, state.getCenterX(), state, false);
            }
          }

          if (this.vertical) {
            snapY.call(this, state.getCenterY(), state, true);
            snapY.call(this, state.y, state, false);
            snapY.call(this, state.y + state.height, state, false);

            if (state.cell == null) {
              snapY.call(this, state.getCenterY(), state, false);
            }
          }
        }
      }

      this.graph.snapDelta(delta, bounds, !gridEnabled, overrideX, overrideY);
      delta = this.getDelta(bounds, stateX, delta.x, stateY, delta.y);
      let c = this.graph.container;

      if (!overrideX && this.guideX != null) {
        this.guideX.node.style.visibility = 'hidden';
      } else if (this.guideX != null) {
        let minY = null;
        let maxY = null;

        if (stateX != null && bounds != null) {
          minY = Math.min(bounds.y + delta.y - this.graph.panDy, stateX.y);
          maxY = Math.max(bounds.y + bounds.height + delta.y - this.graph.panDy, stateX.y + stateX.height);
        }

        if (minY != null && maxY != null) {
          this.guideX.points = [new wangPoint(valueX, minY), new wangPoint(valueX, maxY)];
        } else {
          this.guideX.points = [
            new wangPoint(valueX, -this.graph.panDy),
            new wangPoint(valueX, c.scrollHeight - 3 - this.graph.panDy)
          ];
        }

        this.guideX.stroke = this.getGuideColor(stateX, true);
        this.guideX.node.style.visibility = 'visible';
        this.guideX.redraw();
      }

      if (!overrideY && this.guideY != null) {
        this.guideY.node.style.visibility = 'hidden';
      } else if (this.guideY != null) {
        let minX = null;
        let maxX = null;

        if (stateY != null && bounds != null) {
          minX = Math.min(bounds.x + delta.x - this.graph.panDx, stateY.x);
          maxX = Math.max(bounds.x + bounds.width + delta.x - this.graph.panDx, stateY.x + stateY.width);
        }

        if (minX != null && maxX != null) {
          this.guideY.points = [new wangPoint(minX, valueY), new wangPoint(maxX, valueY)];
        } else {
          this.guideY.points = [
            new wangPoint(-this.graph.panDx, valueY),
            new wangPoint(c.scrollWidth - 3 - this.graph.panDx, valueY)
          ];
        }

        this.guideY.stroke = this.getGuideColor(stateY, false);
        this.guideY.node.style.visibility = 'visible';
        this.guideY.redraw();
      }
    }

    return delta;
  }

  getDelta(bounds, stateX, dx, stateY, dy) {
    let s = this.graph.view.scale;

    if (this.rounded || (stateX != null && stateX.cell == null)) {
      dx = Math.round((bounds.x + dx) / s) * s - bounds.x;
    }

    if (this.rounded || (stateY != null && stateY.cell == null)) {
      dy = Math.round((bounds.y + dy) / s) * s - bounds.y;
    }

    return new wangPoint(dx, dy);
  }

  getGuideColor(state, horizontal) {
    return wangConstants.GUIDE_COLOR;
  }

  hide() {
    this.setVisible(false);
  }

  setVisible(visible) {
    if (this.guideX != null) {
      this.guideX.node.style.visibility = visible ? 'visible' : 'hidden';
    }

    if (this.guideY != null) {
      this.guideY.node.style.visibility = visible ? 'visible' : 'hidden';
    }
  }

  destroy() {
    if (this.guideX != null) {
      this.guideX.destroy();
      this.guideX = null;
    }

    if (this.guideY != null) {
      this.guideY.destroy();
      this.guideY = null;
    }
  }
}
