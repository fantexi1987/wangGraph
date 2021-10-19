import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangDefaultPopupMenu } from '@wangGraph/editor/wangDefaultPopupMenu';

export class wangDefaultPopupMenuCodec extends wangObjectCodec {
  constructor() {
    super(new wangDefaultPopupMenu());
  }

  encode(enc, obj) {
    return null;
  }

  decode(dec, node, into) {
    let inc = node.getElementsByTagName('include')[0];

    if (inc != null) {
      this.processInclude(dec, inc, into);
    } else if (into != null) {
      into.config = node;
    }

    return into;
  }
}
