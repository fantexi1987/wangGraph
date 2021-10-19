import { wangPoint } from '@wangGraph/util/wangPoint';

export class wangRectangle extends wangPoint {
  constructor(x, y, width, height) {
    super(x, y);
    this.width = width != null ? width : 0;
    this.height = height != null ? height : 0;
  }

  setRect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }

  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }

  add(rect) {
    if (rect != null) {
      let minX = Math.min(this.x, rect.x);
      let minY = Math.min(this.y, rect.y);
      let maxX = Math.max(this.x + this.width, rect.x + rect.width);
      let maxY = Math.max(this.y + this.height, rect.y + rect.height);
      this.x = minX;
      this.y = minY;
      this.width = maxX - minX;
      this.height = maxY - minY;
    }
  }

  intersect(rect) {
    if (rect != null) {
      let r1 = this.x + this.width;
      let r2 = rect.x + rect.width;
      let b1 = this.y + this.height;
      let b2 = rect.y + rect.height;
      this.x = Math.max(this.x, rect.x);
      this.y = Math.max(this.y, rect.y);
      this.width = Math.min(r1, r2) - this.x;
      this.height = Math.min(b1, b2) - this.y;
    }
  }

  grow(amount) {
    this.x -= amount;
    this.y -= amount;
    this.width += 2 * amount;
    this.height += 2 * amount;
    return this;
  }

  getPoint() {
    return new wangPoint(this.x, this.y);
  }

  rotate90() {
    let t = (this.width - this.height) / 2;
    this.x += t;
    this.y -= t;
    let tmp = this.width;
    this.width = this.height;
    this.height = tmp;
  }

  equals(obj) {
    return obj != null && obj.x == this.x && obj.y == this.y && obj.width == this.width && obj.height == this.height;
  }

  static fromRectangle(rect) {
    return new wangRectangle(rect.x, rect.y, rect.width, rect.height);
  }
}
