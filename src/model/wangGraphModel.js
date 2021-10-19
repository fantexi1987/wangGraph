import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';
import { wangUndoableEdit } from '@wangGraph/util/wangUndoableEdit';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangVisibleChange } from '@wangGraph/model/changes/wangVisibleChange';
import { wangCollapseChange } from '@wangGraph/model/changes/wangCollapseChange';
import { wangStyleChange } from '@wangGraph/model/changes/wangStyleChange';
import { wangGeometryChange } from '@wangGraph/model/changes/wangGeometryChange';
import { wangValueChange } from '@wangGraph/model/changes/wangValueChange';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangTerminalChange } from '@wangGraph/model/changes/wangTerminalChange';
import { wangCellPath } from '@wangGraph/model/wangCellPath';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangChildChange } from '@wangGraph/model/changes/wangChildChange';
import { wangRootChange } from '@wangGraph/model/changes/wangRootChange';
import { wangCell } from '@wangGraph/model/wangCell';

export class wangGraphModel extends wangEventSource {
  root = null;
  cells = null;
  maintainEdgeParent = true;
  ignoreRelativeEdgeParent = true;
  createIds = true;
  prefix = '';
  postfix = '';
  nextId = 0;
  updateLevel = 0;
  endingUpdate = false;

  constructor(root) {
    super();
    this.currentEdit = this.createUndoableEdit();

    if (root != null) {
      this.setRoot(root);
    } else {
      this.clear();
    }
  }

  clear() {
    this.setRoot(this.createRoot());
  }

  isCreateIds() {
    return this.createIds;
  }

  setCreateIds(value) {
    this.createIds = value;
  }

  createRoot() {
    let cell = new wangCell();
    cell.insert(new wangCell());
    return cell;
  }

  getCell(id) {
    return this.cells != null ? this.cells[id] : null;
  }

  filterCells(cells, filter) {
    let result = null;

    if (cells != null) {
      result = [];

      for (let i = 0; i < cells.length; i++) {
        if (filter(cells[i])) {
          result.push(cells[i]);
        }
      }
    }

    return result;
  }

  getDescendants(parent) {
    return this.filterDescendants(null, parent);
  }

  filterDescendants(filter, parent) {
    let result = [];
    parent = parent || this.getRoot();

    if (filter == null || filter(parent)) {
      result.push(parent);
    }

    let childCount = this.getChildCount(parent);

    for (let i = 0; i < childCount; i++) {
      let child = this.getChildAt(parent, i);
      result = result.concat(this.filterDescendants(filter, child));
    }

    return result;
  }

  getRoot(cell) {
    let root = cell || this.root;

    if (cell != null) {
      while (cell != null) {
        root = cell;
        cell = this.getParent(cell);
      }
    }

    return root;
  }

  setRoot(root) {
    this.execute(new wangRootChange(this, root));
    return root;
  }

  rootChanged(root) {
    let oldRoot = this.root;
    this.root = root;
    this.nextId = 0;
    this.cells = null;
    this.cellAdded(root);
    return oldRoot;
  }

  isRoot(cell) {
    return cell != null && this.root == cell;
  }

  isLayer(cell) {
    return this.isRoot(this.getParent(cell));
  }

  isAncestor(parent, child) {
    while (child != null && child != parent) {
      child = this.getParent(child);
    }

    return child == parent;
  }

  contains(cell) {
    return this.isAncestor(this.root, cell);
  }

  getParent(cell) {
    return cell != null ? cell.getParent() : null;
  }

  add(parent, child, index) {
    if (child != parent && parent != null && child != null) {
      if (index == null) {
        index = this.getChildCount(parent);
      }

      let parentChanged = parent != this.getParent(child);
      this.execute(new wangChildChange(this, parent, child, index));

      if (this.maintainEdgeParent && parentChanged) {
        this.updateEdgeParents(child);
      }
    }

    return child;
  }

  cellAdded(cell) {
    if (cell != null) {
      if (cell.getId() == null && this.createIds) {
        cell.setId(this.createId(cell));
      }

      if (cell.getId() != null) {
        let collision = this.getCell(cell.getId());

        if (collision != cell) {
          while (collision != null) {
            cell.setId(this.createId(cell));
            collision = this.getCell(cell.getId());
          }

          if (this.cells == null) {
            this.cells = new Object();
          }

          this.cells[cell.getId()] = cell;
        }
      }

      if (wangUtils.isNumeric(cell.getId())) {
        this.nextId = Math.max(this.nextId, cell.getId());
      }

      let childCount = this.getChildCount(cell);

      for (let i = 0; i < childCount; i++) {
        this.cellAdded(this.getChildAt(cell, i));
      }
    }
  }

