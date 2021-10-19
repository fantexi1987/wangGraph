import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangClient } from '@wangGraph/wangClient';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangImageShape extends wangRectangleShape {
  preserveImageAspect = true;

  constructor(bounds, image, fill, stroke, strokewidth) {
    super();
    this.bounds = bounds;
    this.image = image;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
    this.shadow = false;
  }

  getSvgScreenOffset() {
    return 0;
  }

  apply(state) {
    super.apply(state);
    this.fill = null;
    this.stroke = null;
    this.gradient = null;

    if (this.style != null) {
      this.preserveImageAspect = wangUtils.getNumber(this.style, wangConstants.STYLE_IMAGE_ASPECT, 1) == 1;
      this.flipH = this.flipH || wangUtils.getValue(this.style, 'imageFlipH', 0) == 1;
      this.flipV = this.flipV || wangUtils.getValue(this.style, 'imageFlipV', 0) == 1;
    }
  }

  isHtmlAllowed() {
    return !this.preserveImageAspect;
  }

  createHtml() {
    let node = document.createElement('div');
    node.style.position = 'absolute';
    return node;
  }

  isRoundable(c, x, y, w, h) {
    return false;
  }

  paintVertexShape(c, x, y, w, h) {
    if (this.image != null) {
      let fill = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_BACKGROUND, null);
      let stroke = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_BORDER, null);

      if (fill != null) {
        c.setFillColor(fill);
        c.setStrokeColor(stroke);
        c.rect(x, y, w, h);
        c.fillAndStroke();
      }

      c.image(x, y, w, h, this.image, this.preserveImageAspect, false, false);
      stroke = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_BORDER, null);

      if (stroke != null) {
        c.setShadow(false);
        c.setStrokeColor(stroke);
        c.rect(x, y, w, h);
        c.stroke();
      }
    } else {
      super.paintBackground(c, x, y, w, h);
    }
  }

  redrawHtmlShape() {
    this.node.style.left = Math.round(this.bounds.x) + 'px';
    this.node.style.top = Math.round(this.bounds.y) + 'px';
    this.node.style.width = Math.max(0, Math.round(this.bounds.width)) + 'px';
    this.node.style.height = Math.max(0, Math.round(this.bounds.height)) + 'px';
    this.node.innerHTML = '';

    if (this.image != null) {
      let fill = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_BACKGROUND, '');
      let stroke = wangUtils.getValue(this.style, wangConstants.STYLE_IMAGE_BORDER, '');
      this.node.style.backgroundColor = fill;
      this.node.style.borderColor = stroke;
      let useVml = this.rotation != 0;
      let img = document.createElement(useVml ? wangClient.VML_PREFIX + ':image' : 'img');
      img.setAttribute('border', '0');
      img.style.position = 'absolute';
      img.src = this.image;
      let filter = this.opacity < 100 ? 'alpha(opacity=' + this.opacity + ')' : '';
      this.node.style.filter = filter;

      if (this.flipH && this.flipV) {
        filter += 'progid:DXImageTransform.Microsoft.BasicImage(rotation=2)';
      } else if (this.flipH) {
        filter += 'progid:DXImageTransform.Microsoft.BasicImage(mirror=1)';
      } else if (this.flipV) {
        filter += 'progid:DXImageTransform.Microsoft.BasicImage(rotation=2, mirror=1)';
      }

      if (img.style.filter != filter) {
        img.style.filter = filter;
      }

      if (img.nodeName == 'image') {
        img.style.rotation = this.rotation;
      } else if (this.rotation != 0) {
        wangUtils.setPrefixedStyle(img.style, 'transform', 'rotate(' + this.rotation + 'deg)');
      } else {
        wangUtils.setPrefixedStyle(img.style, 'transform', '');
      }

      img.style.width = this.node.style.width;
      img.style.height = this.node.style.height;
      this.node.style.backgroundImage = '';
      this.node.appendChild(img);
    } else {
      this.setTransparentBackgroundImage(this.node);
    }
  }
}
