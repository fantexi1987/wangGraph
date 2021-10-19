import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangPerimeter } from '@wangGraph/view/wangPerimeter';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangStylesheet {
  constructor() {
    this.styles = new Object();
    this.putDefaultVertexStyle(this.createDefaultVertexStyle());
    this.putDefaultEdgeStyle(this.createDefaultEdgeStyle());
  }

  createDefaultVertexStyle() {
    let style = new Object();
    style[wangConstants.STYLE_SHAPE] = wangConstants.SHAPE_RECTANGLE;
    style[wangConstants.STYLE_PERIMETER] = wangPerimeter.RectanglePerimeter;
    style[wangConstants.STYLE_VERTICAL_ALIGN] = wangConstants.ALIGN_MIDDLE;
    style[wangConstants.STYLE_ALIGN] = wangConstants.ALIGN_CENTER;
    style[wangConstants.STYLE_FILLCOLOR] = '#C3D9FF';
    style[wangConstants.STYLE_STROKECOLOR] = '#6482B9';
    style[wangConstants.STYLE_FONTCOLOR] = '#774400';
    return style;
  }

  createDefaultEdgeStyle() {
    let style = new Object();
    style[wangConstants.STYLE_SHAPE] = wangConstants.SHAPE_CONNECTOR;
    style[wangConstants.STYLE_ENDARROW] = wangConstants.ARROW_CLASSIC;
    style[wangConstants.STYLE_VERTICAL_ALIGN] = wangConstants.ALIGN_MIDDLE;
    style[wangConstants.STYLE_ALIGN] = wangConstants.ALIGN_CENTER;
    style[wangConstants.STYLE_STROKECOLOR] = '#6482B9';
    style[wangConstants.STYLE_FONTCOLOR] = '#446299';
    return style;
  }

  putDefaultVertexStyle(style) {
    this.putCellStyle('defaultVertex', style);
  }

  putDefaultEdgeStyle(style) {
    this.putCellStyle('defaultEdge', style);
  }

  getDefaultVertexStyle() {
    return this.styles['defaultVertex'];
  }

  getDefaultEdgeStyle() {
    return this.styles['defaultEdge'];
  }

  putCellStyle(name, style) {
    this.styles[name] = style;
  }

  getCellStyle(name, defaultStyle) {
    let style = defaultStyle;

    if (name != null && name.length > 0) {
      let pairs = name.split(';');

      if (style != null && name.charAt(0) != ';') {
        style = wangUtils.clone(style);
      } else {
        style = new Object();
      }

      for (let i = 0; i < pairs.length; i++) {
        let tmp = pairs[i];
        let pos = tmp.indexOf('=');

        if (pos >= 0) {
          let key = tmp.substring(0, pos);
          let value = tmp.substring(pos + 1);

          if (value == wangConstants.NONE) {
            delete style[key];
          } else if (wangUtils.isNumeric(value)) {
            style[key] = parseFloat(value);
          } else {
            style[key] = value;
          }
        } else {
          let tmpStyle = this.styles[tmp];

          if (tmpStyle != null) {
            for (let key in tmpStyle) {
              style[key] = tmpStyle[key];
            }
          }
        }
      }
    }

    return style;
  }
}
