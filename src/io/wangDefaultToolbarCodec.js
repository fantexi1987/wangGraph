import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangDefaultToolbar } from '@wangGraph/editor/wangDefaultToolbar';

export class wangDefaultToolbarCodec extends wangObjectCodec {
  static allowEval = true;

  constructor() {
    super(new wangDefaultToolbar());
  }

  encode(enc, obj) {
    return null;
  }

  decode(dec, node, into) {
    if (into != null) {
      let editor = into.editor;
      node = node.firstChild;

      while (node != null) {
        if (node.nodeType == wangConstants.NODETYPE_ELEMENT) {
          if (!this.processInclude(dec, node, into)) {
            if (node.nodeName == 'separator') {
              into.addSeparator();
            } else if (node.nodeName == 'br') {
              into.toolbar.addBreak();
            } else if (node.nodeName == 'hr') {
              into.toolbar.addLine();
            } else if (node.nodeName == 'add') {
              let as = node.getAttribute('as');
              as = wangResources.get(as) || as;
              let icon = node.getAttribute('icon');
              let pressedIcon = node.getAttribute('pressedIcon');
              let action = node.getAttribute('action');
              let mode = node.getAttribute('mode');
              let template = node.getAttribute('template');
              let toggle = node.getAttribute('toggle') != '0';
              let text = wangUtils.getTextContent(node);
              let elt = null;

              if (action != null) {
                elt = into.addItem(as, icon, action, pressedIcon);
              } else if (mode != null) {
                let funct = wangDefaultToolbarCodec.allowEval ? wangUtils.eval(text) : null;
                elt = into.addMode(as, icon, mode, pressedIcon, funct);
              } else if (template != null || (text != null && text.length > 0)) {
                let cell = editor.templates[template];
                let style = node.getAttribute('style');

                if (cell != null && style != null) {
                  cell = editor.graph.cloneCell(cell);
                  cell.setStyle(style);
                }

                let insertFunction = null;

                if (text != null && text.length > 0 && wangDefaultToolbarCodec.allowEval) {
                  insertFunction = wangUtils.eval(text);
                }

                elt = into.addPrototype(as, icon, cell, pressedIcon, insertFunction, toggle);
              } else {
                let children = wangUtils.getChildNodes(node);

                if (children.length > 0) {
                  if (icon == null) {
                    let combo = into.addActionCombo(as);

                    for (let i = 0; i < children.length; i++) {
                      let child = children[i];

                      if (child.nodeName == 'separator') {
                        into.addOption(combo, '---');
                      } else if (child.nodeName == 'add') {
                        let lab = child.getAttribute('as');
                        let act = child.getAttribute('action');
                        into.addActionOption(combo, lab, act);
                      }
                    }
                  } else {
                    let select = null;

                    let create = function () {
                      let template = editor.templates[select.value];

                      if (template != null) {
                        let clone = template.clone();
                        let style = select.options[select.selectedIndex].cellStyle;

                        if (style != null) {
                          clone.setStyle(style);
                        }

                        return clone;
                      } else {
                        wangLog.warn('Template ' + template + ' not found');
                      }

                      return null;
                    };

                    let img = into.addPrototype(as, icon, create, null, null, toggle);
                    select = into.addCombo();
                    wangEvent.addListener(select, 'change', function () {
                      into.toolbar.selectMode(img, function (evt) {
                        let pt = wangUtils.convertPoint(
                          editor.graph.container,
                          wangEvent.getClientX(evt),
                          wangEvent.getClientY(evt)
                        );
                        return editor.addVertex(null, funct(), pt.x, pt.y);
                      });
                      into.toolbar.noReset = false;
                    });

                    for (let i = 0; i < children.length; i++) {
                      let child = children[i];

                      if (child.nodeName == 'separator') {
                        into.addOption(select, '---');
                      } else if (child.nodeName == 'add') {
                        let lab = child.getAttribute('as');
                        let tmp = child.getAttribute('template');
                        let option = into.addOption(select, lab, tmp || template);
                        option.cellStyle = child.getAttribute('style');
                      }
                    }
                  }
                }
              }

              if (elt != null) {
                let id = node.getAttribute('id');

                if (id != null && id.length > 0) {
                  elt.setAttribute('id', id);
                }
              }
            }
          }
        }

        node = node.nextSibling;
      }
    }

    return into;
  }
}
