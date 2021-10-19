import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangWindow } from '@wangGraph/util/wangWindow';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangClient } from '@wangGraph/wangClient';

export class wangLog {
  static consoleName = 'Console';
  static TRACE = false;
  static DEBUG = true;
  static WARN = true;
  static buffer = '';

  static init() {
    if (wangLog.window == null && document.body != null) {
      let title = wangLog.consoleName + ' - wangGraph ' + wangClient.VERSION;
      let table = document.createElement('table');
      table.setAttribute('width', '100%');
      table.setAttribute('height', '100%');
      let tbody = document.createElement('tbody');
      let tr = document.createElement('tr');
      let td = document.createElement('td');
      td.style.verticalAlign = 'top';
      wangLog.textarea = document.createElement('textarea');
      wangLog.textarea.setAttribute('wrap', 'off');
      wangLog.textarea.setAttribute('readOnly', 'true');
      wangLog.textarea.style.height = '100%';
      wangLog.textarea.style.resize = 'none';
      wangLog.textarea.value = wangLog.buffer;

      if (wangClient.IS_NS && document.compatMode != 'BackCompat') {
        wangLog.textarea.style.width = '99%';
      } else {
        wangLog.textarea.style.width = '100%';
      }

      td.appendChild(wangLog.textarea);
      tr.appendChild(td);
      tbody.appendChild(tr);
      tr = document.createElement('tr');
      wangLog.td = document.createElement('td');
      wangLog.td.style.verticalAlign = 'top';
      wangLog.td.setAttribute('height', '30px');
      tr.appendChild(wangLog.td);
      tbody.appendChild(tr);
      table.appendChild(tbody);
      wangLog.addButton('Info', function (evt) {
        wangLog.info();
      });
      wangLog.addButton('DOM', function (evt) {
        let content = wangUtils.getInnerHtml(document.body);
        wangLog.debug(content);
      });
      wangLog.addButton('Trace', function (evt) {
        wangLog.TRACE = !wangLog.TRACE;

        if (wangLog.TRACE) {
          wangLog.debug('Tracing enabled');
        } else {
          wangLog.debug('Tracing disabled');
        }
      });
      wangLog.addButton('Copy', function (evt) {
        try {
          wangUtils.copy(wangLog.textarea.value);
        } catch (err) {
          wangUtils.alert(err);
        }
      });
      wangLog.addButton('Show', function (evt) {
        try {
          wangUtils.popup(wangLog.textarea.value);
        } catch (err) {
          wangUtils.alert(err);
        }
      });
      wangLog.addButton('Clear', function (evt) {
        wangLog.textarea.value = '';
      });
      let h = 0;
      let w = 0;

      if (typeof window.innerWidth === 'number') {
        h = window.innerHeight;
        w = window.innerWidth;
      } else {
        h = document.documentElement.clientHeight || document.body.clientHeight;
        w = document.body.clientWidth;
      }

      wangLog.window = new wangWindow(title, table, Math.max(0, w - 320), Math.max(0, h - 210), 300, 160);
      wangLog.window.setMaximizable(true);
      wangLog.window.setScrollable(false);
      wangLog.window.setResizable(true);
      wangLog.window.setClosable(true);
      wangLog.window.destroyOnClose = false;

      if (
        (wangClient.IS_NS && !wangClient.IS_GC && !wangClient.IS_SF && document.compatMode != 'BackCompat') ||
        document.documentMode == 11
      ) {
        let elt = wangLog.window.getElement();

        let resizeHandler = function (sender, evt) {
          wangLog.textarea.style.height = Math.max(0, elt.offsetHeight - 70) + 'px';
        };

        wangLog.window.addListener(wangEvent.RESIZE_END, resizeHandler);
        wangLog.window.addListener(wangEvent.MAXIMIZE, resizeHandler);
        wangLog.window.addListener(wangEvent.NORMALIZE, resizeHandler);
        wangLog.textarea.style.height = '92px';
      }
    }
  }

  static info() {
    wangLog.writeln(wangUtils.toString(navigator));
  }

  static addButton(lab, funct) {
    let button = document.createElement('button');
    wangUtils.write(button, lab);
    wangEvent.addListener(button, 'click', funct);
    wangLog.td.appendChild(button);
  }

  static isVisible() {
    if (wangLog.window != null) {
      return wangLog.window.isVisible();
    }

    return false;
  }

  static show() {
    wangLog.setVisible(true);
  }

  static setVisible(visible) {
    if (wangLog.window == null) {
      wangLog.init();
    }

    if (wangLog.window != null) {
      wangLog.window.setVisible(visible);
    }
  }

  static enter(string) {
    if (wangLog.TRACE) {
      wangLog.writeln('Entering ' + string);
      return new Date().getTime();
    }
  }

  static leave(string, t0) {
    if (wangLog.TRACE) {
      let dt = t0 != 0 ? ' (' + (new Date().getTime() - t0) + ' ms)' : '';
      wangLog.writeln('Leaving ' + string + dt);
    }
  }

  static debug() {
    if (wangLog.DEBUG) {
      wangLog.writeln.apply(this, arguments);
    }
  }

  static warn() {
    if (wangLog.WARN) {
      wangLog.writeln.apply(this, arguments);
    }
  }

  static write() {
    let string = '';

    for (let i = 0; i < arguments.length; i++) {
      string += arguments[i];

      if (i < arguments.length - 1) {
        string += ' ';
      }
    }

    if (wangLog.textarea != null) {
      wangLog.textarea.value = wangLog.textarea.value + string;

      if (navigator.userAgent != null && navigator.userAgent.indexOf('Presto/2.5') >= 0) {
        wangLog.textarea.style.visibility = 'hidden';
        wangLog.textarea.style.visibility = 'visible';
      }

      wangLog.textarea.scrollTop = wangLog.textarea.scrollHeight;
    } else {
      wangLog.buffer += string;
    }
  }

  static writeln() {
    let string = '';

    for (let i = 0; i < arguments.length; i++) {
      string += arguments[i];

      if (i < arguments.length - 1) {
        string += ' ';
      }
    }

    wangLog.write(string + '\n');
  }
}
