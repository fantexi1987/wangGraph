import { wangText } from '@wangGraph/shape/wangText';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangClient } from '@wangGraph/wangClient';

export class wangCellEditor {
  textarea = null;
  editingCell = null;
  trigger = null;
  modified = false;
  autoSize = true;
  selectText = true;
  emptyLabelText = wangClient.IS_FF ? '<br>' : '';
  escapeCancelsEditing = true;
  textNode = '';
  zIndex = 5;
  minResize = new wangRectangle(0, 20);
  wordWrapPadding = wangClient.IS_QUIRKS ? 2 : !wangClient.IS_IE11 ? 1 : 0;
  blurEnabled = false;
  initialValue = null;
  align = null;

  constructor(graph) {
    this.graph = graph;

    this.zoomHandler = () => {
      if (this.graph.isEditing()) {
        this.resize();
      }
    };

    this.graph.view.addListener(wangEvent.SCALE, this.zoomHandler);
    this.graph.view.addListener(wangEvent.SCALE_AND_TRANSLATE, this.zoomHandler);

    this.changeHandler = (sender) => {
      if (this.editingCell != null && this.graph.getView().getState(this.editingCell) == null) {
        this.stopEditing(true);
      }
    };

    this.graph.getModel().addListener(wangEvent.CHANGE, this.changeHandler);
  }

  init() {
    this.textarea = document.createElement('div');
    this.textarea.className = 'wangCellEditor wangPlainTextEditor';
    this.textarea.contentEditable = true;

    if (wangClient.IS_GC) {
      this.textarea.style.minHeight = '1em';
    }

    this.textarea.style.position = this.isLegacyEditor() ? 'absolute' : 'relative';
    this.installListeners(this.textarea);
  }

  applyValue(state, value) {
    this.graph.labelChanged(state.cell, value, this.trigger);
  }

  setAlign(align) {
    if (this.textarea != null) {
      this.textarea.style.textAlign = align;
    }

    this.align = align;
    this.resize();
  }

  getInitialValue(state, trigger) {
    let result = wangUtils.htmlEntities(this.graph.getEditingValue(state.cell, trigger), false);

    if (
      !wangClient.IS_QUIRKS &&
      document.documentMode != 8 &&
      document.documentMode != 9 &&
      document.documentMode != 10
    ) {
      result = wangUtils.replaceTrailingNewlines(result, '<div><br></div>');
    }

    return result.replace(/\n/g, '<br>');
  }

  getCurrentValue(state) {
    return wangUtils.extractTextWithWhitespace(this.textarea.childNodes);
  }

  isCancelEditingKeyEvent(evt) {
    return (
      this.escapeCancelsEditing ||
      wangEvent.isShiftDown(evt) ||
      wangEvent.isControlDown(evt) ||
      wangEvent.isMetaDown(evt)
    );
  }

  installListeners(elt) {
    wangEvent.addListener(elt, 'dragstart', (evt) => {
      this.graph.stopEditing(false);
      wangEvent.consume(evt);
    });
    wangEvent.addListener(elt, 'blur', (evt) => {
      if (this.blurEnabled) {
        this.focusLost(evt);
      }
    });
    wangEvent.addListener(elt, 'keydown', (evt) => {
      if (!wangEvent.isConsumed(evt)) {
        if (this.isStopEditingEvent(evt)) {
          this.graph.stopEditing(false);
          wangEvent.consume(evt);
        } else if (evt.keyCode == 27) {
          this.graph.stopEditing(this.isCancelEditingKeyEvent(evt));
          wangEvent.consume(evt);
        }
      }
    });

    let keypressHandler = (evt) => {
      if (this.editingCell != null) {
        if (
          this.clearOnChange &&
          elt.innerHTML == this.getEmptyLabelText() &&
          (!wangClient.IS_FF || (evt.keyCode != 8 && evt.keyCode != 46))
        ) {
          this.clearOnChange = false;
          elt.innerHTML = '';
        }
      }
    };

    wangEvent.addListener(elt, 'keypress', keypressHandler);
    wangEvent.addListener(elt, 'paste', keypressHandler);

    let keyupHandler = (evt) => {
      if (this.editingCell != null) {
        if (this.textarea.innerHTML.length == 0 || this.textarea.innerHTML == '<br>') {
          this.textarea.innerHTML = this.getEmptyLabelText();
          this.clearOnChange = this.textarea.innerHTML.length > 0;
        } else {
          this.clearOnChange = false;
        }
      }
    };

    wangEvent.addListener(elt, !wangClient.IS_IE11 ? 'input' : 'keyup', keyupHandler);
    wangEvent.addListener(elt, 'cut', keyupHandler);
    wangEvent.addListener(elt, 'paste', keyupHandler);
    let evtName = !wangClient.IS_IE11 ? 'input' : 'keydown';

    let resizeHandler = (evt) => {
      if (this.editingCell != null && this.autoSize && !wangEvent.isConsumed(evt)) {
        if (this.resizeThread != null) {
          window.clearTimeout(this.resizeThread);
        }

        this.resizeThread = window.setTimeout(() => {
          this.resizeThread = null;
          this.resize();
        }, 0);
      }
    };

    wangEvent.addListener(elt, evtName, resizeHandler);
    wangEvent.addListener(window, 'resize', resizeHandler);

    if (document.documentMode >= 9) {
      wangEvent.addListener(elt, 'DOMNodeRemoved', resizeHandler);
      wangEvent.addListener(elt, 'DOMNodeInserted', resizeHandler);
    } else {
      wangEvent.addListener(elt, 'cut', resizeHandler);
      wangEvent.addListener(elt, 'paste', resizeHandler);
    }
  }

