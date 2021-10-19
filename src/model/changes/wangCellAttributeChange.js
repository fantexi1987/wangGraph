export class wangCellAttributeChange {
  constructor(cell, attribute, value) {
    this.cell = cell;
    this.attribute = attribute;
    this.value = value;
    this.previous = value;
  }

  execute() {
    if (this.cell != null) {
      let tmp = this.cell.getAttribute(this.attribute);

      if (this.previous == null) {
        this.cell.value.removeAttribute(this.attribute);
      } else {
        this.cell.setAttribute(this.attribute, this.previous);
      }

      this.previous = tmp;
    }
  }
}
