import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangTerminalChange } from '@wangGraph/model/changes/wangTerminalChange';

export class wangTerminalChangeCodec extends wangObjectCodec {
  constructor() {
    super(new wangTerminalChange(), ['model', 'previous'], ['cell', 'terminal']);
  }

  afterDecode(dec, node, obj) {
    obj.previous = obj.terminal;
    return obj;
  }
}