  createId(cell) {
    let id = this.nextId;
    this.nextId++;
    return this.prefix + id + this.postfix;
  }

  updateEdgeParents(cell, root) {
    root = root || this.getRoot(cell);
    let childCount = this.getChildCount(cell);

    for (let i = 0; i < childCount; i++) {
      let child = this.getChildAt(cell, i);
      this.updateEdgeParents(child, root);
    }

    let edgeCount = this.getEdgeCount(cell);
    let edges = [];

    for (let i = 0; i < edgeCount; i++) {
      edges.push(this.getEdgeAt(cell, i));
    }

    for (let i = 0; i < edges.length; i++) {
      let edge = edges[i];

      if (this.isAncestor(root, edge)) {
        this.updateEdgeParent(edge, root);
      }
    }
  }

  updateEdgeParent(edge, root) {
    let source = this.getTerminal(edge, true);
    let target = this.getTerminal(edge, false);
    let cell = null;

    while (source != null && !this.isEdge(source) && source.geometry != null && source.geometry.relative) {
      source = this.getParent(source);
    }

    while (
      target != null &&
      this.ignoreRelativeEdgeParent &&
      !this.isEdge(target) &&
      target.geometry != null &&
      target.geometry.relative
    ) {
      target = this.getParent(target);
    }

    if (this.isAncestor(root, source) && this.isAncestor(root, target)) {
      if (source == target) {
        cell = this.getParent(source);
      } else {
        cell = this.getNearestCommonAncestor(source, target);
      }

      if (
        cell != null &&
        (this.getParent(cell) != this.root || this.isAncestor(cell, edge)) &&
        this.getParent(edge) != cell
      ) {
        let geo = this.getGeometry(edge);

        if (geo != null) {
          let origin1 = this.getOrigin(this.getParent(edge));
          let origin2 = this.getOrigin(cell);
          let dx = origin2.x - origin1.x;
          let dy = origin2.y - origin1.y;
          geo = geo.clone();
          geo.translate(-dx, -dy);
          this.setGeometry(edge, geo);
        }

        this.add(cell, edge, this.getChildCount(cell));
      }
    }
  }

  getOrigin(cell) {
    let result = null;

    if (cell != null) {
      result = this.getOrigin(this.getParent(cell));

      if (!this.isEdge(cell)) {
        let geo = this.getGeometry(cell);

        if (geo != null) {
          result.x += geo.x;
          result.y += geo.y;
        }
      }
    } else {
      result = new wangPoint();
    }

    return result;
  }

  getNearestCommonAncestor(cell1, cell2) {
    if (cell1 != null && cell2 != null) {
      let path = wangCellPath.create(cell2);

      if (path != null && path.length > 0) {
        let cell = cell1;
        let current = wangCellPath.create(cell);

        if (path.length < current.length) {
          cell = cell2;
          let tmp = current;
          current = path;
          path = tmp;
        }

        while (cell != null) {
          let parent = this.getParent(cell);

          if (path.indexOf(current + wangCellPath.PATH_SEPARATOR) == 0 && parent != null) {
            return cell;
          }

          current = wangCellPath.getParentPath(current);
          cell = parent;
        }
      }
    }

    return null;
  }

  remove(cell) {
    if (cell == this.root) {
      this.setRoot(null);
    } else if (this.getParent(cell) != null) {
      this.execute(new wangChildChange(this, null, cell));
    }

    return cell;
  }

  cellRemoved(cell) {
    if (cell != null && this.cells != null) {
      let childCount = this.getChildCount(cell);

      for (let i = childCount - 1; i >= 0; i--) {
        this.cellRemoved(this.getChildAt(cell, i));
      }

      if (this.cells != null && cell.getId() != null) {
        delete this.cells[cell.getId()];
      }
    }
  }

  parentForCellChanged(cell, parent, index) {
    let previous = this.getParent(cell);

    if (parent != null) {
      if (parent != previous || previous.getIndex(cell) != index) {
        parent.insert(cell, index);
      }
    } else if (previous != null) {
      let oldIndex = previous.getIndex(cell);
      previous.remove(oldIndex);
    }

    let par = this.contains(parent);
    let pre = this.contains(previous);

    if (par && !pre) {
      this.cellAdded(cell);
    } else if (pre && !par) {
      this.cellRemoved(cell);
    }

    return previous;
  }

