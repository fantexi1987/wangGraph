import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangKeyHandler } from '@wangGraph/handler/wangKeyHandler';

export class wangDefaultKeyHandler {
  editor = null;
  handler = null;

  constructor(editor) {
    if (editor != null) {
      this.editor = editor;
      this.handler = new wangKeyHandler(editor.graph);
      let old = this.handler.escape;

      this.handler.escape = function (evt) {
        old.apply(this, arguments);
        editor.hideProperties();
        editor.fireEvent(new wangEventObject(wangEvent.ESCAPE, 'event', evt));
      };
    }
  }

  bindAction(code, action, control) {
    let keyHandler = () => {
      this.editor.execute(action);
    };

    if (control) {
      this.handler.bindControlKey(code, keyHandler);
    } else {
      this.handler.bindKey(code, keyHandler);
    }
  }

  destroy() {
    this.handler.destroy();
    this.handler = null;
  }
}
