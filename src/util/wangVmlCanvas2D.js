import { wangAbstractCanvas2D } from '@wangGraph/util/wangAbstractCanvas2D';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangClient } from '@wangGraph/wangClient';

export class wangVmlCanvas2D extends wangAbstractCanvas2D {
  node = null;
  textEnabled = true;
  moveOp = 'm';
  lineOp = 'l';
  curveOp = 'c';
  closeOp = 'x';
  rotatedHtmlBackground = '';
  vmlScale = 1;

  constructor(root) {
    super();
    this.root = root;
  }

  createElement(name) {
    return document.createElement(name);
  }

  createVmlElement(name) {
    return this.createElement(wangClient.VML_PREFIX + ':' + name);
  }

  addNode(filled, stroked) {
    let node = this.node;
    let s = this.state;

    if (node != null) {
      if (node.nodeName == 'shape') {
        if (this.path != null && this.path.length > 0) {
          node.path = this.path.join(' ') + ' e';
          node.style.width = this.root.style.width;
          node.style.height = this.root.style.height;
          node.coordsize = parseInt(node.style.width) + ' ' + parseInt(node.style.height);
        } else {
          return;
        }
      }

      node.strokeweight = this.format(Math.max(1, (s.strokeWidth * s.scale) / this.vmlScale)) + 'px';

      if (s.shadow) {
        this.root.appendChild(this.createShadow(node, filled && s.fillColor != null, stroked && s.strokeColor != null));
      }

      if (stroked && s.strokeColor != null) {
        node.stroked = 'true';
        node.strokecolor = s.strokeColor;
      } else {
        node.stroked = 'false';
      }

      node.appendChild(this.createStroke());

      if (filled && s.fillColor != null) {
        node.appendChild(this.createFill());
      } else if (this.pointerEvents && (node.nodeName != 'shape' || this.path[this.path.length - 1] == this.closeOp)) {
        node.appendChild(this.createTransparentFill());
      } else {
        node.filled = 'false';
      }

      this.root.appendChild(node);
    }
  }

  createTransparentFill() {
    let fill = this.createVmlElement('fill');
    fill.src = wangClient.imageBasePath + '/transparent.gif';
    fill.type = 'tile';
    return fill;
  }

  createFill() {
    let s = this.state;
    let fill = this.createVmlElement('fill');
    fill.color = s.fillColor;

    if (s.gradientColor != null) {
      fill.type = 'gradient';
      fill.method = 'none';
      fill.color2 = s.gradientColor;
      let angle = 180 - s.rotation;

      if (s.gradientDirection == wangConstants.DIRECTION_WEST) {
        angle -= 90 + (this.root.style.flip == 'x' ? 180 : 0);
      } else if (s.gradientDirection == wangConstants.DIRECTION_EAST) {
        angle += 90 + (this.root.style.flip == 'x' ? 180 : 0);
      } else if (s.gradientDirection == wangConstants.DIRECTION_NORTH) {
        angle -= 180 + (this.root.style.flip == 'y' ? -180 : 0);
      } else {
        angle += this.root.style.flip == 'y' ? -180 : 0;
      }

      if (this.root.style.flip == 'x' || this.root.style.flip == 'y') {
        angle *= -1;
      }

      fill.angle = wangUtils.mod(angle, 360);
      fill.opacity = s.alpha * s.gradientFillAlpha * 100 + '%';
      fill.setAttribute(wangClient.OFFICE_PREFIX + ':opacity2', s.alpha * s.gradientAlpha * 100 + '%');
    } else if (s.alpha < 1 || s.fillAlpha < 1) {
      fill.opacity = s.alpha * s.fillAlpha * 100 + '%';
    }

    return fill;
  }

  createStroke() {
    let s = this.state;
    let stroke = this.createVmlElement('stroke');
    stroke.endcap = s.lineCap || 'flat';
    stroke.joinstyle = s.lineJoin || 'miter';
    stroke.miterlimit = s.miterLimit || '10';

    if (s.alpha < 1 || s.strokeAlpha < 1) {
      stroke.opacity = s.alpha * s.strokeAlpha * 100 + '%';
    }

    if (s.dashed) {
      stroke.dashstyle = this.getVmlDashStyle();
    }

    return stroke;
  }

  getVmlDashStyle() {
    let result = 'dash';

    if (typeof this.state.dashPattern === 'string') {
      let tok = this.state.dashPattern.split(' ');

      if (tok.length > 0 && tok[0] == 1) {
        result = '0 2';
      }
    }

    return result;
  }