  getChildCount(cell) {
    return cell != null ? cell.getChildCount() : 0;
  }

  getChildAt(cell, index) {
    return cell != null ? cell.getChildAt(index) : null;
  }

  getChildren(cell) {
    return cell != null ? cell.children : null;
  }

  getChildVertices(parent) {
    return this.getChildCells(parent, true, false);
  }

  getChildEdges(parent) {
    return this.getChildCells(parent, false, true);
  }

  getChildCells(parent, vertices, edges) {
    vertices = vertices != null ? vertices : false;
    edges = edges != null ? edges : false;
    let childCount = this.getChildCount(parent);
    let result = [];

    for (let i = 0; i < childCount; i++) {
      let child = this.getChildAt(parent, i);

      if ((!edges && !vertices) || (edges && this.isEdge(child)) || (vertices && this.isVertex(child))) {
        result.push(child);
      }
    }

    return result;
  }

  getTerminal(edge, isSource) {
    return edge != null ? edge.getTerminal(isSource) : null;
  }

  setTerminal(edge, terminal, isSource) {
    let terminalChanged = terminal != this.getTerminal(edge, isSource);
    this.execute(new wangTerminalChange(this, edge, terminal, isSource));

    if (this.maintainEdgeParent && terminalChanged) {
      this.updateEdgeParent(edge, this.getRoot());
    }

    return terminal;
  }

  setTerminals(edge, source, target) {
    this.beginUpdate();

    try {
      this.setTerminal(edge, source, true);
      this.setTerminal(edge, target, false);
    } finally {
      this.endUpdate();
    }
  }

  terminalForCellChanged(edge, terminal, isSource) {
    let previous = this.getTerminal(edge, isSource);

    if (terminal != null) {
      terminal.insertEdge(edge, isSource);
    } else if (previous != null) {
      previous.removeEdge(edge, isSource);
    }

    return previous;
  }

  getEdgeCount(cell) {
    return cell != null ? cell.getEdgeCount() : 0;
  }

  getEdgeAt(cell, index) {
    return cell != null ? cell.getEdgeAt(index) : null;
  }

  getDirectedEdgeCount(cell, outgoing, ignoredEdge) {
    let count = 0;
    let edgeCount = this.getEdgeCount(cell);

    for (let i = 0; i < edgeCount; i++) {
      let edge = this.getEdgeAt(cell, i);

      if (edge != ignoredEdge && this.getTerminal(edge, outgoing) == cell) {
        count++;
      }
    }

    return count;
  }

  getConnections(cell) {
    return this.getEdges(cell, true, true, false);
  }

  getIncomingEdges(cell) {
    return this.getEdges(cell, true, false, false);
  }

  getOutgoingEdges(cell) {
    return this.getEdges(cell, false, true, false);
  }

  getEdges(cell, incoming, outgoing, includeLoops) {
    incoming = incoming != null ? incoming : true;
    outgoing = outgoing != null ? outgoing : true;
    includeLoops = includeLoops != null ? includeLoops : true;
    let edgeCount = this.getEdgeCount(cell);
    let result = [];

    for (let i = 0; i < edgeCount; i++) {
      let edge = this.getEdgeAt(cell, i);
      let source = this.getTerminal(edge, true);
      let target = this.getTerminal(edge, false);

      if (
        (includeLoops && source == target) ||
        (source != target && ((incoming && target == cell) || (outgoing && source == cell)))
      ) {
        result.push(edge);
      }
    }

    return result;
  }

  getEdgesBetween(source, target, directed) {
    directed = directed != null ? directed : false;
    let tmp1 = this.getEdgeCount(source);
    let tmp2 = this.getEdgeCount(target);
    let terminal = source;
    let edgeCount = tmp1;

    if (tmp2 < tmp1) {
      edgeCount = tmp2;
      terminal = target;
    }

    let result = [];

    for (let i = 0; i < edgeCount; i++) {
      let edge = this.getEdgeAt(terminal, i);
      let src = this.getTerminal(edge, true);
      let trg = this.getTerminal(edge, false);
      let directedMatch = src == source && trg == target;
      let oppositeMatch = trg == source && src == target;

      if (directedMatch || (!directed && oppositeMatch)) {
        result.push(edge);
      }
    }

    return result;
  }

  getOpposites(edges, terminal, sources, targets) {
    sources = sources != null ? sources : true;
    targets = targets != null ? targets : true;
    let terminals = [];

    if (edges != null) {
      for (let i = 0; i < edges.length; i++) {
        let source = this.getTerminal(edges[i], true);
        let target = this.getTerminal(edges[i], false);

        if (source == terminal && target != null && target != terminal && targets) {
          terminals.push(target);
        } else if (target == terminal && source != null && source != terminal && sources) {
          terminals.push(source);
        }
      }
    }

    return terminals;
  }