  isStopEditingEvent(evt) {
    return (
      evt.keyCode == 113 ||
      (this.graph.isEnterStopsCellEditing() &&
        evt.keyCode == 13 &&
        !wangEvent.isControlDown(evt) &&
        !wangEvent.isShiftDown(evt))
    );
  }

  isEventSource(evt) {
    return wangEvent.getSource(evt) == this.textarea;
  }

  resize() {
    let state = this.graph.getView().getState(this.editingCell);

    if (state == null) {
      this.stopEditing(true);
    } else if (this.textarea != null) {
      let isEdge = this.graph.getModel().isEdge(state.cell);
      let scale = this.graph.getView().scale;
      let m = null;

      if (!this.autoSize || state.style[wangConstants.STYLE_OVERFLOW] == 'fill') {
        this.bounds = this.getEditorBounds(state);
        this.textarea.style.width = Math.round(this.bounds.width / scale) + 'px';
        this.textarea.style.height = Math.round(this.bounds.height / scale) + 'px';

        if (document.documentMode == 8 || wangClient.IS_QUIRKS) {
          this.textarea.style.left = Math.round(this.bounds.x) + 'px';
          this.textarea.style.top = Math.round(this.bounds.y) + 'px';
        } else {
          this.textarea.style.left = Math.max(0, Math.round(this.bounds.x + 1)) + 'px';
          this.textarea.style.top = Math.max(0, Math.round(this.bounds.y + 1)) + 'px';
        }

        if (
          this.graph.isWrapping(state.cell) &&
          (this.bounds.width >= 2 || this.bounds.height >= 2) &&
          this.textarea.innerHTML != this.getEmptyLabelText()
        ) {
          this.textarea.style.wordWrap = wangConstants.WORD_WRAP;
          this.textarea.style.whiteSpace = 'normal';

          if (state.style[wangConstants.STYLE_OVERFLOW] != 'fill') {
            this.textarea.style.width = Math.round(this.bounds.width / scale) + this.wordWrapPadding + 'px';
          }
        } else {
          this.textarea.style.whiteSpace = 'nowrap';

          if (state.style[wangConstants.STYLE_OVERFLOW] != 'fill') {
            this.textarea.style.width = '';
          }
        }
      } else {
        let lw = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_WIDTH, null);
        m = state.text != null && this.align == null ? state.text.margin : null;

        if (m == null) {
          m = wangUtils.getAlignmentAsPoint(
            this.align || wangUtils.getValue(state.style, wangConstants.STYLE_ALIGN, wangConstants.ALIGN_CENTER),
            wangUtils.getValue(state.style, wangConstants.STYLE_VERTICAL_ALIGN, wangConstants.ALIGN_MIDDLE)
          );
        }

        if (isEdge) {
          this.bounds = new wangRectangle(state.absoluteOffset.x, state.absoluteOffset.y, 0, 0);

          if (lw != null) {
            let tmp = (parseFloat(lw) + 2) * scale;
            this.bounds.width = tmp;
            this.bounds.x += m.x * tmp;
          }
        } else {
          let bds = wangRectangle.fromRectangle(state);
          let hpos = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_POSITION, wangConstants.ALIGN_CENTER);
          let vpos = wangUtils.getValue(
            state.style,
            wangConstants.STYLE_VERTICAL_LABEL_POSITION,
            wangConstants.ALIGN_MIDDLE
          );
          bds =
            state.shape != null && hpos == wangConstants.ALIGN_CENTER && vpos == wangConstants.ALIGN_MIDDLE
              ? state.shape.getLabelBounds(bds)
              : bds;

          if (lw != null) {
            bds.width = parseFloat(lw) * scale;
          }

          if (!state.view.graph.cellRenderer.legacySpacing || state.style[wangConstants.STYLE_OVERFLOW] != 'width') {
            let spacing = parseInt(state.style[wangConstants.STYLE_SPACING] || 2) * scale;
            let spacingTop =
              (parseInt(state.style[wangConstants.STYLE_SPACING_TOP] || 0) + wangText.baseSpacingTop) * scale + spacing;
            let spacingRight =
              (parseInt(state.style[wangConstants.STYLE_SPACING_RIGHT] || 0) + wangText.baseSpacingRight) * scale +
              spacing;
            let spacingBottom =
              (parseInt(state.style[wangConstants.STYLE_SPACING_BOTTOM] || 0) + wangText.baseSpacingBottom) * scale +
              spacing;
            let spacingLeft =
              (parseInt(state.style[wangConstants.STYLE_SPACING_LEFT] || 0) + wangText.baseSpacingLeft) * scale +
              spacing;
            let hpos = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_POSITION, wangConstants.ALIGN_CENTER);
            let vpos = wangUtils.getValue(
              state.style,
              wangConstants.STYLE_VERTICAL_LABEL_POSITION,
              wangConstants.ALIGN_MIDDLE
            );
            bds = new wangRectangle(
              bds.x + spacingLeft,
              bds.y + spacingTop,
              bds.width - (hpos == wangConstants.ALIGN_CENTER && lw == null ? spacingLeft + spacingRight : 0),
              bds.height - (vpos == wangConstants.ALIGN_MIDDLE ? spacingTop + spacingBottom : 0)
            );
          }

          this.bounds = new wangRectangle(
            bds.x + state.absoluteOffset.x,
            bds.y + state.absoluteOffset.y,
            bds.width,
            bds.height
          );
        }

