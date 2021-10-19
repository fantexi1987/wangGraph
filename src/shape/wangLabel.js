import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';

export class wangLabel extends wangRectangleShape {
  static imageSize = wangConstants.DEFAULT_IMAGESIZE;
  spacing = 2;
  indicatorSize = 10;
  indicatorSpacing = 2;

  constructor(bounds, fill, stroke, strokewidth) {
    super(bounds, fill, stroke, strokewidth);
  }

  init(container) {
    super.init(container);

    if (this.indicatorShape != null) {
      this.indicator = new this.indicatorShape();
      this.indicator.dialect = this.dialect;
      this.indicator.init(this.node);
    }
  }

  redraw() {
    if (this.indicator != null) {
      this.indicator.fill = this.indicatorColor;
      this.indicator.stroke = this.indicatorStrokeColor;
      this.indicator.gradient = this.indicatorGradientColor;
      this.indicator.direction = this.indicatorDirection;
      this.indicator.redraw();
    }

    super.redraw();
  }

  isHtmlAllowed() {
    return super.isHtmlAllowed() && this.indicatorColor == null && this.indicatorShape == null;
  }

  paintForeground(c, x, y, w, h) {
    this.paintImage(c, x, y, w, h);
    this.paintIndicator(c, x, y, w, h);
    super.paintForeground(c, x, y, w, h);
  }

  paintImage(c, x, y, w, h) {
    if (this.image != null) {
      let bounds = this.getImageBounds(x, y, w, h);
      c.image(bounds.x, bounds.y, bounds.width, bounds.height, this.image, false, false, false);
    }
  }

  getImageBounds(x, y, w, h) {
    let align = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_ALIGN, wangConstants.ALIGN_LEFT);
    let valign = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_VERTICAL_ALIGN, wangConstants.ALIGN_MIDDLE);
    let width = wangUtils.getNumber(this.style, wangConstants.STYLE_IMAGE_WIDTH, wangConstants.DEFAULT_IMAGESIZE);
    let height = wangUtils.getNumber(this.style, wangConstants.STYLE_IMAGE_HEIGHT, wangConstants.DEFAULT_IMAGESIZE);
    let spacing = wangUtils.getNumber(this.style, wangConstants.STYLE_SPACING, this.spacing) + 5;

    if (align == wangConstants.ALIGN_CENTER) {
      x += (w - width) / 2;
    } else if (align == wangConstants.ALIGN_RIGHT) {
      x += w - width - spacing;
    } else {
      x += spacing;
    }

    if (valign == wangConstants.ALIGN_TOP) {
      y += spacing;
    } else if (valign == wangConstants.ALIGN_BOTTOM) {
      y += h - height - spacing;
    } else {
      y += (h - height) / 2;
    }

    return new wangRectangle(x, y, width, height);
  }

  paintIndicator(c, x, y, w, h) {
    if (this.indicator != null) {
      this.indicator.bounds = this.getIndicatorBounds(x, y, w, h);
      this.indicator.paint(c);
    } else if (this.indicatorImage != null) {
      let bounds = this.getIndicatorBounds(x, y, w, h);
      c.image(bounds.x, bounds.y, bounds.width, bounds.height, this.indicatorImage, false, false, false);
    }
  }

  getIndicatorBounds(x, y, w, h) {
    let align = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_ALIGN, wangConstants.ALIGN_LEFT);
    let valign = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_VERTICAL_ALIGN, wangConstants.ALIGN_MIDDLE);
    let width = wangUtils.getNumber(this.style, wangConstants.STYLE_INDICATOR_WIDTH, this.indicatorSize);
    let height = wangUtils.getNumber(this.style, wangConstants.STYLE_INDICATOR_HEIGHT, this.indicatorSize);
    let spacing = this.spacing + 5;

    if (align == wangConstants.ALIGN_RIGHT) {
      x += w - width - spacing;
    } else if (align == wangConstants.ALIGN_CENTER) {
      x += (w - width) / 2;
    } else {
      x += spacing;
    }

    if (valign == wangConstants.ALIGN_BOTTOM) {
      y += h - height - spacing;
    } else if (valign == wangConstants.ALIGN_TOP) {
      y += spacing;
    } else {
      y += (h - height) / 2;
    }

    return new wangRectangle(x, y, width, height);
  }

  redrawHtmlShape() {
    super.redrawHtmlShape();

    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }

    if (this.image != null) {
      let node = document.createElement('img');
      node.style.position = 'relative';
      node.setAttribute('border', '0');
      let bounds = this.getImageBounds(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
      bounds.x -= this.bounds.x;
      bounds.y -= this.bounds.y;
      node.style.left = Math.round(bounds.x) + 'px';
      node.style.top = Math.round(bounds.y) + 'px';
      node.style.width = Math.round(bounds.width) + 'px';
      node.style.height = Math.round(bounds.height) + 'px';
      node.src = this.image;
      this.node.appendChild(node);
    }
  }
}