  getTopmostCells(cells) {
    let dict = new wangDictionary();
    let tmp = [];

    for (let i = 0; i < cells.length; i++) {
      dict.put(cells[i], true);
    }

    for (let i = 0; i < cells.length; i++) {
      let cell = cells[i];
      let topmost = true;
      let parent = this.getParent(cell);

      while (parent != null) {
        if (dict.get(parent)) {
          topmost = false;
          break;
        }

        parent = this.getParent(parent);
      }

      if (topmost) {
        tmp.push(cell);
      }
    }

    return tmp;
  }

  isVertex(cell) {
    return cell != null ? cell.isVertex() : false;
  }

  isEdge(cell) {
    return cell != null ? cell.isEdge() : false;
  }

  isConnectable(cell) {
    return cell != null ? cell.isConnectable() : false;
  }

  getValue(cell) {
    return cell != null ? cell.getValue() : null;
  }

  setValue(cell, value) {
    this.execute(new wangValueChange(this, cell, value));
    return value;
  }

  valueForCellChanged(cell, value) {
    return cell.valueChanged(value);
  }

  getGeometry(cell) {
    return cell != null ? cell.getGeometry() : null;
  }

  setGeometry(cell, geometry) {
    if (geometry != this.getGeometry(cell)) {
      this.execute(new wangGeometryChange(this, cell, geometry));
    }

    return geometry;
  }

  geometryForCellChanged(cell, geometry) {
    let previous = this.getGeometry(cell);
    cell.setGeometry(geometry);
    return previous;
  }

  getStyle(cell) {
    return cell != null ? cell.getStyle() : null;
  }

  setStyle(cell, style) {
    if (style != this.getStyle(cell)) {
      this.execute(new wangStyleChange(this, cell, style));
    }

    return style;
  }

  styleForCellChanged(cell, style) {
    let previous = this.getStyle(cell);
    cell.setStyle(style);
    return previous;
  }

  isCollapsed(cell) {
    return cell != null ? cell.isCollapsed() : false;
  }

  setCollapsed(cell, collapsed) {
    if (collapsed != this.isCollapsed(cell)) {
      this.execute(new wangCollapseChange(this, cell, collapsed));
    }

    return collapsed;
  }

  collapsedStateForCellChanged(cell, collapsed) {
    let previous = this.isCollapsed(cell);
    cell.setCollapsed(collapsed);
    return previous;
  }

  isVisible(cell) {
    return cell != null ? cell.isVisible() : false;
  }

  setVisible(cell, visible) {
    if (visible != this.isVisible(cell)) {
      this.execute(new wangVisibleChange(this, cell, visible));
    }

    return visible;
  }

  visibleStateForCellChanged(cell, visible) {
    let previous = this.isVisible(cell);
    cell.setVisible(visible);
    return previous;
  }

  execute(change) {
    change.execute();
    this.beginUpdate();
    this.currentEdit.add(change);
    this.fireEvent(new wangEventObject(wangEvent.EXECUTE, 'change', change));
    this.fireEvent(new wangEventObject(wangEvent.EXECUTED, 'change', change));
    this.endUpdate();
  }

  beginUpdate() {
    this.updateLevel++;
    this.fireEvent(new wangEventObject(wangEvent.BEGIN_UPDATE));

    if (this.updateLevel == 1) {
      this.fireEvent(new wangEventObject(wangEvent.START_EDIT));
    }
  }

  endUpdate() {
    this.updateLevel--;

    if (this.updateLevel == 0) {
      this.fireEvent(new wangEventObject(wangEvent.END_EDIT));
    }

    if (!this.endingUpdate) {
      this.endingUpdate = this.updateLevel == 0;
      this.fireEvent(new wangEventObject(wangEvent.END_UPDATE, 'edit', this.currentEdit));

      try {
        if (this.endingUpdate && !this.currentEdit.isEmpty()) {
          this.fireEvent(new wangEventObject(wangEvent.BEFORE_UNDO, 'edit', this.currentEdit));
          let tmp = this.currentEdit;
          this.currentEdit = this.createUndoableEdit();
          tmp.notify();
          this.fireEvent(new wangEventObject(wangEvent.UNDO, 'edit', tmp));
        }
      } finally {
        this.endingUpdate = false;
      }
    }
  }

