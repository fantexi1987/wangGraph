import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangMouseEvent } from '@wangGraph/util/wangMouseEvent';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangClient } from '@wangGraph/wangClient';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangShape } from '@wangGraph/shape/wangShape';
import { wangStencilRegistry } from '@wangGraph/shape/wangStencilRegistry';
import { wangText } from '@wangGraph/shape/wangText';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';
import { wangConnector } from '@wangGraph/shape/wangConnector';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangCellRenderer {
  static defaultShapes = new Object();
  defaultEdgeShape = wangConnector;
  defaultVertexShape = wangRectangleShape;
  defaultTextShape = wangText;
  legacyControlPosition = true;
  legacySpacing = true;
  antiAlias = true;
  minSvgStrokeWidth = 1;
  forceControlClickHandler = false;

  constructor() {}

  static registerShape(key, shape) {
    wangCellRenderer.defaultShapes[key] = shape;
  }

  initializeShape(state) {
    state.shape.dialect = state.view.graph.dialect;
    this.configureShape(state);
    state.shape.init(state.view.getDrawPane());
  }

  createShape(state) {
    let shape = null;

    if (state.style != null) {
      let stencil = wangStencilRegistry.getStencil(state.style[wangConstants.STYLE_SHAPE]);

      if (stencil != null) {
        shape = new wangShape(stencil);
      } else {
        let ctor = this.getShapeConstructor(state);
        shape = new ctor();
      }
    }

    return shape;
  }

  createIndicatorShape(state) {
    state.shape.indicatorShape = this.getShape(state.view.graph.getIndicatorShape(state));
  }

  getShape(name) {
    return name != null ? wangCellRenderer.defaultShapes[name] : null;
  }

  getShapeConstructor(state) {
    let ctor = this.getShape(state.style[wangConstants.STYLE_SHAPE]);

    if (ctor == null) {
      ctor = state.view.graph.getModel().isEdge(state.cell) ? this.defaultEdgeShape : this.defaultVertexShape;
    }

    return ctor;
  }

  configureShape(state) {
    state.shape.apply(state);
    state.shape.image = state.view.graph.getImage(state);
    state.shape.indicatorColor = state.view.graph.getIndicatorColor(state);
    state.shape.indicatorStrokeColor = state.style[wangConstants.STYLE_INDICATOR_STROKECOLOR];
    state.shape.indicatorGradientColor = state.view.graph.getIndicatorGradientColor(state);
    state.shape.indicatorDirection = state.style[wangConstants.STYLE_INDICATOR_DIRECTION];
    state.shape.indicatorImage = state.view.graph.getIndicatorImage(state);
    this.postConfigureShape(state);
  }

  postConfigureShape(state) {
    if (state.shape != null) {
      this.resolveColor(state, 'indicatorGradientColor', wangConstants.STYLE_GRADIENTCOLOR);
      this.resolveColor(state, 'indicatorColor', wangConstants.STYLE_FILLCOLOR);
      this.resolveColor(state, 'gradient', wangConstants.STYLE_GRADIENTCOLOR);
      this.resolveColor(state, 'stroke', wangConstants.STYLE_STROKECOLOR);
      this.resolveColor(state, 'fill', wangConstants.STYLE_FILLCOLOR);
    }
  }

  checkPlaceholderStyles(state) {
    if (state.style != null) {
      let values = ['inherit', 'swimlane', 'indicated'];
      let styles = [
        wangConstants.STYLE_FILLCOLOR,
        wangConstants.STYLE_STROKECOLOR,
        wangConstants.STYLE_GRADIENTCOLOR,
        wangConstants.STYLE_FONTCOLOR
      ];

      for (let i = 0; i < styles.length; i++) {
        if (wangUtils.indexOf(values, state.style[styles[i]]) >= 0) {
          return true;
        }
      }
    }

    return false;
  }

  resolveColor(state, field, key) {
    let shape = key == wangConstants.STYLE_FONTCOLOR ? state.text : state.shape;

    if (shape != null) {
      let graph = state.view.graph;
      let value = shape[field];
      let referenced = null;

      if (value == 'inherit') {
        referenced = graph.model.getParent(state.cell);
      } else if (value == 'swimlane') {
        shape[field] =
          key == wangConstants.STYLE_STROKECOLOR || key == wangConstants.STYLE_FONTCOLOR ? '#000000' : '#ffffff';

        if (graph.model.getTerminal(state.cell, false) != null) {
          referenced = graph.model.getTerminal(state.cell, false);
        } else {
          referenced = state.cell;
        }

        referenced = graph.getSwimlane(referenced);
        key = graph.swimlaneIndicatorColorAttribute;
      } else if (value == 'indicated' && state.shape != null) {
        shape[field] = state.shape.indicatorColor;
      }

      if (referenced != null) {
        let rstate = graph.getView().getState(referenced);
        shape[field] = null;

        if (rstate != null) {
          let rshape = key == wangConstants.STYLE_FONTCOLOR ? rstate.text : rstate.shape;

          if (rshape != null && field != 'indicatorColor') {
            shape[field] = rshape[field];
          } else {
            shape[field] = rstate.style[key];
          }
        }
      }
    }
  }

  getLabelValue(state) {
    return state.view.graph.getLabel(state.cell);
  }

  createLabel(state, value) {
    let graph = state.view.graph;
    let isEdge = graph.getModel().isEdge(state.cell);

    if (state.style[wangConstants.STYLE_FONTSIZE] > 0 || state.style[wangConstants.STYLE_FONTSIZE] == null) {
      let isForceHtml = graph.isHtmlLabel(state.cell) || (value != null && wangUtils.isNode(value));
      state.text = new this.defaultTextShape(
        value,
        new wangRectangle(),
        state.style[wangConstants.STYLE_ALIGN] || wangConstants.ALIGN_CENTER,
        graph.getVerticalAlign(state),
        state.style[wangConstants.STYLE_FONTCOLOR],
        state.style[wangConstants.STYLE_FONTFAMILY],
        state.style[wangConstants.STYLE_FONTSIZE],
        state.style[wangConstants.STYLE_FONTSTYLE],
        state.style[wangConstants.STYLE_SPACING],
        state.style[wangConstants.STYLE_SPACING_TOP],
        state.style[wangConstants.STYLE_SPACING_RIGHT],
        state.style[wangConstants.STYLE_SPACING_BOTTOM],
        state.style[wangConstants.STYLE_SPACING_LEFT],
        state.style[wangConstants.STYLE_HORIZONTAL],
        state.style[wangConstants.STYLE_LABEL_BACKGROUNDCOLOR],
        state.style[wangConstants.STYLE_LABEL_BORDERCOLOR],
        graph.isWrapping(state.cell) && graph.isHtmlLabel(state.cell),
        graph.isLabelClipped(state.cell),
        state.style[wangConstants.STYLE_OVERFLOW],
        state.style[wangConstants.STYLE_LABEL_PADDING],
        wangUtils.getValue(state.style, wangConstants.STYLE_TEXT_DIRECTION, wangConstants.DEFAULT_TEXT_DIRECTION)
      );
      state.text.opacity = wangUtils.getValue(state.style, wangConstants.STYLE_TEXT_OPACITY, 100);
      state.text.dialect = isForceHtml ? wangConstants.DIALECT_STRICTHTML : state.view.graph.dialect;
      state.text.style = state.style;
      state.text.state = state;
      this.initializeLabel(state, state.text);
      let forceGetCell = false;

      let getState = function (evt) {
        let result = state;

        if (wangClient.IS_TOUCH || forceGetCell) {
          let x = wangEvent.getClientX(evt);
          let y = wangEvent.getClientY(evt);
          let pt = wangUtils.convertPoint(graph.container, x, y);
          result = graph.view.getState(graph.getCellAt(pt.x, pt.y));
        }

        return result;
      };

      wangEvent.addGestureListeners(
        state.text.node,
        (evt) => {
          if (this.isLabelEvent(state, evt)) {
            graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt, state));
            forceGetCell = graph.dialect != wangConstants.DIALECT_SVG && wangEvent.getSource(evt).nodeName == 'IMG';
          }
        },
        (evt) => {
          if (this.isLabelEvent(state, evt)) {
            graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt, getState(evt)));
          }
        },
        (evt) => {
          if (this.isLabelEvent(state, evt)) {
            graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt, getState(evt)));
            forceGetCell = false;
          }
        }
      );

      if (graph.nativeDblClickEnabled) {
        wangEvent.addListener(state.text.node, 'dblclick', (evt) => {
          if (this.isLabelEvent(state, evt)) {
            graph.dblClick(evt, state.cell);
            wangEvent.consume(evt);
          }
        });
      }
    }
  }

  initializeLabel(state, shape) {
    if (wangClient.IS_SVG && wangClient.NO_FO && shape.dialect != wangConstants.DIALECT_SVG) {
      shape.init(state.view.graph.container);
    } else {
      shape.init(state.view.getDrawPane());
    }
  }

  createCellOverlays(state) {
    let graph = state.view.graph;
    let overlays = graph.getCellOverlays(state.cell);
    let dict = null;

    if (overlays != null) {
      dict = new wangDictionary();

      for (let i = 0; i < overlays.length; i++) {
        let shape = state.overlays != null ? state.overlays.remove(overlays[i]) : null;

        if (shape == null) {
          let tmp = new wangImageShape(new wangRectangle(), overlays[i].image.src);
          tmp.dialect = state.view.graph.dialect;
          tmp.preserveImageAspect = false;
          tmp.overlay = overlays[i];
          this.initializeOverlay(state, tmp);
          this.installCellOverlayListeners(state, overlays[i], tmp);

          if (overlays[i].cursor != null) {
            tmp.node.style.cursor = overlays[i].cursor;
          }

          dict.put(overlays[i], tmp);
        } else {
          dict.put(overlays[i], shape);
        }
      }
    }

    if (state.overlays != null) {
      state.overlays.visit(function (id, shape) {
        shape.destroy();
      });
    }

    state.overlays = dict;
  }

  initializeOverlay(state, overlay) {
    overlay.init(state.view.getOverlayPane());
  }

  installCellOverlayListeners(state, overlay, shape) {
    let graph = state.view.graph;
    wangEvent.addListener(shape.node, 'click', function (evt) {
      if (graph.isEditing()) {
        graph.stopEditing(!graph.isInvokesStopCellEditing());
      }

      overlay.fireEvent(new wangEventObject(wangEvent.CLICK, 'event', evt, 'cell', state.cell));
    });
    wangEvent.addGestureListeners(
      shape.node,
      function (evt) {
        wangEvent.consume(evt);
      },
      function (evt) {
        graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt, state));
      }
    );

    if (wangClient.IS_TOUCH) {
      wangEvent.addListener(shape.node, 'touchend', function (evt) {
        overlay.fireEvent(new wangEventObject(wangEvent.CLICK, 'event', evt, 'cell', state.cell));
      });
    }
  }

  createControl(state) {
    let graph = state.view.graph;
    let image = graph.getFoldingImage(state);

    if (graph.foldingEnabled && image != null) {
      if (state.control == null) {
        let b = new wangRectangle(0, 0, image.width, image.height);
        state.control = new wangImageShape(b, image.src);
        state.control.preserveImageAspect = false;
        state.control.dialect = graph.dialect;
        this.initControl(state, state.control, true, this.createControlClickHandler(state));
      }
    } else if (state.control != null) {
      state.control.destroy();
      state.control = null;
    }
  }

  createControlClickHandler(state) {
    let graph = state.view.graph;
    return (evt) => {
      if (this.forceControlClickHandler || graph.isEnabled()) {
        let collapse = !graph.isCellCollapsed(state.cell);
        graph.foldCells(collapse, false, [state.cell], null, evt);
        wangEvent.consume(evt);
      }
    };
  }

  initControl(state, control, handleEvents, clickHandler) {
    let graph = state.view.graph;
    let isForceHtml = graph.isHtmlLabel(state.cell) && wangClient.NO_FO && graph.dialect == wangConstants.DIALECT_SVG;

    if (isForceHtml) {
      control.dialect = wangConstants.DIALECT_PREFERHTML;
      control.init(graph.container);
      control.node.style.zIndex = 1;
    } else {
      control.init(state.view.getOverlayPane());
    }

    let node = control.innerNode || control.node;

    if (clickHandler != null && !wangClient.IS_IOS) {
      if (graph.isEnabled()) {
        node.style.cursor = 'pointer';
      }

      wangEvent.addListener(node, 'click', clickHandler);
    }

    if (handleEvents) {
      let first = null;
      wangEvent.addGestureListeners(
        node,
        function (evt) {
          first = new wangPoint(wangEvent.getClientX(evt), wangEvent.getClientY(evt));
          graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt, state));
          wangEvent.consume(evt);
        },
        function (evt) {
          graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt, state));
        },
        function (evt) {
          graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt, state));
          wangEvent.consume(evt);
        }
      );

      if (clickHandler != null && wangClient.IS_IOS) {
        node.addEventListener(
          'touchend',
          function (evt) {
            if (first != null) {
              let tol = graph.tolerance;

              if (
                Math.abs(first.x - wangEvent.getClientX(evt)) < tol &&
                Math.abs(first.y - wangEvent.getClientY(evt)) < tol
              ) {
                clickHandler.call(clickHandler, evt);
                wangEvent.consume(evt);
              }
            }
          },
          true
        );
      }
    }

    return node;
  }

  isShapeEvent(state, evt) {
    return true;
  }

  isLabelEvent(state, evt) {
    return true;
  }

  installListeners(state) {
    let graph = state.view.graph;

    let getState = function (evt) {
      let result = state;

      if (
        (graph.dialect != wangConstants.DIALECT_SVG && wangEvent.getSource(evt).nodeName == 'IMG') ||
        wangClient.IS_TOUCH
      ) {
        let x = wangEvent.getClientX(evt);
        let y = wangEvent.getClientY(evt);
        let pt = wangUtils.convertPoint(graph.container, x, y);
        result = graph.view.getState(graph.getCellAt(pt.x, pt.y));
      }

      return result;
    };

    wangEvent.addGestureListeners(
      state.shape.node,
      (evt) => {
        if (this.isShapeEvent(state, evt)) {
          graph.fireMouseEvent(wangEvent.MOUSE_DOWN, new wangMouseEvent(evt, state));
        }
      },
      (evt) => {
        if (this.isShapeEvent(state, evt)) {
          graph.fireMouseEvent(wangEvent.MOUSE_MOVE, new wangMouseEvent(evt, getState(evt)));
        }
      },
      (evt) => {
        if (this.isShapeEvent(state, evt)) {
          graph.fireMouseEvent(wangEvent.MOUSE_UP, new wangMouseEvent(evt, getState(evt)));
        }
      }
    );

    if (graph.nativeDblClickEnabled) {
      wangEvent.addListener(state.shape.node, 'dblclick', (evt) => {
        if (this.isShapeEvent(state, evt)) {
          graph.dblClick(evt, state.cell);
          wangEvent.consume(evt);
        }
      });
    }
  }

  redrawLabel(state, forced) {
    let graph = state.view.graph;
    let value = this.getLabelValue(state);
    let wrapping = graph.isWrapping(state.cell);
    let clipping = graph.isLabelClipped(state.cell);
    let isForceHtml = state.view.graph.isHtmlLabel(state.cell) || (value != null && wangUtils.isNode(value));
    let dialect = isForceHtml ? wangConstants.DIALECT_STRICTHTML : state.view.graph.dialect;
    let overflow = state.style[wangConstants.STYLE_OVERFLOW] || 'visible';

    if (
      state.text != null &&
      (state.text.wrap != wrapping ||
        state.text.clipped != clipping ||
        state.text.overflow != overflow ||
        state.text.dialect != dialect)
    ) {
      state.text.destroy();
      state.text = null;
    }

    if (state.text == null && value != null && (wangUtils.isNode(value) || value.length > 0)) {
      this.createLabel(state, value);
    } else if (state.text != null && (value == null || value.length == 0)) {
      state.text.destroy();
      state.text = null;
    }

    if (state.text != null) {
      if (forced) {
        if (state.text.lastValue != null && this.isTextShapeInvalid(state, state.text)) {
          state.text.lastValue = null;
        }

        state.text.resetStyles();
        state.text.apply(state);
        state.text.valign = graph.getVerticalAlign(state);
      }

      let bounds = this.getLabelBounds(state);
      let nextScale = this.getTextScale(state);
      this.resolveColor(state, 'color', wangConstants.STYLE_FONTCOLOR);

      if (
        forced ||
        state.text.value != value ||
        state.text.isWrapping != wrapping ||
        state.text.overflow != overflow ||
        state.text.isClipping != clipping ||
        state.text.scale != nextScale ||
        state.text.dialect != dialect ||
        state.text.bounds == null ||
        !state.text.bounds.equals(bounds)
      ) {
        state.text.dialect = dialect;
        state.text.value = value;
        state.text.bounds = bounds;
        state.text.scale = nextScale;
        state.text.wrap = wrapping;
        state.text.clipped = clipping;
        state.text.overflow = overflow;
        let vis = state.text.node.style.visibility;
        this.redrawLabelShape(state.text);
        state.text.node.style.visibility = vis;
      }
    }
  }

  isTextShapeInvalid(state, shape) {
    function check(property, stylename, defaultValue) {
      let result = false;

      if (
        stylename == 'spacingTop' ||
        stylename == 'spacingRight' ||
        stylename == 'spacingBottom' ||
        stylename == 'spacingLeft'
      ) {
        result = parseFloat(shape[property]) - parseFloat(shape.spacing) != (state.style[stylename] || defaultValue);
      } else {
        result = shape[property] != (state.style[stylename] || defaultValue);
      }

      return result;
    }

    return (
      check('fontStyle', wangConstants.STYLE_FONTSTYLE, wangConstants.DEFAULT_FONTSTYLE) ||
      check('family', wangConstants.STYLE_FONTFAMILY, wangConstants.DEFAULT_FONTFAMILY) ||
      check('size', wangConstants.STYLE_FONTSIZE, wangConstants.DEFAULT_FONTSIZE) ||
      check('color', wangConstants.STYLE_FONTCOLOR, 'black') ||
      check('align', wangConstants.STYLE_ALIGN, '') ||
      check('valign', wangConstants.STYLE_VERTICAL_ALIGN, '') ||
      check('spacing', wangConstants.STYLE_SPACING, 2) ||
      check('spacingTop', wangConstants.STYLE_SPACING_TOP, 0) ||
      check('spacingRight', wangConstants.STYLE_SPACING_RIGHT, 0) ||
      check('spacingBottom', wangConstants.STYLE_SPACING_BOTTOM, 0) ||
      check('spacingLeft', wangConstants.STYLE_SPACING_LEFT, 0) ||
      check('horizontal', wangConstants.STYLE_HORIZONTAL, true) ||
      check('background', wangConstants.STYLE_LABEL_BACKGROUNDCOLOR) ||
      check('border', wangConstants.STYLE_LABEL_BORDERCOLOR) ||
      check('opacity', wangConstants.STYLE_TEXT_OPACITY, 100) ||
      check('textDirection', wangConstants.STYLE_TEXT_DIRECTION, wangConstants.DEFAULT_TEXT_DIRECTION)
    );
  }

  redrawLabelShape(shape) {
    shape.redraw();
  }

  getTextScale(state) {
    return state.view.scale;
  }

  getLabelBounds(state) {
    let graph = state.view.graph;
    let scale = state.view.scale;
    let isEdge = graph.getModel().isEdge(state.cell);
    let bounds = new wangRectangle(state.absoluteOffset.x, state.absoluteOffset.y);

    if (isEdge) {
      let spacing = state.text.getSpacing();
      bounds.x += spacing.x * scale;
      bounds.y += spacing.y * scale;
      let geo = graph.getCellGeometry(state.cell);

      if (geo != null) {
        bounds.width = Math.max(0, geo.width * scale);
        bounds.height = Math.max(0, geo.height * scale);
      }
    } else {
      if (state.text.isPaintBoundsInverted()) {
        let tmp = bounds.x;
        bounds.x = bounds.y;
        bounds.y = tmp;
      }

      bounds.x += state.x;
      bounds.y += state.y;
      bounds.width = Math.max(1, state.width);
      bounds.height = Math.max(1, state.height);
    }

    if (state.text.isPaintBoundsInverted()) {
      let t = (state.width - state.height) / 2;
      bounds.x += t;
      bounds.y -= t;
      let tmp = bounds.width;
      bounds.width = bounds.height;
      bounds.height = tmp;
    }

    if (state.shape != null) {
      let hpos = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_POSITION, wangConstants.ALIGN_CENTER);
      let vpos = wangUtils.getValue(
        state.style,
        wangConstants.STYLE_VERTICAL_LABEL_POSITION,
        wangConstants.ALIGN_MIDDLE
      );

      if (hpos == wangConstants.ALIGN_CENTER && vpos == wangConstants.ALIGN_MIDDLE) {
        bounds = state.shape.getLabelBounds(bounds);
      }
    }

    let lw = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_WIDTH, null);

    if (lw != null) {
      bounds.width = parseFloat(lw) * scale;
    }

    if (!isEdge) {
      this.rotateLabelBounds(state, bounds);
    }

    return bounds;
  }

  rotateLabelBounds(state, bounds) {
    bounds.y -= state.text.margin.y * bounds.height;
    bounds.x -= state.text.margin.x * bounds.width;

    if (
      !this.legacySpacing ||
      (state.style[wangConstants.STYLE_OVERFLOW] != 'fill' && state.style[wangConstants.STYLE_OVERFLOW] != 'width')
    ) {
      let s = state.view.scale;
      let spacing = state.text.getSpacing();
      bounds.x += spacing.x * s;
      bounds.y += spacing.y * s;
      let hpos = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_POSITION, wangConstants.ALIGN_CENTER);
      let vpos = wangUtils.getValue(
        state.style,
        wangConstants.STYLE_VERTICAL_LABEL_POSITION,
        wangConstants.ALIGN_MIDDLE
      );
      let lw = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_WIDTH, null);
      bounds.width = Math.max(
        0,
        bounds.width -
          (hpos == wangConstants.ALIGN_CENTER && lw == null
            ? state.text.spacingLeft * s + state.text.spacingRight * s
            : 0)
      );
      bounds.height = Math.max(
        0,
        bounds.height -
          (vpos == wangConstants.ALIGN_MIDDLE ? state.text.spacingTop * s + state.text.spacingBottom * s : 0)
      );
    }

    let theta = state.text.getTextRotation();

    if (theta != 0 && state != null && state.view.graph.model.isVertex(state.cell)) {
      let cx = state.getCenterX();
      let cy = state.getCenterY();

      if (bounds.x != cx || bounds.y != cy) {
        let rad = theta * (Math.PI / 180);
        let pt = wangUtils.getRotatedPoint(
          new wangPoint(bounds.x, bounds.y),
          Math.cos(rad),
          Math.sin(rad),
          new wangPoint(cx, cy)
        );
        bounds.x = pt.x;
        bounds.y = pt.y;
      }
    }
  }

  redrawCellOverlays(state, forced) {
    this.createCellOverlays(state);

    if (state.overlays != null) {
      let rot = wangUtils.mod(wangUtils.getValue(state.style, wangConstants.STYLE_ROTATION, 0), 90);
      let rad = wangUtils.toRadians(rot);
      let cos = Math.cos(rad);
      let sin = Math.sin(rad);
      state.overlays.visit(function (id, shape) {
        let bounds = shape.overlay.getBounds(state);

        if (!state.view.graph.getModel().isEdge(state.cell)) {
          if (state.shape != null && rot != 0) {
            let cx = bounds.getCenterX();
            let cy = bounds.getCenterY();
            let point = wangUtils.getRotatedPoint(
              new wangPoint(cx, cy),
              cos,
              sin,
              new wangPoint(state.getCenterX(), state.getCenterY())
            );
            cx = point.x;
            cy = point.y;
            bounds.x = Math.round(cx - bounds.width / 2);
            bounds.y = Math.round(cy - bounds.height / 2);
          }
        }

        if (forced || shape.bounds == null || shape.scale != state.view.scale || !shape.bounds.equals(bounds)) {
          shape.bounds = bounds;
          shape.scale = state.view.scale;
          shape.redraw();
        }
      });
    }
  }

  redrawControl(state, forced) {
    let image = state.view.graph.getFoldingImage(state);

    if (state.control != null && image != null) {
      let bounds = this.getControlBounds(state, image.width, image.height);
      let r = this.legacyControlPosition
        ? wangUtils.getValue(state.style, wangConstants.STYLE_ROTATION, 0)
        : state.shape.getTextRotation();
      let s = state.view.scale;

      if (forced || state.control.scale != s || !state.control.bounds.equals(bounds) || state.control.rotation != r) {
        state.control.rotation = r;
        state.control.bounds = bounds;
        state.control.scale = s;
        state.control.redraw();
      }
    }
  }

  getControlBounds(state, w, h) {
    if (state.control != null) {
      let s = state.view.scale;
      let cx = state.getCenterX();
      let cy = state.getCenterY();

      if (!state.view.graph.getModel().isEdge(state.cell)) {
        cx = state.x + w * s;
        cy = state.y + h * s;

        if (state.shape != null) {
          let rot = state.shape.getShapeRotation();

          if (this.legacyControlPosition) {
            rot = wangUtils.getValue(state.style, wangConstants.STYLE_ROTATION, 0);
          } else {
            if (state.shape.isPaintBoundsInverted()) {
              let t = (state.width - state.height) / 2;
              cx += t;
              cy -= t;
            }
          }

          if (rot != 0) {
            let rad = wangUtils.toRadians(rot);
            let cos = Math.cos(rad);
            let sin = Math.sin(rad);
            let point = wangUtils.getRotatedPoint(
              new wangPoint(cx, cy),
              cos,
              sin,
              new wangPoint(state.getCenterX(), state.getCenterY())
            );
            cx = point.x;
            cy = point.y;
          }
        }
      }

      return state.view.graph.getModel().isEdge(state.cell)
        ? new wangRectangle(
            Math.round(cx - (w / 2) * s),
            Math.round(cy - (h / 2) * s),
            Math.round(w * s),
            Math.round(h * s)
          )
        : new wangRectangle(
            Math.round(cx - (w / 2) * s),
            Math.round(cy - (h / 2) * s),
            Math.round(w * s),
            Math.round(h * s)
          );
    }

    return null;
  }

  insertStateAfter(state, node, htmlNode) {
    let shapes = this.getShapesForState(state);

    for (let i = 0; i < shapes.length; i++) {
      if (shapes[i] != null && shapes[i].node != null) {
        let html =
          shapes[i].node.parentNode != state.view.getDrawPane() &&
          shapes[i].node.parentNode != state.view.getOverlayPane();
        let temp = html ? htmlNode : node;

        if (temp != null && temp.nextSibling != shapes[i].node) {
          if (temp.nextSibling == null) {
            temp.parentNode.appendChild(shapes[i].node);
          } else {
            temp.parentNode.insertBefore(shapes[i].node, temp.nextSibling);
          }
        } else if (temp == null) {
          if (shapes[i].node.parentNode == state.view.graph.container) {
            let canvas = state.view.canvas;

            while (canvas != null && canvas.parentNode != state.view.graph.container) {
              canvas = canvas.parentNode;
            }

            if (canvas != null && canvas.nextSibling != null) {
              if (canvas.nextSibling != shapes[i].node) {
                shapes[i].node.parentNode.insertBefore(shapes[i].node, canvas.nextSibling);
              }
            } else {
              shapes[i].node.parentNode.appendChild(shapes[i].node);
            }
          } else if (
            shapes[i].node.parentNode != null &&
            shapes[i].node.parentNode.firstChild != null &&
            shapes[i].node.parentNode.firstChild != shapes[i].node
          ) {
            shapes[i].node.parentNode.insertBefore(shapes[i].node, shapes[i].node.parentNode.firstChild);
          }
        }

        if (html) {
          htmlNode = shapes[i].node;
        } else {
          node = shapes[i].node;
        }
      }
    }

    return [node, htmlNode];
  }

  getShapesForState(state) {
    return [state.shape, state.text, state.control];
  }

  redraw(state, force, rendering) {
    // ---------begin-----------------
    let view = state?.view;
    let graph = view?.graph;
    let container = graph?.container;
    if (container && graph.panningHandler.isActive()) {
      const { x: cellX, y: cellY, height: cellH, width: cellW } = state.cellBounds;
      const { x: tx, y: ty } = view.translate;
      const rx = cellX + tx;
      const ry = cellY + ty;
      const { offsetWidth: viewWidth, offsetHeight: viewHeight } = container;
      const xMargin = 0;
      const scale = view.scale;
      if (
        rx + cellW + xMargin < 0 ||
        rx * scale > viewWidth + xMargin ||
        ry + cellH + xMargin < 0 ||
        ry * scale > viewHeight + xMargin
      ) {
        this.destroy(state);
        return;
      }
    }
    // --------------end-----------------------

    let shapeChanged = this.redrawShape(state, force, rendering);

    if (state.shape != null && (rendering == null || rendering)) {
      this.redrawLabel(state, shapeChanged);
      this.redrawCellOverlays(state, shapeChanged);
      this.redrawControl(state, shapeChanged);
    }
  }

  redrawShape(state, force, rendering) {
    let model = state.view.graph.model;
    let shapeChanged = false;

    if (
      state.shape != null &&
      state.shape.style != null &&
      state.style != null &&
      state.shape.style[wangConstants.STYLE_SHAPE] != state.style[wangConstants.STYLE_SHAPE]
    ) {
      state.shape.destroy();
      state.shape = null;
    }

    if (
      state.shape == null &&
      state.view.graph.container != null &&
      state.cell != state.view.currentRoot &&
      (model.isVertex(state.cell) || model.isEdge(state.cell))
    ) {
      state.shape = this.createShape(state);

      if (state.shape != null) {
        state.shape.minSvgStrokeWidth = this.minSvgStrokeWidth;
        state.shape.antiAlias = this.antiAlias;
        this.createIndicatorShape(state);
        this.initializeShape(state);
        this.createCellOverlays(state);
        this.installListeners(state);
        state.view.graph.selectionCellsHandler.updateHandler(state);
      }
    } else if (
      !force &&
      state.shape != null &&
      (!wangUtils.equalEntries(state.shape.style, state.style) || this.checkPlaceholderStyles(state))
    ) {
      state.shape.resetStyles();
      this.configureShape(state);
      state.view.graph.selectionCellsHandler.updateHandler(state);
      force = true;
    }

    if (state.shape != null && state.shape.indicatorShape != this.getShape(state.view.graph.getIndicatorShape(state))) {
      if (state.shape.indicator != null) {
        state.shape.indicator.destroy();
        state.shape.indicator = null;
      }

      this.createIndicatorShape(state);

      if (state.shape.indicatorShape != null) {
        state.shape.indicator = new state.shape.indicatorShape();
        state.shape.indicator.dialect = state.shape.dialect;
        state.shape.indicator.init(state.node);
        force = true;
      }
    }

    if (state.shape != null) {
      this.createControl(state);

      if (force || this.isShapeInvalid(state, state.shape)) {
        if (state.absolutePoints != null) {
          state.shape.points = state.absolutePoints.slice();
          state.shape.bounds = null;
        } else {
          state.shape.points = null;
          state.shape.bounds = new wangRectangle(state.x, state.y, state.width, state.height);
        }

        state.shape.scale = state.view.scale;

        if (rendering == null || rendering) {
          this.doRedrawShape(state);
        } else {
          state.shape.updateBoundingBox();
        }

        shapeChanged = true;
      }
    }

    return shapeChanged;
  }

  doRedrawShape(state) {
    state.shape.redraw();
  }

  isShapeInvalid(state, shape) {
    return (
      shape.bounds == null ||
      shape.scale != state.view.scale ||
      (state.absolutePoints == null && !shape.bounds.equals(state)) ||
      (state.absolutePoints != null && !wangUtils.equalPoints(shape.points, state.absolutePoints))
    );
  }

  destroy(state) {
    if (state.shape != null) {
      if (state.text != null) {
        state.text.destroy();
        state.text = null;
      }

      if (state.overlays != null) {
        state.overlays.visit(function (id, shape) {
          shape.destroy();
        });
        state.overlays = null;
      }

      if (state.control != null) {
        state.control.destroy();
        state.control = null;
      }

      state.shape.destroy();
      state.shape = null;
    }
  }
}
