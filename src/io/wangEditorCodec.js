import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangClient } from '@wangGraph/wangClient';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangWindow } from '@wangGraph/util/wangWindow';
import { wangEditor } from '@wangGraph/editor/wangEditor';

export class wangEditorCodec extends wangObjectCodec {
  constructor() {
    super(new wangEditor(), [
      'modified',
      'lastSnapshot',
      'ignoredChanges',
      'undoManager',
      'graphContainer',
      'toolbarContainer'
    ]);
  }

  afterDecode(dec, node, obj) {
    let defaultEdge = node.getAttribute('defaultEdge');

    if (defaultEdge != null) {
      node.removeAttribute('defaultEdge');
      obj.defaultEdge = obj.templates[defaultEdge];
    }

    let defaultGroup = node.getAttribute('defaultGroup');

    if (defaultGroup != null) {
      node.removeAttribute('defaultGroup');
      obj.defaultGroup = obj.templates[defaultGroup];
    }

    return obj;
  }

  decodeChild(dec, child, obj) {
    if (child.nodeName == 'Array') {
      let role = child.getAttribute('as');

      if (role == 'templates') {
        this.decodeTemplates(dec, child, obj);
        return;
      }
    } else if (child.nodeName == 'ui') {
      this.decodeUi(dec, child, obj);
      return;
    }

    super.decodeChild(dec, child, obj);
  }

  decodeUi(dec, node, editor) {
    let tmp = node.firstChild;

    while (tmp != null) {
      if (tmp.nodeName == 'add') {
        let as = tmp.getAttribute('as');
        let elt = tmp.getAttribute('element');
        let style = tmp.getAttribute('style');
        let element = null;

        if (elt != null) {
          element = document.getElementById(elt);

          if (element != null && style != null) {
            element.style.cssText += ';' + style;
          }
        } else {
          let x = parseInt(tmp.getAttribute('x'));
          let y = parseInt(tmp.getAttribute('y'));
          let width = tmp.getAttribute('width');
          let height = tmp.getAttribute('height');
          element = document.createElement('div');
          element.style.cssText = style;
          let wnd = new wangWindow(wangResources.get(as) || as, element, x, y, width, height, false, true);
          wnd.setVisible(true);
        }

        if (as == 'graph') {
          editor.setGraphContainer(element);
        } else if (as == 'toolbar') {
          editor.setToolbarContainer(element);
        } else if (as == 'title') {
          editor.setTitleContainer(element);
        } else if (as == 'status') {
          editor.setStatusContainer(element);
        } else if (as == 'map') {
          editor.setMapContainer(element);
        }
      } else if (tmp.nodeName == 'resource') {
        wangResources.add(tmp.getAttribute('basename'));
      } else if (tmp.nodeName == 'stylesheet') {
        wangClient.link('stylesheet', tmp.getAttribute('name'));
      }

      tmp = tmp.nextSibling;
    }
  }

  decodeTemplates(dec, node, editor) {
    if (editor.templates == null) {
      editor.templates = [];
    }

    let children = wangUtils.getChildNodes(node);

    for (let j = 0; j < children.length; j++) {
      let name = children[j].getAttribute('as');
      let child = children[j].firstChild;

      while (child != null && child.nodeType != 1) {
        child = child.nextSibling;
      }

      if (child != null) {
        editor.templates[name] = dec.decodeCell(child);
      }
    }
  }
}