  createShadow(node, filled, stroked) {
    let s = this.state;
    let rad = -s.rotation * (Math.PI / 180);
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);
    let dx = s.shadowDx * s.scale;
    let dy = s.shadowDy * s.scale;

    if (this.root.style.flip == 'x') {
      dx *= -1;
    } else if (this.root.style.flip == 'y') {
      dy *= -1;
    }

    let shadow = node.cloneNode(true);
    shadow.style.marginLeft = Math.round(dx * cos - dy * sin) + 'px';
    shadow.style.marginTop = Math.round(dx * sin + dy * cos) + 'px';

    if (document.documentMode == 8) {
      shadow.strokeweight = node.strokeweight;

      if (node.nodeName == 'shape') {
        shadow.path = this.path.join(' ') + ' e';
        shadow.style.width = this.root.style.width;
        shadow.style.height = this.root.style.height;
        shadow.coordsize = parseInt(node.style.width) + ' ' + parseInt(node.style.height);
      }
    }

    if (stroked) {
      shadow.strokecolor = s.shadowColor;
      shadow.appendChild(this.createShadowStroke());
    } else {
      shadow.stroked = 'false';
    }

    if (filled) {
      shadow.appendChild(this.createShadowFill());
    } else {
      shadow.filled = 'false';
    }