  createUndoableEdit(significant) {
    let edit = new wangUndoableEdit(this, significant != null ? significant : true);

    edit.notify = function () {
      edit.source.fireEvent(new wangEventObject(wangEvent.CHANGE, 'edit', edit, 'changes', edit.changes));
      edit.source.fireEvent(new wangEventObject(wangEvent.NOTIFY, 'edit', edit, 'changes', edit.changes));
    };

    return edit;
  }

  mergeChildren(from, to, cloneAllEdges) {
    cloneAllEdges = cloneAllEdges != null ? cloneAllEdges : true;
    this.beginUpdate();

    try {
      let mapping = new Object();
      this.mergeChildrenImpl(from, to, cloneAllEdges, mapping);

      for (let key in mapping) {
        let cell = mapping[key];
        let terminal = this.getTerminal(cell, true);

        if (terminal != null) {
          terminal = mapping[wangCellPath.create(terminal)];
          this.setTerminal(cell, terminal, true);
        }

        terminal = this.getTerminal(cell, false);

        if (terminal != null) {
          terminal = mapping[wangCellPath.create(terminal)];
          this.setTerminal(cell, terminal, false);
        }
      }
    } finally {
      this.endUpdate();
    }
  }

  mergeChildrenImpl(from, to, cloneAllEdges, mapping) {
    this.beginUpdate();

    try {
      let childCount = from.getChildCount();

      for (let i = 0; i < childCount; i++) {
        let cell = from.getChildAt(i);

        if (typeof cell.getId == 'function') {
          let id = cell.getId();
          let target = id != null && (!this.isEdge(cell) || !cloneAllEdges) ? this.getCell(id) : null;

          if (target == null) {
            let clone = cell.clone();
            clone.setId(id);
            clone.setTerminal(cell.getTerminal(true), true);
            clone.setTerminal(cell.getTerminal(false), false);
            target = to.insert(clone);
            this.cellAdded(target);
          }

          mapping[wangCellPath.create(cell)] = target;
          this.mergeChildrenImpl(cell, target, cloneAllEdges, mapping);
        }
      }
    } finally {
      this.endUpdate();
    }
  }

  getParents(cells) {
    let parents = [];

    if (cells != null) {
      let dict = new wangDictionary();

      for (let i = 0; i < cells.length; i++) {
        let parent = this.getParent(cells[i]);

        if (parent != null && !dict.get(parent)) {
          dict.put(parent, true);
          parents.push(parent);
        }
      }
    }

    return parents;
  }

  cloneCell(cell, includeChildren) {
    if (cell != null) {
      return this.cloneCells([cell], includeChildren)[0];
    }

    return null;
  }

  cloneCells(cells, includeChildren, mapping) {
    includeChildren = includeChildren != null ? includeChildren : true;
    mapping = mapping != null ? mapping : new Object();
    let clones = [];

    for (let i = 0; i < cells.length; i++) {
      if (cells[i] != null) {
        clones.push(this.cloneCellImpl(cells[i], mapping, includeChildren));
      } else {
        clones.push(null);
      }
    }

    for (let i = 0; i < clones.length; i++) {
      if (clones[i] != null) {
        this.restoreClone(clones[i], cells[i], mapping);
      }
    }

    return clones;
  }

  cloneCellImpl(cell, mapping, includeChildren) {
    let ident = wangObjectIdentity.get(cell);
    let clone = mapping[ident];

    if (clone == null) {
      clone = this.cellCloned(cell);
      mapping[ident] = clone;

      if (includeChildren) {
        let childCount = this.getChildCount(cell);

        for (let i = 0; i < childCount; i++) {
          let cloneChild = this.cloneCellImpl(this.getChildAt(cell, i), mapping, true);
          clone.insert(cloneChild);
        }
      }
    }

    return clone;
  }

  cellCloned(cell) {
    return cell.clone();
  }

  restoreClone(clone, cell, mapping) {
    let source = this.getTerminal(cell, true);

    if (source != null) {
      let tmp = mapping[wangObjectIdentity.get(source)];

      if (tmp != null) {
        tmp.insertEdge(clone, true);
      }
    }

    let target = this.getTerminal(cell, false);

    if (target != null) {
      let tmp = mapping[wangObjectIdentity.get(target)];

      if (tmp != null) {
        tmp.insertEdge(clone, false);
      }
    }

    let childCount = this.getChildCount(clone);

    for (let i = 0; i < childCount; i++) {
      this.restoreClone(this.getChildAt(clone, i), this.getChildAt(cell, i), mapping);
    }
  }
}