        if (
          this.graph.isWrapping(state.cell) &&
          (this.bounds.width >= 2 || this.bounds.height >= 2) &&
          this.textarea.innerHTML != this.getEmptyLabelText()
        ) {
          this.textarea.style.wordWrap = wangConstants.WORD_WRAP;
          this.textarea.style.whiteSpace = 'normal';
          let tmp = Math.round(this.bounds.width / (document.documentMode == 8 ? scale : scale)) + this.wordWrapPadding;

          if (this.textarea.style.position != 'relative') {
            this.textarea.style.width = tmp + 'px';

            if (this.textarea.scrollWidth > tmp) {
              this.textarea.style.width = this.textarea.scrollWidth + 'px';
            }
          } else {
            this.textarea.style.maxWidth = tmp + 'px';
          }
        } else {
          this.textarea.style.whiteSpace = 'nowrap';
          this.textarea.style.width = '';
        }

        if (document.documentMode == 8) {
          this.textarea.style.zoom = '1';
          this.textarea.style.height = 'auto';
        }

        let ow = this.textarea.scrollWidth;
        let oh = this.textarea.scrollHeight;

        if (document.documentMode == 8) {
          this.textarea.style.left =
            Math.max(
              0,
              Math.ceil(
                (this.bounds.x -
                  m.x * (this.bounds.width - (ow + 1) * scale) +
                  ow * (scale - 1) * 0 +
                  (m.x + 0.5) * 2) /
                  scale
              )
            ) + 'px';
          this.textarea.style.top =
            Math.max(
              0,
              Math.ceil(
                (this.bounds.y -
                  m.y * (this.bounds.height - (oh + 0.5) * scale) +
                  oh * (scale - 1) * 0 +
                  Math.abs(m.y + 0.5) * 1) /
                  scale
              )
            ) + 'px';
          this.textarea.style.width = Math.round(ow * scale) + 'px';
          this.textarea.style.height = Math.round(oh * scale) + 'px';
        } else if (wangClient.IS_QUIRKS) {
          this.textarea.style.left =
            Math.max(
              0,
              Math.ceil(
                this.bounds.x - m.x * (this.bounds.width - (ow + 1) * scale) + ow * (scale - 1) * 0 + (m.x + 0.5) * 2
              )
            ) + 'px';
          this.textarea.style.top =
            Math.max(
              0,
              Math.ceil(
                this.bounds.y -
                  m.y * (this.bounds.height - (oh + 0.5) * scale) +
                  oh * (scale - 1) * 0 +
                  Math.abs(m.y + 0.5) * 1
              )
            ) + 'px';
        } else {
          this.textarea.style.left = Math.max(0, Math.round(this.bounds.x - m.x * (this.bounds.width - 2)) + 1) + 'px';
          this.textarea.style.top =
            Math.max(0, Math.round(this.bounds.y - m.y * (this.bounds.height - 4) + (m.y == -1 ? 3 : 0)) + 1) + 'px';
        }
      }

      wangUtils.setPrefixedStyle(this.textarea.style, 'transformOrigin', '0px 0px');
      wangUtils.setPrefixedStyle(
        this.textarea.style,
        'transform',
        'scale(' + scale + ',' + scale + ')' + (m == null ? '' : ' translate(' + m.x * 100 + '%,' + m.y * 100 + '%)')
      );
    }
  }

  focusLost() {
    this.stopEditing(!this.graph.isInvokesStopCellEditing());
  }

  getBackgroundColor(state) {
    return null;
  }

  isLegacyEditor() {
    let absoluteRoot = false;

    if (wangClient.IS_SVG) {
      let root = this.graph.view.getDrawPane().ownerSVGElement;

      if (root != null) {
        let css = wangUtils.getCurrentStyle(root);

        if (css != null) {
          absoluteRoot = css.position == 'absolute';
        }
      }
    }

    return !absoluteRoot;
  }

  startEditing(cell, trigger) {
    this.stopEditing(true);
    this.align = null;

    if (this.textarea == null) {
      this.init();
    }

    if (this.graph.tooltipHandler != null) {
      this.graph.tooltipHandler.hideTooltip();
    }

    let state = this.graph.getView().getState(cell);

    if (state != null) {
      let scale = this.graph.getView().scale;
      let size = wangUtils.getValue(state.style, wangConstants.STYLE_FONTSIZE, wangConstants.DEFAULT_FONTSIZE);
      let family = wangUtils.getValue(state.style, wangConstants.STYLE_FONTFAMILY, wangConstants.DEFAULT_FONTFAMILY);
      let color = wangUtils.getValue(state.style, wangConstants.STYLE_FONTCOLOR, 'black');
      let align = wangUtils.getValue(state.style, wangConstants.STYLE_ALIGN, wangConstants.ALIGN_LEFT);
      let bold =
        (wangUtils.getValue(state.style, wangConstants.STYLE_FONTSTYLE, 0) & wangConstants.FONT_BOLD) ==
        wangConstants.FONT_BOLD;
      let italic =
        (wangUtils.getValue(state.style, wangConstants.STYLE_FONTSTYLE, 0) & wangConstants.FONT_ITALIC) ==
        wangConstants.FONT_ITALIC;
      let txtDecor = [];

      if (
        (wangUtils.getValue(state.style, wangConstants.STYLE_FONTSTYLE, 0) & wangConstants.FONT_UNDERLINE) ==
        wangConstants.FONT_UNDERLINE
      ) {
        txtDecor.push('underline');
      }

      if (
        (wangUtils.getValue(state.style, wangConstants.STYLE_FONTSTYLE, 0) & wangConstants.FONT_STRIKETHROUGH) ==
        wangConstants.FONT_STRIKETHROUGH
      ) {
        txtDecor.push('line-through');
      }

      this.textarea.style.lineHeight = wangConstants.ABSOLUTE_LINE_HEIGHT
        ? Math.round(size * wangConstants.LINE_HEIGHT) + 'px'
        : wangConstants.LINE_HEIGHT;
      this.textarea.style.backgroundColor = this.getBackgroundColor(state);
      this.textarea.style.textDecoration = txtDecor.join(' ');
      this.textarea.style.fontWeight = bold ? 'bold' : 'normal';
      this.textarea.style.fontStyle = italic ? 'italic' : '';
      this.textarea.style.fontSize = Math.round(size) + 'px';
      this.textarea.style.zIndex = this.zIndex;
      this.textarea.style.fontFamily = family;
      this.textarea.style.textAlign = align;
      this.textarea.style.outline = 'none';
      this.textarea.style.color = color;
      let dir = (this.textDirection = wangUtils.getValue(
        state.style,
        wangConstants.STYLE_TEXT_DIRECTION,
        wangConstants.DEFAULT_TEXT_DIRECTION
      ));

      if (dir == wangConstants.TEXT_DIRECTION_AUTO) {
        if (
          state != null &&
          state.text != null &&
          state.text.dialect != wangConstants.DIALECT_STRICTHTML &&
          !wangUtils.isNode(state.text.value)
        ) {
          dir = state.text.getAutoDirection();
        }
      }

      if (dir == wangConstants.TEXT_DIRECTION_LTR || dir == wangConstants.TEXT_DIRECTION_RTL) {
        this.textarea.setAttribute('dir', dir);
      } else {
        this.textarea.removeAttribute('dir');
      }

      this.textarea.innerHTML = this.getInitialValue(state, trigger) || '';
      this.initialValue = this.textarea.innerHTML;

      if (this.textarea.innerHTML.length == 0 || this.textarea.innerHTML == '<br>') {
        this.textarea.innerHTML = this.getEmptyLabelText();
        this.clearOnChange = true;
      } else {
        this.clearOnChange = this.textarea.innerHTML == this.getEmptyLabelText();
      }

      this.graph.container.appendChild(this.textarea);
      this.editingCell = cell;
      this.trigger = trigger;
      this.textNode = null;

      if (state.text != null && this.isHideLabel(state)) {
        this.textNode = state.text.node;
        this.textNode.style.visibility = 'hidden';
      }

      if (
        this.autoSize &&
        (this.graph.model.isEdge(state.cell) || state.style[wangConstants.STYLE_OVERFLOW] != 'fill')
      ) {
        window.setTimeout(() => {
          this.resize();
        }, 0);
      }

      this.resize();

      try {
        this.textarea.focus();

        if (
          this.isSelectText() &&
          this.textarea.innerHTML.length > 0 &&
          (this.textarea.innerHTML != this.getEmptyLabelText() || !this.clearOnChange)
        ) {
          document.execCommand('selectAll', false, null);
        }
      } catch (e) {
        /* ignore */
      }
    }
  }

  isSelectText() {
    return this.selectText;
  }

  clearSelection() {
    let selection = null;

    if (window.getSelection) {
      selection = window.getSelection();
    } else if (document.selection) {
      selection = document.selection;
    }

    if (selection != null) {
      if (selection.empty) {
        selection.empty();
      } else if (selection.removeAllRanges) {
        selection.removeAllRanges();
      }
    }
  }

  stopEditing(cancel) {
    cancel = cancel || false;

    if (this.editingCell != null) {
      if (this.textNode != null) {
        this.textNode.style.visibility = 'visible';
        this.textNode = null;
      }

      let state = !cancel ? this.graph.view.getState(this.editingCell) : null;
      let initial = this.initialValue;
      this.initialValue = null;
      this.editingCell = null;
      this.trigger = null;
      this.bounds = null;
      this.textarea.blur();
      this.clearSelection();

      if (this.textarea.parentNode != null) {
        this.textarea.parentNode.removeChild(this.textarea);
      }

      if (this.clearOnChange && this.textarea.innerHTML == this.getEmptyLabelText()) {
        this.textarea.innerHTML = '';
        this.clearOnChange = false;
      }

      if (state != null && (this.textarea.innerHTML != initial || this.align != null)) {
        this.prepareTextarea();
        let value = this.getCurrentValue(state);
        this.graph.getModel().beginUpdate();

        try {
          if (value != null) {
            this.applyValue(state, value);
          }

          if (this.align != null) {
            this.graph.setCellStyles(wangConstants.STYLE_ALIGN, this.align, [state.cell]);
          }
        } finally {
          this.graph.getModel().endUpdate();
        }
      }

      wangEvent.release(this.textarea);
      this.textarea = null;
      this.align = null;
    }
  }

  prepareTextarea() {
    if (this.textarea.lastChild != null && this.textarea.lastChild.nodeName == 'BR') {
      this.textarea.removeChild(this.textarea.lastChild);
    }
  }

  isHideLabel(state) {
    return true;
  }

  getMinimumSize(state) {
    let scale = this.graph.getView().scale;
    return new wangRectangle(
      0,
      0,
      state.text == null ? 30 : state.text.size * scale + 20,
      this.textarea.style.textAlign == 'left' ? 120 : 40
    );
  }

  getEditorBounds(state) {
    let isEdge = this.graph.getModel().isEdge(state.cell);
    let scale = this.graph.getView().scale;
    let minSize = this.getMinimumSize(state);
    let minWidth = minSize.width;
    let minHeight = minSize.height;
    let result = null;

    if (!isEdge && state.view.graph.cellRenderer.legacySpacing && state.style[wangConstants.STYLE_OVERFLOW] == 'fill') {
      result = state.shape.getLabelBounds(wangRectangle.fromRectangle(state));
    } else {
      let spacing = parseInt(state.style[wangConstants.STYLE_SPACING] || 0) * scale;
      let spacingTop =
        (parseInt(state.style[wangConstants.STYLE_SPACING_TOP] || 0) + wangText.baseSpacingTop) * scale + spacing;
      let spacingRight =
        (parseInt(state.style[wangConstants.STYLE_SPACING_RIGHT] || 0) + wangText.baseSpacingRight) * scale + spacing;
      let spacingBottom =
        (parseInt(state.style[wangConstants.STYLE_SPACING_BOTTOM] || 0) + wangText.baseSpacingBottom) * scale + spacing;
      let spacingLeft =
        (parseInt(state.style[wangConstants.STYLE_SPACING_LEFT] || 0) + wangText.baseSpacingLeft) * scale + spacing;
      result = new wangRectangle(
        state.x,
        state.y,
        Math.max(minWidth, state.width - spacingLeft - spacingRight),
        Math.max(minHeight, state.height - spacingTop - spacingBottom)
      );
      let hpos = wangUtils.getValue(state.style, wangConstants.STYLE_LABEL_POSITION, wangConstants.ALIGN_CENTER);
      let vpos = wangUtils.getValue(
        state.style,
        wangConstants.STYLE_VERTICAL_LABEL_POSITION,
        wangConstants.ALIGN_MIDDLE
      );
      result =
        state.shape != null && hpos == wangConstants.ALIGN_CENTER && vpos == wangConstants.ALIGN_MIDDLE
          ? state.shape.getLabelBounds(result)
          : result;

      if (isEdge) {
        result.x = state.absoluteOffset.x;
        result.y = state.absoluteOffset.y;

        if (state.text != null && state.text.boundingBox != null) {
          if (state.text.boundingBox.x > 0) {
            result.x = state.text.boundingBox.x;
          }

          if (state.text.boundingBox.y > 0) {
            result.y = state.text.boundingBox.y;
          }
        }
      } else if (state.text != null && state.text.boundingBox != null) {
        result.x = Math.min(result.x, state.text.boundingBox.x);
        result.y = Math.min(result.y, state.text.boundingBox.y);
      }

      result.x += spacingLeft;
      result.y += spacingTop;

      if (state.text != null && state.text.boundingBox != null) {
        if (!isEdge) {
          result.width = Math.max(result.width, state.text.boundingBox.width);
          result.height = Math.max(result.height, state.text.boundingBox.height);
        } else {
          result.width = Math.max(minWidth, state.text.boundingBox.width);
          result.height = Math.max(minHeight, state.text.boundingBox.height);
        }
      }

      if (this.graph.getModel().isVertex(state.cell)) {
        let horizontal = wangUtils.getValue(
          state.style,
          wangConstants.STYLE_LABEL_POSITION,
          wangConstants.ALIGN_CENTER
        );

        if (horizontal == wangConstants.ALIGN_LEFT) {
          result.x -= state.width;
        } else if (horizontal == wangConstants.ALIGN_RIGHT) {
          result.x += state.width;
        }

        let vertical = wangUtils.getValue(
          state.style,
          wangConstants.STYLE_VERTICAL_LABEL_POSITION,
          wangConstants.ALIGN_MIDDLE
        );

        if (vertical == wangConstants.ALIGN_TOP) {
          result.y -= state.height;
        } else if (vertical == wangConstants.ALIGN_BOTTOM) {
          result.y += state.height;
        }
      }
    }

    return new wangRectangle(
      Math.round(result.x),
      Math.round(result.y),
      Math.round(result.width),
      Math.round(result.height)
    );
  }

  getEmptyLabelText(cell) {
    return this.emptyLabelText;
  }

  getEditingCell() {
    return this.editingCell;
  }

  destroy() {
    if (this.textarea != null) {
      wangEvent.release(this.textarea);

      if (this.textarea.parentNode != null) {
        this.textarea.parentNode.removeChild(this.textarea);
      }

      this.textarea = null;
    }

    if (this.changeHandler != null) {
      this.graph.getModel().removeListener(this.changeHandler);
      this.changeHandler = null;
    }

    if (this.zoomHandler) {
      this.graph.view.removeListener(this.zoomHandler);
      this.zoomHandler = null;
    }
  }
}
