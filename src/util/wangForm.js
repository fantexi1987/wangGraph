import { wangClient } from '@wangGraph/wangClient';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangForm {
  constructor(className) {
    this.table = document.createElement('table');
    this.table.className = className;
    this.body = document.createElement('tbody');
    this.table.appendChild(this.body);
  }

  getTable() {
    return this.table;
  }

  addButtons(okFunct, cancelFunct) {
    let tr = document.createElement('tr');
    let td = document.createElement('td');
    tr.appendChild(td);
    td = document.createElement('td');
    let button = document.createElement('button');
    wangUtils.write(button, wangResources.get('ok') || 'OK');
    td.appendChild(button);
    wangEvent.addListener(button, 'click', function () {
      okFunct();
    });
    button = document.createElement('button');
    wangUtils.write(button, wangResources.get('cancel') || 'Cancel');
    td.appendChild(button);
    wangEvent.addListener(button, 'click', function () {
      cancelFunct();
    });
    tr.appendChild(td);
    this.body.appendChild(tr);
  }

  addText(name, value, type) {
    let input = document.createElement('input');
    input.setAttribute('type', type || 'text');
    input.value = value;
    return this.addField(name, input);
  }

  addCheckbox(name, value) {
    let input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    this.addField(name, input);

    if (value) {
      input.checked = true;
    }

    return input;
  }

  addTextarea(name, value, rows) {
    let input = document.createElement('textarea');

    if (wangClient.IS_NS) {
      rows--;
    }

    input.setAttribute('rows', rows || 2);
    input.value = value;
    return this.addField(name, input);
  }

  addCombo(name, isMultiSelect, size) {
    let select = document.createElement('select');

    if (size != null) {
      select.setAttribute('size', size);
    }

    if (isMultiSelect) {
      select.setAttribute('multiple', 'true');
    }

    return this.addField(name, select);
  }

  addOption(combo, label, value, isSelected) {
    let option = document.createElement('option');
    wangUtils.writeln(option, label);
    option.setAttribute('value', value);

    if (isSelected) {
      option.setAttribute('selected', isSelected);
    }

    combo.appendChild(option);
  }

  addField(name, input) {
    let tr = document.createElement('tr');
    let td = document.createElement('td');
    wangUtils.write(td, name);
    tr.appendChild(td);
    td = document.createElement('td');
    td.appendChild(input);
    tr.appendChild(td);
    this.body.appendChild(tr);
    return input;
  }
}