    return shadow;
  }

  createShadowFill() {
    let fill = this.createVmlElement('fill');
    fill.color = this.state.shadowColor;
    fill.opacity = this.state.alpha * this.state.shadowAlpha * 100 + '%';
    return fill;
  }

  createShadowStroke() {
    let stroke = this.createStroke();
    stroke.opacity = this.state.alpha * this.state.shadowAlpha * 100 + '%';
    return stroke;
  }

  rotate(theta, flipH, flipV, cx, cy) {
    if (flipH && flipV) {
      theta += 180;
    } else if (flipH) {
      this.root.style.flip = 'x';
    } else if (flipV) {
      this.root.style.flip = 'y';
    }

    if (flipH ? !flipV : flipV) {
      theta *= -1;
    }

    this.root.style.rotation = theta;
    this.state.rotation = this.state.rotation + theta;
    this.state.rotationCx = cx;
    this.state.rotationCy = cy;
  }

  begin() {
    super.begin();
    this.node = this.createVmlElement('shape');
    this.node.style.position = 'absolute';
  }

  quadTo(x1, y1, x2, y2) {
    let s = this.state;
    let cpx0 = (this.lastX + s.dx) * s.scale;
    let cpy0 = (this.lastY + s.dy) * s.scale;
    let qpx1 = (x1 + s.dx) * s.scale;
    let qpy1 = (y1 + s.dy) * s.scale;
    let cpx3 = (x2 + s.dx) * s.scale;
    let cpy3 = (y2 + s.dy) * s.scale;
    let cpx1 = cpx0 + (2 / 3) * (qpx1 - cpx0);
    let cpy1 = cpy0 + (2 / 3) * (qpy1 - cpy0);
    let cpx2 = cpx3 + (2 / 3) * (qpx1 - cpx3);
    let cpy2 = cpy3 + (2 / 3) * (qpy1 - cpy3);
    this.path.push(
      'c ' +
        this.format(cpx1) +
        ' ' +
        this.format(cpy1) +
        ' ' +
        this.format(cpx2) +
        ' ' +
        this.format(cpy2) +
        ' ' +
        this.format(cpx3) +
        ' ' +
        this.format(cpy3)
    );
    this.lastX = cpx3 / s.scale - s.dx;
    this.lastY = cpy3 / s.scale - s.dy;
  }

  createRect(nodeName, x, y, w, h) {
    let s = this.state;
    let n = this.createVmlElement(nodeName);
    n.style.position = 'absolute';
    n.style.left = this.format((x + s.dx) * s.scale) + 'px';
    n.style.top = this.format((y + s.dy) * s.scale) + 'px';
    n.style.width = this.format(w * s.scale) + 'px';
    n.style.height = this.format(h * s.scale) + 'px';
    return n;
  }

  rect(x, y, w, h) {
    this.node = this.createRect('rect', x, y, w, h);
  }

  roundrect(x, y, w, h, dx, dy) {
    this.node = this.createRect('roundrect', x, y, w, h);
    this.node.setAttribute('arcsize', Math.max((dx * 100) / w, (dy * 100) / h) + '%');
  }

  ellipse(x, y, w, h) {
    this.node = this.createRect('oval', x, y, w, h);
  }

  image(x, y, w, h, src, aspect, flipH, flipV) {
    let node = null;

    if (!aspect) {
      node = this.createRect('image', x, y, w, h);
      node.src = src;
    } else {
      node = this.createRect('rect', x, y, w, h);
      node.stroked = 'false';
      let fill = this.createVmlElement('fill');
      fill.aspect = aspect ? 'atmost' : 'ignore';
      fill.rotate = 'true';
      fill.type = 'frame';
      fill.src = src;
      node.appendChild(fill);
    }

    if (flipH && flipV) {
      node.style.rotation = '180';
    } else if (flipH) {
      node.style.flip = 'x';
    } else if (flipV) {
      node.style.flip = 'y';
    }

    if (this.state.alpha < 1 || this.state.fillAlpha < 1) {
      node.style.filter += 'alpha(opacity=' + this.state.alpha * this.state.fillAlpha * 100 + ')';
    }

    this.root.appendChild(node);
  }

  createDiv(str, align, valign, overflow) {
    let div = this.createElement('div');
    let state = this.state;
    let css = '';

    if (state.fontBackgroundColor != null) {
      css += 'background-color:' + wangUtils.htmlEntities(state.fontBackgroundColor) + ';';
    }

    if (state.fontBorderColor != null) {
      css += 'border:1px solid ' + wangUtils.htmlEntities(state.fontBorderColor) + ';';
    }

    if (wangUtils.isNode(str)) {
      div.appendChild(str);
    } else {
      if (overflow != 'fill' && overflow != 'width') {
        let div2 = this.createElement('div');
        div2.style.cssText = css;
        div2.style.display = wangClient.IS_QUIRKS ? 'inline' : 'inline-block';
        div2.style.zoom = '1';
        div2.style.textDecoration = 'inherit';
        div2.innerHTML = str;
        div.appendChild(div2);
      } else {
        div.style.cssText = css;
        div.innerHTML = str;
      }
    }

    let style = div.style;
    style.fontSize = state.fontSize / this.vmlScale + 'px';
    style.fontFamily = state.fontFamily;
    style.color = state.fontColor;
    style.verticalAlign = 'top';
    style.textAlign = align || 'left';
    style.lineHeight = wangConstants.ABSOLUTE_LINE_HEIGHT
      ? (state.fontSize * wangConstants.LINE_HEIGHT) / this.vmlScale + 'px'
      : wangConstants.LINE_HEIGHT;

    if ((state.fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
      style.fontWeight = 'bold';
    }

    if ((state.fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
      style.fontStyle = 'italic';
    }

    if ((state.fontStyle & wangConstants.FONT_UNDERLINE) == wangConstants.FONT_UNDERLINE) {
      style.textDecoration = 'underline';
    }

    return div;
  }

  text(x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation, dir) {
    if (this.textEnabled && str != null) {
      let s = this.state;

      if (format == 'html') {
        if (s.rotation != null) {
          let pt = this.rotatePoint(x, y, s.rotation, s.rotationCx, s.rotationCy);
          x = pt.x;
          y = pt.y;
        }

        if (document.documentMode == 8 && !wangClient.IS_EM) {
          x += s.dx;
          y += s.dy;

          if (overflow != 'fill' && valign == wangConstants.ALIGN_TOP) {
            y -= 1;
          }
        } else {
          x *= s.scale;
          y *= s.scale;
        }

        let abs =
          document.documentMode == 8 && !wangClient.IS_EM ? this.createVmlElement('group') : this.createElement('div');
        abs.style.position = 'absolute';
        abs.style.display = 'inline';
        abs.style.left = this.format(x) + 'px';
        abs.style.top = this.format(y) + 'px';
        abs.style.zoom = s.scale;
        let box = this.createElement('div');
        box.style.position = 'relative';
        box.style.display = 'inline';
        let margin = wangUtils.getAlignmentAsPoint(align, valign);
        let dx = margin.x;
        let dy = margin.y;
        let div = this.createDiv(str, align, valign, overflow);
        let inner = this.createElement('div');

        if (dir != null) {
          div.setAttribute('dir', dir);
        }

        if (wrap && w > 0) {
          if (!clip) {
            div.style.width = Math.round(w) + 'px';
          }

          div.style.wordWrap = wangConstants.WORD_WRAP;
          div.style.whiteSpace = 'normal';

          if (div.style.wordWrap == 'break-word') {
            let tmp = div;

            if (tmp.firstChild != null && tmp.firstChild.nodeName == 'DIV') {
              tmp.firstChild.style.width = '100%';
            }
          }
        } else {
          div.style.whiteSpace = 'nowrap';
        }

        let rot = s.rotation + (rotation || 0);

        if (this.rotateHtml && rot != 0) {
          inner.style.display = 'inline';
          inner.style.zoom = '1';
          inner.appendChild(div);

          if (document.documentMode == 8 && !wangClient.IS_EM && this.root.nodeName != 'DIV') {
            box.appendChild(inner);
            abs.appendChild(box);
          } else {
            abs.appendChild(inner);
          }
        } else if (document.documentMode == 8 && !wangClient.IS_EM) {
          box.appendChild(div);
          abs.appendChild(box);
        } else {
          div.style.display = 'inline';
          abs.appendChild(div);
        }

        if (this.root.nodeName != 'DIV') {
          let rect = this.createVmlElement('rect');
          rect.stroked = 'false';
          rect.filled = 'false';
          rect.appendChild(abs);
          this.root.appendChild(rect);
        } else {
          this.root.appendChild(abs);
        }

        if (clip) {
          div.style.overflow = 'hidden';
          div.style.width = Math.round(w) + 'px';

          if (!wangClient.IS_QUIRKS) {
            div.style.maxHeight = Math.round(h) + 'px';
          }
        } else if (overflow == 'fill') {
          div.style.overflow = 'hidden';
          div.style.width = Math.max(0, w) + 1 + 'px';
          div.style.height = Math.max(0, h) + 1 + 'px';
        } else if (overflow == 'width') {
          div.style.overflow = 'hidden';
          div.style.width = Math.max(0, w) + 1 + 'px';
          div.style.maxHeight = Math.max(0, h) + 1 + 'px';
        }

        if (this.rotateHtml && rot != 0) {
          let rad = rot * (Math.PI / 180);
          let real_cos = parseFloat(parseFloat(Math.cos(rad)).toFixed(8));
          let real_sin = parseFloat(parseFloat(Math.sin(-rad)).toFixed(8));
          rad %= 2 * Math.PI;
          if (rad < 0) rad += 2 * Math.PI;
          rad %= Math.PI;
          if (rad > Math.PI / 2) rad = Math.PI - rad;
          let cos = Math.cos(rad);
          let sin = Math.sin(rad);

          if (document.documentMode == 8 && !wangClient.IS_EM) {
            div.style.display = 'inline-block';
            inner.style.display = 'inline-block';
            box.style.display = 'inline-block';
          }

          div.style.visibility = 'hidden';
          div.style.position = 'absolute';
          document.body.appendChild(div);
          let sizeDiv = div;

          if (sizeDiv.firstChild != null && sizeDiv.firstChild.nodeName == 'DIV') {
            sizeDiv = sizeDiv.firstChild;
          }

          let tmp = sizeDiv.offsetWidth + 3;
          let oh = sizeDiv.offsetHeight;

          if (clip) {
            w = Math.min(w, tmp);
            oh = Math.min(oh, h);
          } else {
            w = tmp;
          }

          if (wrap) {
            div.style.width = w + 'px';
          }

          if (wangClient.IS_QUIRKS && (clip || overflow == 'width') && oh > h) {
            oh = h;
            div.style.height = oh + 'px';
          }

          h = oh;
          let top_fix = (h - h * cos + w * -sin) / 2 - real_sin * w * (dx + 0.5) + real_cos * h * (dy + 0.5);
          let left_fix = (w - w * cos + h * -sin) / 2 + real_cos * w * (dx + 0.5) + real_sin * h * (dy + 0.5);

          if (abs.nodeName == 'group' && this.root.nodeName == 'DIV') {
            let pos = this.createElement('div');
            pos.style.display = 'inline-block';
            pos.style.position = 'absolute';
            pos.style.left = this.format(x + (left_fix - w / 2) * s.scale) + 'px';
            pos.style.top = this.format(y + (top_fix - h / 2) * s.scale) + 'px';
            abs.parentNode.appendChild(pos);
            pos.appendChild(abs);
          } else {
            let sc = document.documentMode == 8 && !wangClient.IS_EM ? 1 : s.scale;
            abs.style.left = this.format(x + (left_fix - w / 2) * sc) + 'px';
            abs.style.top = this.format(y + (top_fix - h / 2) * sc) + 'px';
          }

          inner.style.filter =
            'progid:DXImageTransform.Microsoft.Matrix(M11=' +
            real_cos +
            ', M12=' +
            real_sin +
            ', M21=' +
            -real_sin +
            ', M22=' +
            real_cos +
            ", sizingMethod='auto expand')";
          inner.style.backgroundColor = this.rotatedHtmlBackground;

          if (this.state.alpha < 1) {
            inner.style.filter += 'alpha(opacity=' + this.state.alpha * 100 + ')';
          }

          inner.appendChild(div);
          div.style.position = '';
          div.style.visibility = '';
        } else if (document.documentMode != 8 || wangClient.IS_EM) {
          div.style.verticalAlign = 'top';

          if (this.state.alpha < 1) {
            abs.style.filter = 'alpha(opacity=' + this.state.alpha * 100 + ')';
          }

          let divParent = div.parentNode;
          div.style.visibility = 'hidden';
          document.body.appendChild(div);
          w = div.offsetWidth;
          let oh = div.offsetHeight;

          if (wangClient.IS_QUIRKS && clip && oh > h) {
            oh = h;
            div.style.height = oh + 'px';
          }

          h = oh;
          div.style.visibility = '';
          divParent.appendChild(div);
          abs.style.left = this.format(x + w * dx * this.state.scale) + 'px';
          abs.style.top = this.format(y + h * dy * this.state.scale) + 'px';
        } else {
          if (this.state.alpha < 1) {
            div.style.filter = 'alpha(opacity=' + this.state.alpha * 100 + ')';
          }

          box.style.left = dx * 100 + '%';
          box.style.top = dy * 100 + '%';
        }
      } else {
        this.plainText(
          x,
          y,
          w,
          h,
          wangUtils.htmlEntities(str, false),
          align,
          valign,
          wrap,
          format,
          overflow,
          clip,
          rotation,
          dir
        );
      }
    }
  }

  plainText(x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation, dir) {
    let s = this.state;
    x = (x + s.dx) * s.scale;
    y = (y + s.dy) * s.scale;
    let node = this.createVmlElement('shape');
    node.style.width = '1px';
    node.style.height = '1px';
    node.stroked = 'false';
    let fill = this.createVmlElement('fill');
    fill.color = s.fontColor;
    fill.opacity = s.alpha * 100 + '%';
    node.appendChild(fill);
    let path = this.createVmlElement('path');
    path.textpathok = 'true';
    path.v = 'm ' + this.format(0) + ' ' + this.format(0) + ' l ' + this.format(1) + ' ' + this.format(0);
    node.appendChild(path);
    let tp = this.createVmlElement('textpath');
    tp.style.cssText = 'v-text-align:' + align;
    tp.style.align = align;
    tp.style.fontFamily = s.fontFamily;
    tp.string = str;
    tp.on = 'true';
    let size = (s.fontSize * s.scale) / this.vmlScale;
    tp.style.fontSize = size + 'px';

    if ((s.fontStyle & wangConstants.FONT_BOLD) == wangConstants.FONT_BOLD) {
      tp.style.fontWeight = 'bold';
    }

    if ((s.fontStyle & wangConstants.FONT_ITALIC) == wangConstants.FONT_ITALIC) {
      tp.style.fontStyle = 'italic';
    }

    if ((s.fontStyle & wangConstants.FONT_UNDERLINE) == wangConstants.FONT_UNDERLINE) {
      tp.style.textDecoration = 'underline';
    }

    let lines = str.split('\n');
    let textHeight = size + (lines.length - 1) * size * wangConstants.LINE_HEIGHT;
    let dx = 0;
    let dy = 0;

    if (valign == wangConstants.ALIGN_BOTTOM) {
      dy = -textHeight / 2;
    } else if (valign != wangConstants.ALIGN_MIDDLE) {
      dy = textHeight / 2;
    }

    if (rotation != null) {
      node.style.rotation = rotation;
      let rad = rotation * (Math.PI / 180);
      dx = Math.sin(rad) * dy;
      dy = Math.cos(rad) * dy;
    }

    node.appendChild(tp);
    node.style.left = this.format(x - dx) + 'px';
    node.style.top = this.format(y + dy) + 'px';
    this.root.appendChild(node);
  }

  stroke() {
    this.addNode(false, true);
  }

  fill() {
    this.addNode(true, false);
  }

  fillAndStroke() {
    this.addNode(true, true);
  }
}
