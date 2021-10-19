import { wangStencilRegistry } from '@wangGraph/shape/wangStencilRegistry';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangConnectionConstraint } from '@wangGraph/view/wangConnectionConstraint';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangStencil {
  static defaultLocalized = false;
  static allowEval = false;
  constraints = null;
  aspect = null;
  w0 = null;
  h0 = null;
  bgNode = null;
  fgNode = null;
  strokewidth = null;

  constructor(desc) {
    this.desc = desc;
    this.parseDescription();
    this.parseConstraints();
  }

  parseDescription() {
    this.fgNode = this.desc.getElementsByTagName('foreground')[0];
    this.bgNode = this.desc.getElementsByTagName('background')[0];
    this.w0 = Number(this.desc.getAttribute('w') || 100);
    this.h0 = Number(this.desc.getAttribute('h') || 100);
    let aspect = this.desc.getAttribute('aspect');
    this.aspect = aspect != null ? aspect : 'letiable';
    let sw = this.desc.getAttribute('strokewidth');
    this.strokewidth = sw != null ? sw : '1';
  }

  parseConstraints() {
    let conns = this.desc.getElementsByTagName('connections')[0];

    if (conns != null) {
      let tmp = wangUtils.getChildNodes(conns);

      if (tmp != null && tmp.length > 0) {
        this.constraints = [];

        for (let i = 0; i < tmp.length; i++) {
          this.constraints.push(this.parseConstraint(tmp[i]));
        }
      }
    }
  }

  parseConstraint(node) {
    let x = Number(node.getAttribute('x'));
    let y = Number(node.getAttribute('y'));
    let perimeter = node.getAttribute('perimeter') == '1';
    let name = node.getAttribute('name');
    return new wangConnectionConstraint(new wangPoint(x, y), perimeter, name);
  }

  evaluateTextAttribute(node, attribute, shape) {
    let result = this.evaluateAttribute(node, attribute, shape);
    let loc = node.getAttribute('localized');

    if ((wangStencil.defaultLocalized && loc == null) || loc == '1') {
      result = wangResources.get(result);
    }

    return result;
  }

  evaluateAttribute(node, attribute, shape) {
    let result = node.getAttribute(attribute);

    if (result == null) {
      let text = wangUtils.getTextContent(node);

      if (text != null && wangStencil.allowEval) {
        let funct = wangUtils.eval(text);

        if (typeof funct == 'function') {
          result = funct(shape);
        }
      }
    }

    return result;
  }

  drawShape(canvas, shape, x, y, w, h) {
    let stack = canvas.states.slice();
    let direction = wangUtils.getValue(shape.style, wangConstants.STYLE_DIRECTION, null);
    let aspect = this.computeAspect(shape.style, x, y, w, h, direction);
    let minScale = Math.min(aspect.width, aspect.height);
    let sw =
      this.strokewidth == 'inherit'
        ? Number(wangUtils.getNumber(shape.style, wangConstants.STYLE_STROKEWIDTH, 1))
        : Number(this.strokewidth) * minScale;
    canvas.setStrokeWidth(sw);

    if (shape.style != null && wangUtils.getValue(shape.style, wangConstants.STYLE_POINTER_EVENTS, '0') == '1') {
      canvas.setStrokeColor(wangConstants.NONE);
      canvas.rect(x, y, w, h);
      canvas.stroke();
      canvas.setStrokeColor(shape.stroke);
    }

    this.drawChildren(canvas, shape, x, y, w, h, this.bgNode, aspect, false, true);
    this.drawChildren(
      canvas,
      shape,
      x,
      y,
      w,
      h,
      this.fgNode,
      aspect,
      true,
      !shape.outline ||
        shape.style == null ||
        wangUtils.getValue(shape.style, wangConstants.STYLE_BACKGROUND_OUTLINE, 0) == 0
    );

    if (canvas.states.length != stack.length) {
      canvas.states = stack;
    }
  }

  drawChildren(canvas, shape, x, y, w, h, node, aspect, disableShadow, paint) {
    if (node != null && w > 0 && h > 0) {
      let tmp = node.firstChild;

      while (tmp != null) {
        if (tmp.nodeType == wangConstants.NODETYPE_ELEMENT) {
          this.drawNode(canvas, shape, tmp, aspect, disableShadow, paint);
        }

        tmp = tmp.nextSibling;
      }
    }
  }

  computeAspect(shape, x, y, w, h, direction) {
    let x0 = x;
    let y0 = y;
    let sx = w / this.w0;
    let sy = h / this.h0;
    let inverse = direction == wangConstants.DIRECTION_NORTH || direction == wangConstants.DIRECTION_SOUTH;

    if (inverse) {
      sy = w / this.h0;
      sx = h / this.w0;
      let delta = (w - h) / 2;
      x0 += delta;
      y0 -= delta;
    }

    if (this.aspect == 'fixed') {
      sy = Math.min(sx, sy);
      sx = sy;

      if (inverse) {
        x0 += (h - this.w0 * sx) / 2;
        y0 += (w - this.h0 * sy) / 2;
      } else {
        x0 += (w - this.w0 * sx) / 2;
        y0 += (h - this.h0 * sy) / 2;
      }
    }

    return new wangRectangle(x0, y0, sx, sy);
  }

  drawNode(canvas, shape, node, aspect, disableShadow, paint) {
    let name = node.nodeName;
    let x0 = aspect.x;
    let y0 = aspect.y;
    let sx = aspect.width;
    let sy = aspect.height;
    let minScale = Math.min(sx, sy);

    if (name == 'save') {
      canvas.save();
    } else if (name == 'restore') {
      canvas.restore();
    } else if (paint) {
      if (name == 'path') {
        canvas.begin();
        let parseRegularly = true;

        if (node.getAttribute('rounded') == '1') {
          parseRegularly = false;
          let arcSize = Number(node.getAttribute('arcSize'));
          let pointCount = 0;
          let segs = [];
          let childNode = node.firstChild;

          while (childNode != null) {
            if (childNode.nodeType == wangConstants.NODETYPE_ELEMENT) {
              let childName = childNode.nodeName;

              if (childName == 'move' || childName == 'line') {
                if (childName == 'move' || segs.length == 0) {
                  segs.push([]);
                }

                segs[segs.length - 1].push(
                  new wangPoint(
                    x0 + Number(childNode.getAttribute('x')) * sx,
                    y0 + Number(childNode.getAttribute('y')) * sy
                  )
                );
                pointCount++;
              } else {
                parseRegularly = true;
                break;
              }
            }

            childNode = childNode.nextSibling;
          }

          if (!parseRegularly && pointCount > 0) {
            for (let i = 0; i < segs.length; i++) {
              let close = false,
                ps = segs[i][0],
                pe = segs[i][segs[i].length - 1];

              if (ps.x == pe.x && ps.y == pe.y) {
                segs[i].pop();
                close = true;
              }

              this.addPoints(canvas, segs[i], true, arcSize, close);
            }
          } else {
            parseRegularly = true;
          }
        }

        if (parseRegularly) {
          let childNode = node.firstChild;

          while (childNode != null) {
            if (childNode.nodeType == wangConstants.NODETYPE_ELEMENT) {
              this.drawNode(canvas, shape, childNode, aspect, disableShadow, paint);
            }

            childNode = childNode.nextSibling;
          }
        }
      } else if (name == 'close') {
        canvas.close();
      } else if (name == 'move') {
        canvas.moveTo(x0 + Number(node.getAttribute('x')) * sx, y0 + Number(node.getAttribute('y')) * sy);
      } else if (name == 'line') {
        canvas.lineTo(x0 + Number(node.getAttribute('x')) * sx, y0 + Number(node.getAttribute('y')) * sy);
      } else if (name == 'quad') {
        canvas.quadTo(
          x0 + Number(node.getAttribute('x1')) * sx,
          y0 + Number(node.getAttribute('y1')) * sy,
          x0 + Number(node.getAttribute('x2')) * sx,
          y0 + Number(node.getAttribute('y2')) * sy
        );
      } else if (name == 'curve') {
        canvas.curveTo(
          x0 + Number(node.getAttribute('x1')) * sx,
          y0 + Number(node.getAttribute('y1')) * sy,
          x0 + Number(node.getAttribute('x2')) * sx,
          y0 + Number(node.getAttribute('y2')) * sy,
          x0 + Number(node.getAttribute('x3')) * sx,
          y0 + Number(node.getAttribute('y3')) * sy
        );
      } else if (name == 'arc') {
        canvas.arcTo(
          Number(node.getAttribute('rx')) * sx,
          Number(node.getAttribute('ry')) * sy,
          Number(node.getAttribute('x-axis-rotation')),
          Number(node.getAttribute('large-arc-flag')),
          Number(node.getAttribute('sweep-flag')),
          x0 + Number(node.getAttribute('x')) * sx,
          y0 + Number(node.getAttribute('y')) * sy
        );
      } else if (name == 'rect') {
        canvas.rect(
          x0 + Number(node.getAttribute('x')) * sx,
          y0 + Number(node.getAttribute('y')) * sy,
          Number(node.getAttribute('w')) * sx,
          Number(node.getAttribute('h')) * sy
        );
      } else if (name == 'roundrect') {
        let arcsize = Number(node.getAttribute('arcsize'));

        if (arcsize == 0) {
          arcsize = wangConstants.RECTANGLE_ROUNDING_FACTOR * 100;
        }

        let w = Number(node.getAttribute('w')) * sx;
        let h = Number(node.getAttribute('h')) * sy;
        let factor = Number(arcsize) / 100;
        let r = Math.min(w * factor, h * factor);
        canvas.roundrect(
          x0 + Number(node.getAttribute('x')) * sx,
          y0 + Number(node.getAttribute('y')) * sy,
          w,
          h,
          r,
          r
        );
      } else if (name == 'ellipse') {
        canvas.ellipse(
          x0 + Number(node.getAttribute('x')) * sx,
          y0 + Number(node.getAttribute('y')) * sy,
          Number(node.getAttribute('w')) * sx,
          Number(node.getAttribute('h')) * sy
        );
      } else if (name == 'image') {
        if (!shape.outline) {
          let src = this.evaluateAttribute(node, 'src', shape);
          canvas.image(
            x0 + Number(node.getAttribute('x')) * sx,
            y0 + Number(node.getAttribute('y')) * sy,
            Number(node.getAttribute('w')) * sx,
            Number(node.getAttribute('h')) * sy,
            src,
            false,
            node.getAttribute('flipH') == '1',
            node.getAttribute('flipV') == '1'
          );
        }
      } else if (name == 'text') {
        if (!shape.outline) {
          let str = this.evaluateTextAttribute(node, 'str', shape);
          let rotation = node.getAttribute('vertical') == '1' ? -90 : 0;

          if (node.getAttribute('align-shape') == '0') {
            let dr = shape.rotation;
            let flipH = wangUtils.getValue(shape.style, wangConstants.STYLE_FLIPH, 0) == 1;
            let flipV = wangUtils.getValue(shape.style, wangConstants.STYLE_FLIPV, 0) == 1;

            if (flipH && flipV) {
              rotation -= dr;
            } else if (flipH || flipV) {
              rotation += dr;
            } else {
              rotation -= dr;
            }
          }

          rotation -= node.getAttribute('rotation');
          canvas.text(
            x0 + Number(node.getAttribute('x')) * sx,
            y0 + Number(node.getAttribute('y')) * sy,
            0,
            0,
            str,
            node.getAttribute('align') || 'left',
            node.getAttribute('valign') || 'top',
            false,
            '',
            null,
            false,
            rotation
          );
        }
      } else if (name == 'include-shape') {
        let stencil = wangStencilRegistry.getStencil(node.getAttribute('name'));

        if (stencil != null) {
          let x = x0 + Number(node.getAttribute('x')) * sx;
          let y = y0 + Number(node.getAttribute('y')) * sy;
          let w = Number(node.getAttribute('w')) * sx;
          let h = Number(node.getAttribute('h')) * sy;
          stencil.drawShape(canvas, shape, x, y, w, h);
        }
      } else if (name == 'fillstroke') {
        canvas.fillAndStroke();
      } else if (name == 'fill') {
        canvas.fill();
      } else if (name == 'stroke') {
        canvas.stroke();
      } else if (name == 'strokewidth') {
        let s = node.getAttribute('fixed') == '1' ? 1 : minScale;
        canvas.setStrokeWidth(Number(node.getAttribute('width')) * s);
      } else if (name == 'dashed') {
        canvas.setDashed(node.getAttribute('dashed') == '1');
      } else if (name == 'dashpattern') {
        let value = node.getAttribute('pattern');

        if (value != null) {
          let tmp = value.split(' ');
          let pat = [];

          for (let i = 0; i < tmp.length; i++) {
            if (tmp[i].length > 0) {
              pat.push(Number(tmp[i]) * minScale);
            }
          }

          value = pat.join(' ');
          canvas.setDashPattern(value);
        }
      } else if (name == 'strokecolor') {
        canvas.setStrokeColor(node.getAttribute('color'));
      } else if (name == 'linecap') {
        canvas.setLineCap(node.getAttribute('cap'));
      } else if (name == 'linejoin') {
        canvas.setLineJoin(node.getAttribute('join'));
      } else if (name == 'miterlimit') {
        canvas.setMiterLimit(Number(node.getAttribute('limit')));
      } else if (name == 'fillcolor') {
        canvas.setFillColor(node.getAttribute('color'));
      } else if (name == 'alpha') {
        canvas.setAlpha(node.getAttribute('alpha'));
      } else if (name == 'fillalpha') {
        canvas.setAlpha(node.getAttribute('alpha'));
      } else if (name == 'strokealpha') {
        canvas.setAlpha(node.getAttribute('alpha'));
      } else if (name == 'fontcolor') {
        canvas.setFontColor(node.getAttribute('color'));
      } else if (name == 'fontstyle') {
        canvas.setFontStyle(node.getAttribute('style'));
      } else if (name == 'fontfamily') {
        canvas.setFontFamily(node.getAttribute('family'));
      } else if (name == 'fontsize') {
        canvas.setFontSize(Number(node.getAttribute('size')) * minScale);
      }

      if (disableShadow && (name == 'fillstroke' || name == 'fill' || name == 'stroke')) {
        disableShadow = false;
        canvas.setShadow(false);
      }
    }
  }
}
