import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangResources } from '@wangGraph/util/wangResources';

export class wangDefaultPopupMenu {
  imageBasePath = null;

  constructor(config) {
    this.config = config;
  }

  createMenu(editor, menu, cell, evt) {
    if (this.config != null) {
      let conditions = this.createConditions(editor, cell, evt);
      let item = this.config.firstChild;
      this.addItems(editor, menu, cell, evt, conditions, item, null);
    }
  }

  addItems(editor, menu, cell, evt, conditions, item, parent) {
    let addSeparator = false;

    while (item != null) {
      if (item.nodeName == 'add') {
        let condition = item.getAttribute('if');

        if (condition == null || conditions[condition]) {
          let as = item.getAttribute('as');
          as = wangResources.get(as) || as;
          let funct = wangUtils.eval(wangUtils.getTextContent(item));
          let action = item.getAttribute('action');
          let icon = item.getAttribute('icon');
          let iconCls = item.getAttribute('iconCls');
          let enabledCond = item.getAttribute('enabled-if');
          let enabled = enabledCond == null || conditions[enabledCond];

          if (addSeparator) {
            menu.addSeparator(parent);
            addSeparator = false;
          }

          if (icon != null && this.imageBasePath) {
            icon = this.imageBasePath + icon;
          }

          let row = this.addAction(menu, editor, as, icon, funct, action, cell, parent, iconCls, enabled);
          this.addItems(editor, menu, cell, evt, conditions, item.firstChild, row);
        }
      } else if (item.nodeName == 'separator') {
        addSeparator = true;
      }

      item = item.nextSibling;
    }
  }

  addAction(menu, editor, lab, icon, funct, action, cell, parent, iconCls, enabled) {
    let clickHandler = function (evt) {
      if (typeof funct == 'function') {
        funct.call(editor, editor, cell, evt);
      }

      if (action != null) {
        editor.execute(action, cell, evt);
      }
    };

    return menu.addItem(lab, icon, clickHandler, parent, iconCls, enabled);
  }

  createConditions(editor, cell, evt) {
    let model = editor.graph.getModel();
    let childCount = model.getChildCount(cell);
    let conditions = [];
    conditions['nocell'] = cell == null;
    conditions['ncells'] = editor.graph.getSelectionCount() > 1;
    conditions['notRoot'] = model.getRoot() != model.getParent(editor.graph.getDefaultParent());
    conditions['cell'] = cell != null;
    let isCell = cell != null && editor.graph.getSelectionCount() == 1;
    conditions['nonEmpty'] = isCell && childCount > 0;
    conditions['expandable'] = isCell && editor.graph.isCellFoldable(cell, false);
    conditions['collapsable'] = isCell && editor.graph.isCellFoldable(cell, true);
    conditions['validRoot'] = isCell && editor.graph.isValidRoot(cell);
    conditions['emptyValidRoot'] = conditions['validRoot'] && childCount == 0;
    conditions['swimlane'] = isCell && editor.graph.isSwimlane(cell);
    let condNodes = this.config.getElementsByTagName('condition');

    for (let i = 0; i < condNodes.length; i++) {
      let funct = wangUtils.eval(wangUtils.getTextContent(condNodes[i]));
      let name = condNodes[i].getAttribute('name');

      if (name != null && typeof funct == 'function') {
        conditions[name] = funct(editor, cell, evt);
      }
    }

    return conditions;
  }
}
