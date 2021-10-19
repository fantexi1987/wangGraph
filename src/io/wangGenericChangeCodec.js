import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangGenericChangeCodec extends wangObjectCodec {
  constructor(obj, letiable) {
    super(obj, ['model', 'previous'], ['cell']);
    this.letiable = letiable;
  }

  afterDecode(dec, node, obj) {
    if (wangUtils.isNode(obj.cell)) {
      obj.cell = dec.decodeCell(obj.cell, false);
    }

    obj.previous = obj[this.letiable];
    return obj;
  }
}
