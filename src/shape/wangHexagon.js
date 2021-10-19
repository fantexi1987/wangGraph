import { wangActor } from '@wangGraph/shape/wangActor';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangHexagon extends wangActor {
  constructor() {
    super();
  }

  redrawPath(c, x, y, w, h) {
    let arcSize = wangUtils.getValue(this.style, wangConstants.STYLE_ARCSIZE, wangConstants.LINE_ARCSIZE) / 2;
    this.addPoints(
      c,
      [
        new wangPoint(0.25 * w, 0),
        new wangPoint(0.75 * w, 0),
        new wangPoint(w, 0.5 * h),
        new wangPoint(0.75 * w, h),
        new wangPoint(0.25 * w, h),
        new wangPoint(0, 0.5 * h)
      ],
      this.isRounded,
      arcSize,
      true
    );
  }
}
