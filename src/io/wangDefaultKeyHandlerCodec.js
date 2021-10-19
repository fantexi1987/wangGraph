import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangDefaultKeyHandler } from '@wangGraph/editor/wangDefaultKeyHandler';

export class wangDefaultKeyHandlerCodec extends wangObjectCodec {
  constructor() {
    super(new wangDefaultKeyHandler());
  }

  encode(enc, obj) {
    return null;
  }

  decode(dec, node, into) {
    if (into != null) {
      let editor = into.editor;
      node = node.firstChild;

      while (node != null) {
        if (!this.processInclude(dec, node, into) && node.nodeName == 'add') {
          let as = node.getAttribute('as');
          let action = node.getAttribute('action');
          let control = node.getAttribute('control');
          into.bindAction(as, action, control);
        }

        node = node.nextSibling;
      }
    }

    return into;
  }
}
