import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangResources } from '@wangGraph/util/wangResources';

export class wangMultiplicity {
  constructor(source, type, attr, value, min, max, validNeighbors, countError, typeError, validNeighborsAllowed) {
    this.source = source;
    this.type = type;
    this.attr = attr;
    this.value = value;
    this.min = min != null ? min : 0;
    this.max = max != null ? max : 'n';
    this.validNeighbors = validNeighbors;
    this.countError = wangResources.get(countError) || countError;
    this.typeError = wangResources.get(typeError) || typeError;
    this.validNeighborsAllowed = validNeighborsAllowed != null ? validNeighborsAllowed : true;
  }

  check(graph, edge, source, target, sourceOut, targetIn) {
    let error = '';

    if (
      (this.source && this.checkTerminal(graph, source, edge)) ||
      (!this.source && this.checkTerminal(graph, target, edge))
    ) {
      if (
        this.countError != null &&
        ((this.source && (this.max == 0 || sourceOut >= this.max)) ||
          (!this.source && (this.max == 0 || targetIn >= this.max)))
      ) {
        error += this.countError + '\n';
      }

      if (this.validNeighbors != null && this.typeError != null && this.validNeighbors.length > 0) {
        let isValid = this.checkNeighbors(graph, edge, source, target);

        if (!isValid) {
          error += this.typeError + '\n';
        }
      }
    }

    return error.length > 0 ? error : null;
  }

  checkNeighbors(graph, edge, source, target) {
    let sourceValue = graph.model.getValue(source);
    let targetValue = graph.model.getValue(target);
    let isValid = !this.validNeighborsAllowed;
    let valid = this.validNeighbors;

    for (let j = 0; j < valid.length; j++) {
      if (this.source && this.checkType(graph, targetValue, valid[j])) {
        isValid = this.validNeighborsAllowed;
        break;
      } else if (!this.source && this.checkType(graph, sourceValue, valid[j])) {
        isValid = this.validNeighborsAllowed;
        break;
      }
    }

    return isValid;
  }

  checkTerminal(graph, terminal, edge) {
    let value = graph.model.getValue(terminal);
    return this.checkType(graph, value, this.type, this.attr, this.value);
  }

  checkType(graph, value, type, attr, attrValue) {
    if (value != null) {
      if (!isNaN(value.nodeType)) {
        return wangUtils.isNode(value, type, attr, attrValue);
      } else {
        return value == type;
      }
    }

    return false;
  }
}
