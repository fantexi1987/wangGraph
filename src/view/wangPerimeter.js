import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangPerimeter {
  static RectanglePerimeter(bounds, vertex, next, orthogonal) {
    let cx = bounds.getCenterX();
    let cy = bounds.getCenterY();
    let dx = next.x - cx;
    let dy = next.y - cy;
    let alpha = Math.atan2(dy, dx);
    let p = new wangPoint(0, 0);
    let pi = Math.PI;
    let pi2 = Math.PI / 2;
    let beta = pi2 - alpha;
    let t = Math.atan2(bounds.height, bounds.width);

    if (alpha < -pi + t || alpha > pi - t) {
      p.x = bounds.x;
      p.y = cy - (bounds.width * Math.tan(alpha)) / 2;
    } else if (alpha < -t) {
      p.y = bounds.y;
      p.x = cx - (bounds.height * Math.tan(beta)) / 2;
    } else if (alpha < t) {
      p.x = bounds.x + bounds.width;
      p.y = cy + (bounds.width * Math.tan(alpha)) / 2;
    } else {
      p.y = bounds.y + bounds.height;
      p.x = cx + (bounds.height * Math.tan(beta)) / 2;
    }

    if (orthogonal) {
      if (next.x >= bounds.x && next.x <= bounds.x + bounds.width) {
        p.x = next.x;
      } else if (next.y >= bounds.y && next.y <= bounds.y + bounds.height) {
        p.y = next.y;
      }

      if (next.x < bounds.x) {
        p.x = bounds.x;
      } else if (next.x > bounds.x + bounds.width) {
        p.x = bounds.x + bounds.width;
      }

      if (next.y < bounds.y) {
        p.y = bounds.y;
      } else if (next.y > bounds.y + bounds.height) {
        p.y = bounds.y + bounds.height;
      }
    }

    return p;
  }

  static EllipsePerimeter(bounds, vertex, next, orthogonal) {
    let x = bounds.x;
    let y = bounds.y;
    let a = bounds.width / 2;
    let b = bounds.height / 2;
    let cx = x + a;
    let cy = y + b;
    let px = next.x;
    let py = next.y;
    let dx = parseInt(px - cx);
    let dy = parseInt(py - cy);

    if (dx == 0 && dy != 0) {
      return new wangPoint(cx, cy + (b * dy) / Math.abs(dy));
    } else if (dx == 0 && dy == 0) {
      return new wangPoint(px, py);
    }

    if (orthogonal) {
      if (py >= y && py <= y + bounds.height) {
        let ty = py - cy;
        let tx = Math.sqrt(a * a * (1 - (ty * ty) / (b * b))) || 0;

        if (px <= x) {
          tx = -tx;
        }

        return new wangPoint(cx + tx, py);
      }

      if (px >= x && px <= x + bounds.width) {
        let tx = px - cx;
        let ty = Math.sqrt(b * b * (1 - (tx * tx) / (a * a))) || 0;

        if (py <= y) {
          ty = -ty;
        }

        return new wangPoint(px, cy + ty);
      }
    }

    let d = dy / dx;
    let h = cy - d * cx;
    let e = a * a * d * d + b * b;
    let f = -2 * cx * e;
    let g = a * a * d * d * cx * cx + b * b * cx * cx - a * a * b * b;
    let det = Math.sqrt(f * f - 4 * e * g);
    let xout1 = (-f + det) / (2 * e);
    let xout2 = (-f - det) / (2 * e);
    let yout1 = d * xout1 + h;
    let yout2 = d * xout2 + h;
    let dist1 = Math.sqrt(Math.pow(xout1 - px, 2) + Math.pow(yout1 - py, 2));
    let dist2 = Math.sqrt(Math.pow(xout2 - px, 2) + Math.pow(yout2 - py, 2));
    let xout = 0;
    let yout = 0;

    if (dist1 < dist2) {
      xout = xout1;
      yout = yout1;
    } else {
      xout = xout2;
      yout = yout2;
    }

    return new wangPoint(xout, yout);
  }

  static RhombusPerimeter(bounds, vertex, next, orthogonal) {
    let x = bounds.x;
    let y = bounds.y;
    let w = bounds.width;
    let h = bounds.height;
    let cx = x + w / 2;
    let cy = y + h / 2;
    let px = next.x;
    let py = next.y;

    if (cx == px) {
      if (cy > py) {
        return new wangPoint(cx, y);
      } else {
        return new wangPoint(cx, y + h);
      }
    } else if (cy == py) {
      if (cx > px) {
        return new wangPoint(x, cy);
      } else {
        return new wangPoint(x + w, cy);
      }
    }

    let tx = cx;
    let ty = cy;

    if (orthogonal) {
      if (px >= x && px <= x + w) {
        tx = px;
      } else if (py >= y && py <= y + h) {
        ty = py;
      }
    }

    if (px < cx) {
      if (py < cy) {
        return wangUtils.intersection(px, py, tx, ty, cx, y, x, cy);
      } else {
        return wangUtils.intersection(px, py, tx, ty, cx, y + h, x, cy);
      }
    } else if (py < cy) {
      return wangUtils.intersection(px, py, tx, ty, cx, y, x + w, cy);
    } else {
      return wangUtils.intersection(px, py, tx, ty, cx, y + h, x + w, cy);
    }
  }

  static TrianglePerimeter(bounds, vertex, next, orthogonal) {
    let direction = vertex != null ? vertex.style[wangConstants.STYLE_DIRECTION] : null;
    let vertical = direction == wangConstants.DIRECTION_NORTH || direction == wangConstants.DIRECTION_SOUTH;
    let x = bounds.x;
    let y = bounds.y;
    let w = bounds.width;
    let h = bounds.height;
    let cx = x + w / 2;
    let cy = y + h / 2;
    let start = new wangPoint(x, y);
    let corner = new wangPoint(x + w, cy);
    let end = new wangPoint(x, y + h);

    if (direction == wangConstants.DIRECTION_NORTH) {
      start = end;
      corner = new wangPoint(cx, y);
      end = new wangPoint(x + w, y + h);
    } else if (direction == wangConstants.DIRECTION_SOUTH) {
      corner = new wangPoint(cx, y + h);
      end = new wangPoint(x + w, y);
    } else if (direction == wangConstants.DIRECTION_WEST) {
      start = new wangPoint(x + w, y);
      corner = new wangPoint(x, cy);
      end = new wangPoint(x + w, y + h);
    }

    let dx = next.x - cx;
    let dy = next.y - cy;
    let alpha = vertical ? Math.atan2(dx, dy) : Math.atan2(dy, dx);
    let t = vertical ? Math.atan2(w, h) : Math.atan2(h, w);
    let base = false;

    if (direction == wangConstants.DIRECTION_NORTH || direction == wangConstants.DIRECTION_WEST) {
      base = alpha > -t && alpha < t;
    } else {
      base = alpha < -Math.PI + t || alpha > Math.PI - t;
    }

    let result = null;

    if (base) {
      if (
        orthogonal &&
        ((vertical && next.x >= start.x && next.x <= end.x) || (!vertical && next.y >= start.y && next.y <= end.y))
      ) {
        if (vertical) {
          result = new wangPoint(next.x, start.y);
        } else {
          result = new wangPoint(start.x, next.y);
        }
      } else {
        if (direction == wangConstants.DIRECTION_NORTH) {
          result = new wangPoint(x + w / 2 + (h * Math.tan(alpha)) / 2, y + h);
        } else if (direction == wangConstants.DIRECTION_SOUTH) {
          result = new wangPoint(x + w / 2 - (h * Math.tan(alpha)) / 2, y);
        } else if (direction == wangConstants.DIRECTION_WEST) {
          result = new wangPoint(x + w, y + h / 2 + (w * Math.tan(alpha)) / 2);
        } else {
          result = new wangPoint(x, y + h / 2 - (w * Math.tan(alpha)) / 2);
        }
      }
    } else {
      if (orthogonal) {
        let pt = new wangPoint(cx, cy);

        if (next.y >= y && next.y <= y + h) {
          pt.x = vertical ? cx : direction == wangConstants.DIRECTION_WEST ? x + w : x;
          pt.y = next.y;
        } else if (next.x >= x && next.x <= x + w) {
          pt.x = next.x;
          pt.y = !vertical ? cy : direction == wangConstants.DIRECTION_NORTH ? y + h : y;
        }

        dx = next.x - pt.x;
        dy = next.y - pt.y;
        cx = pt.x;
        cy = pt.y;
      }

      if ((vertical && next.x <= x + w / 2) || (!vertical && next.y <= y + h / 2)) {
        result = wangUtils.intersection(next.x, next.y, cx, cy, start.x, start.y, corner.x, corner.y);
      } else {
        result = wangUtils.intersection(next.x, next.y, cx, cy, corner.x, corner.y, end.x, end.y);
      }
    }

    if (result == null) {
      result = new wangPoint(cx, cy);
    }

    return result;
  }

  static HexagonPerimeter(bounds, vertex, next, orthogonal) {
    let x = bounds.x;
    let y = bounds.y;
    let w = bounds.width;
    let h = bounds.height;
    let cx = bounds.getCenterX();
    let cy = bounds.getCenterY();
    let px = next.x;
    let py = next.y;
    let dx = px - cx;
    let dy = py - cy;
    let alpha = -Math.atan2(dy, dx);
    let pi = Math.PI;
    let pi2 = Math.PI / 2;
    let result = new wangPoint(cx, cy);
    let direction =
      vertex != null
        ? wangUtils.getValue(vertex.style, wangConstants.STYLE_DIRECTION, wangConstants.DIRECTION_EAST)
        : wangConstants.DIRECTION_EAST;
    let vertical = direction == wangConstants.DIRECTION_NORTH || direction == wangConstants.DIRECTION_SOUTH;
    let a = new wangPoint();
    let b = new wangPoint();

    if ((px < x && py < y) || (px < x && py > y + h) || (px > x + w && py < y) || (px > x + w && py > y + h)) {
      orthogonal = false;
    }

    if (orthogonal) {
      if (vertical) {
        if (px == cx) {
          if (py <= y) {
            return new wangPoint(cx, y);
          } else if (py >= y + h) {
            return new wangPoint(cx, y + h);
          }
        } else if (px < x) {
          if (py == y + h / 4) {
            return new wangPoint(x, y + h / 4);
          } else if (py == y + (3 * h) / 4) {
            return new wangPoint(x, y + (3 * h) / 4);
          }
        } else if (px > x + w) {
          if (py == y + h / 4) {
            return new wangPoint(x + w, y + h / 4);
          } else if (py == y + (3 * h) / 4) {
            return new wangPoint(x + w, y + (3 * h) / 4);
          }
        } else if (px == x) {
          if (py < cy) {
            return new wangPoint(x, y + h / 4);
          } else if (py > cy) {
            return new wangPoint(x, y + (3 * h) / 4);
          }
        } else if (px == x + w) {
          if (py < cy) {
            return new wangPoint(x + w, y + h / 4);
          } else if (py > cy) {
            return new wangPoint(x + w, y + (3 * h) / 4);
          }
        }

        if (py == y) {
          return new wangPoint(cx, y);
        } else if (py == y + h) {
          return new wangPoint(cx, y + h);
        }

        if (px < cx) {
          if (py > y + h / 4 && py < y + (3 * h) / 4) {
            a = new wangPoint(x, y);
            b = new wangPoint(x, y + h);
          } else if (py < y + h / 4) {
            a = new wangPoint(x - Math.floor(0.5 * w), y + Math.floor(0.5 * h));
            b = new wangPoint(x + w, y - Math.floor(0.25 * h));
          } else if (py > y + (3 * h) / 4) {
            a = new wangPoint(x - Math.floor(0.5 * w), y + Math.floor(0.5 * h));
            b = new wangPoint(x + w, y + Math.floor(1.25 * h));
          }
        } else if (px > cx) {
          if (py > y + h / 4 && py < y + (3 * h) / 4) {
            a = new wangPoint(x + w, y);
            b = new wangPoint(x + w, y + h);
          } else if (py < y + h / 4) {
            a = new wangPoint(x, y - Math.floor(0.25 * h));
            b = new wangPoint(x + Math.floor(1.5 * w), y + Math.floor(0.5 * h));
          } else if (py > y + (3 * h) / 4) {
            a = new wangPoint(x + Math.floor(1.5 * w), y + Math.floor(0.5 * h));
            b = new wangPoint(x, y + Math.floor(1.25 * h));
          }
        }
      } else {
        if (py == cy) {
          if (px <= x) {
            return new wangPoint(x, y + h / 2);
          } else if (px >= x + w) {
            return new wangPoint(x + w, y + h / 2);
          }
        } else if (py < y) {
          if (px == x + w / 4) {
            return new wangPoint(x + w / 4, y);
          } else if (px == x + (3 * w) / 4) {
            return new wangPoint(x + (3 * w) / 4, y);
          }
        } else if (py > y + h) {
          if (px == x + w / 4) {
            return new wangPoint(x + w / 4, y + h);
          } else if (px == x + (3 * w) / 4) {
            return new wangPoint(x + (3 * w) / 4, y + h);
          }
        } else if (py == y) {
          if (px < cx) {
            return new wangPoint(x + w / 4, y);
          } else if (px > cx) {
            return new wangPoint(x + (3 * w) / 4, y);
          }
        } else if (py == y + h) {
          if (px < cx) {
            return new wangPoint(x + w / 4, y + h);
          } else if (py > cy) {
            return new wangPoint(x + (3 * w) / 4, y + h);
          }
        }

        if (px == x) {
          return new wangPoint(x, cy);
        } else if (px == x + w) {
          return new wangPoint(x + w, cy);
        }

        if (py < cy) {
          if (px > x + w / 4 && px < x + (3 * w) / 4) {
            a = new wangPoint(x, y);
            b = new wangPoint(x + w, y);
          } else if (px < x + w / 4) {
            a = new wangPoint(x - Math.floor(0.25 * w), y + h);
            b = new wangPoint(x + Math.floor(0.5 * w), y - Math.floor(0.5 * h));
          } else if (px > x + (3 * w) / 4) {
            a = new wangPoint(x + Math.floor(0.5 * w), y - Math.floor(0.5 * h));
            b = new wangPoint(x + Math.floor(1.25 * w), y + h);
          }
        } else if (py > cy) {
          if (px > x + w / 4 && px < x + (3 * w) / 4) {
            a = new wangPoint(x, y + h);
            b = new wangPoint(x + w, y + h);
          } else if (px < x + w / 4) {
            a = new wangPoint(x - Math.floor(0.25 * w), y);
            b = new wangPoint(x + Math.floor(0.5 * w), y + Math.floor(1.5 * h));
          } else if (px > x + (3 * w) / 4) {
            a = new wangPoint(x + Math.floor(0.5 * w), y + Math.floor(1.5 * h));
            b = new wangPoint(x + Math.floor(1.25 * w), y);
          }
        }
      }

      let tx = cx;
      let ty = cy;

      if (px >= x && px <= x + w) {
        tx = px;

        if (py < cy) {
          ty = y + h;
        } else {
          ty = y;
        }
      } else if (py >= y && py <= y + h) {
        ty = py;

        if (px < cx) {
          tx = x + w;
        } else {
          tx = x;
        }
      }

      result = wangUtils.intersection(tx, ty, next.x, next.y, a.x, a.y, b.x, b.y);
    } else {
      if (vertical) {
        let beta = Math.atan2(h / 4, w / 2);

        if (alpha == beta) {
          return new wangPoint(x + w, y + Math.floor(0.25 * h));
        } else if (alpha == pi2) {
          return new wangPoint(x + Math.floor(0.5 * w), y);
        } else if (alpha == pi - beta) {
          return new wangPoint(x, y + Math.floor(0.25 * h));
        } else if (alpha == -beta) {
          return new wangPoint(x + w, y + Math.floor(0.75 * h));
        } else if (alpha == -pi2) {
          return new wangPoint(x + Math.floor(0.5 * w), y + h);
        } else if (alpha == -pi + beta) {
          return new wangPoint(x, y + Math.floor(0.75 * h));
        }

        if (alpha < beta && alpha > -beta) {
          a = new wangPoint(x + w, y);
          b = new wangPoint(x + w, y + h);
        } else if (alpha > beta && alpha < pi2) {
          a = new wangPoint(x, y - Math.floor(0.25 * h));
          b = new wangPoint(x + Math.floor(1.5 * w), y + Math.floor(0.5 * h));
        } else if (alpha > pi2 && alpha < pi - beta) {
          a = new wangPoint(x - Math.floor(0.5 * w), y + Math.floor(0.5 * h));
          b = new wangPoint(x + w, y - Math.floor(0.25 * h));
        } else if ((alpha > pi - beta && alpha <= pi) || (alpha < -pi + beta && alpha >= -pi)) {
          a = new wangPoint(x, y);
          b = new wangPoint(x, y + h);
        } else if (alpha < -beta && alpha > -pi2) {
          a = new wangPoint(x + Math.floor(1.5 * w), y + Math.floor(0.5 * h));
          b = new wangPoint(x, y + Math.floor(1.25 * h));
        } else if (alpha < -pi2 && alpha > -pi + beta) {
          a = new wangPoint(x - Math.floor(0.5 * w), y + Math.floor(0.5 * h));
          b = new wangPoint(x + w, y + Math.floor(1.25 * h));
        }
      } else {
        let beta = Math.atan2(h / 2, w / 4);

        if (alpha == beta) {
          return new wangPoint(x + Math.floor(0.75 * w), y);
        } else if (alpha == pi - beta) {
          return new wangPoint(x + Math.floor(0.25 * w), y);
        } else if (alpha == pi || alpha == -pi) {
          return new wangPoint(x, y + Math.floor(0.5 * h));
        } else if (alpha == 0) {
          return new wangPoint(x + w, y + Math.floor(0.5 * h));
        } else if (alpha == -beta) {
          return new wangPoint(x + Math.floor(0.75 * w), y + h);
        } else if (alpha == -pi + beta) {
          return new wangPoint(x + Math.floor(0.25 * w), y + h);
        }

        if (alpha > 0 && alpha < beta) {
          a = new wangPoint(x + Math.floor(0.5 * w), y - Math.floor(0.5 * h));
          b = new wangPoint(x + Math.floor(1.25 * w), y + h);
        } else if (alpha > beta && alpha < pi - beta) {
          a = new wangPoint(x, y);
          b = new wangPoint(x + w, y);
        } else if (alpha > pi - beta && alpha < pi) {
          a = new wangPoint(x - Math.floor(0.25 * w), y + h);
          b = new wangPoint(x + Math.floor(0.5 * w), y - Math.floor(0.5 * h));
        } else if (alpha < 0 && alpha > -beta) {
          a = new wangPoint(x + Math.floor(0.5 * w), y + Math.floor(1.5 * h));
          b = new wangPoint(x + Math.floor(1.25 * w), y);
        } else if (alpha < -beta && alpha > -pi + beta) {
          a = new wangPoint(x, y + h);
          b = new wangPoint(x + w, y + h);
        } else if (alpha < -pi + beta && alpha > -pi) {
          a = new wangPoint(x - Math.floor(0.25 * w), y);
          b = new wangPoint(x + Math.floor(0.5 * w), y + Math.floor(1.5 * h));
        }
      }

      result = wangUtils.intersection(cx, cy, next.x, next.y, a.x, a.y, b.x, b.y);
    }

    if (result == null) {
      return new wangPoint(cx, cy);
    }

    return result;
  }
}
