import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';
import { wangCoordinateAssignment } from '@wangGraph/layout/hierarchical/stage/wangCoordinateAssignment';
import { wangMedianHybridCrossingReduction } from '@wangGraph/layout/hierarchical/stage/wangMedianHybridCrossingReduction';
import { wangMinimumCycleRemover } from '@wangGraph/layout/hierarchical/stage/wangMinimumCycleRemover';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';
import { wangGraphHierarchyModel } from '@wangGraph/layout/hierarchical/model/wangGraphHierarchyModel';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangHierarchicalEdgeStyle } from '@wangGraph/layout/hierarchical/wangHierarchicalEdgeStyle';

export class wangHierarchicalLayout extends wangGraphLayout {
  roots = null;
  resizeParent = false;
  maintainParentLocation = false;
  moveParent = false;
  parentBorder = 0;
  intraCellSpacing = 30;
  interRankCellSpacing = 100;
  interHierarchySpacing = 60;
  parallelEdgeSpacing = 10;
  fineTuning = true;
  tightenToSource = true;
  disableEdgeStyle = true;
  traverseAncestors = true;
  model = null;
  edgesCache = null;
  edgeSourceTermCache = null;
  edgesTargetTermCache = null;
  edgeStyle = wangHierarchicalEdgeStyle.POLYLINE;

  constructor(graph, orientation, deterministic) {
    super(graph);
    this.orientation = orientation != null ? orientation : wangConstants.DIRECTION_NORTH;
    this.deterministic = deterministic != null ? deterministic : true;
  }

  getModel() {
    return this.model;
  }

  execute(parent, roots) {
    this.parent = parent;
    let model = this.graph.model;
    this.edgesCache = new wangDictionary();
    this.edgeSourceTermCache = new wangDictionary();
    this.edgesTargetTermCache = new wangDictionary();

    if (roots != null && !(roots instanceof Array)) {
      roots = [roots];
    }

    if (roots == null && parent == null) {
      return;
    }

    this.parentX = null;
    this.parentY = null;

    if (parent != this.root && model.isVertex(parent) != null && this.maintainParentLocation) {
      let geo = this.graph.getCellGeometry(parent);

      if (geo != null) {
        this.parentX = geo.x;
        this.parentY = geo.y;
      }
    }

    if (roots != null) {
      let rootsCopy = [];

      for (let i = 0; i < roots.length; i++) {
        let ancestor = parent != null ? model.isAncestor(parent, roots[i]) : true;

        if (ancestor && model.isVertex(roots[i])) {
          rootsCopy.push(roots[i]);
        }
      }

      this.roots = rootsCopy;
    }

    model.beginUpdate();

    try {
      this.run(parent);

      if (this.resizeParent && !this.graph.isCellCollapsed(parent)) {
        this.graph.updateGroupBounds([parent], this.parentBorder, this.moveParent);
      }

      if (this.parentX != null && this.parentY != null) {
        let geo = this.graph.getCellGeometry(parent);

        if (geo != null) {
          geo = geo.clone();
          geo.x = this.parentX;
          geo.y = this.parentY;
          model.setGeometry(parent, geo);
        }
      }
    } finally {
      model.endUpdate();
    }
  }

  findRoots(parent, vertices) {
    let roots = [];

    if (parent != null && vertices != null) {
      let model = this.graph.model;
      let best = null;
      let maxDiff = -100000;

      for (let i in vertices) {
        let cell = vertices[i];

        if (model.isVertex(cell) && this.graph.isCellVisible(cell)) {
          let conns = this.getEdges(cell);
          let fanOut = 0;
          let fanIn = 0;

          for (let k = 0; k < conns.length; k++) {
            let src = this.getVisibleterminal(conns[k], true);

            if (src == cell) {
              fanOut++;
            } else {
              fanIn++;
            }
          }

          if (fanIn == 0 && fanOut > 0) {
            roots.push(cell);
          }

          let diff = fanOut - fanIn;

          if (diff > maxDiff) {
            maxDiff = diff;
            best = cell;
          }
        }
      }

      if (roots.length == 0 && best != null) {
        roots.push(best);
      }
    }

    return roots;
  }

  getEdges(cell) {
    let cachedEdges = this.edgesCache.get(cell);

    if (cachedEdges != null) {
      return cachedEdges;
    }

    let model = this.graph.model;
    let edges = [];
    let isCollapsed = this.graph.isCellCollapsed(cell);
    let childCount = model.getChildCount(cell);

    for (let i = 0; i < childCount; i++) {
      let child = model.getChildAt(cell, i);

      if (this.isPort(child)) {
        edges = edges.concat(model.getEdges(child, true, true));
      } else if (isCollapsed || !this.graph.isCellVisible(child)) {
        edges = edges.concat(model.getEdges(child, true, true));
      }
    }

    edges = edges.concat(model.getEdges(cell, true, true));
    let result = [];

    for (let i = 0; i < edges.length; i++) {
      let source = this.getVisibleterminal(edges[i], true);
      let target = this.getVisibleterminal(edges[i], false);

      if (
        source == target ||
        (source != target &&
          ((target == cell && (this.parent == null || this.isAncestor(this.parent, source, this.traverseAncestors))) ||
            (source == cell && (this.parent == null || this.isAncestor(this.parent, target, this.traverseAncestors)))))
      ) {
        result.push(edges[i]);
      }
    }

    this.edgesCache.put(cell, result);
    return result;
  }

  getVisibleterminal(edge, source) {
    let terminalCache = this.edgesTargetTermCache;

    if (source) {
      terminalCache = this.edgeSourceTermCache;
    }

    let term = terminalCache.get(edge);

    if (term != null) {
      return term;
    }

    let state = this.graph.view.getState(edge);
    let terminal = state != null ? state.getVisibleterminal(source) : this.graph.view.getVisibleterminal(edge, source);

    if (terminal == null) {
      terminal = state != null ? state.getVisibleterminal(source) : this.graph.view.getVisibleterminal(edge, source);
    }

    if (terminal != null) {
      if (this.isPort(terminal)) {
        terminal = this.graph.model.getParent(terminal);
      }

      terminalCache.put(edge, terminal);
    }

    return terminal;
  }

  run(parent) {
    let hierarchyVertices = [];
    let allVertexSet = [];

    if (this.roots == null && parent != null) {
      let filledVertexSet = Object();
      this.filterDescendants(parent, filledVertexSet);
      this.roots = [];
      let filledVertexSetEmpty = true;

      for (let key in filledVertexSet) {
        if (filledVertexSet[key] != null) {
          filledVertexSetEmpty = false;
          break;
        }
      }

      while (!filledVertexSetEmpty) {
        let candidateRoots = this.findRoots(parent, filledVertexSet);

        for (let i = 0; i < candidateRoots.length; i++) {
          let vertexSet = Object();
          hierarchyVertices.push(vertexSet);
          this.traverse(candidateRoots[i], true, null, allVertexSet, vertexSet, hierarchyVertices, filledVertexSet);
        }

        for (let i = 0; i < candidateRoots.length; i++) {
          this.roots.push(candidateRoots[i]);
        }

        filledVertexSetEmpty = true;

        for (let key in filledVertexSet) {
          if (filledVertexSet[key] != null) {
            filledVertexSetEmpty = false;
            break;
          }
        }
      }
    } else {
      for (let i = 0; i < this.roots.length; i++) {
        let vertexSet = Object();
        hierarchyVertices.push(vertexSet);
        this.traverse(this.roots[i], true, null, allVertexSet, vertexSet, hierarchyVertices, null);
      }
    }

    let initialX = 0;

    for (let i = 0; i < hierarchyVertices.length; i++) {
      let vertexSet = hierarchyVertices[i];
      let tmp = [];

      for (let key in vertexSet) {
        tmp.push(vertexSet[key]);
      }

      this.model = new wangGraphHierarchyModel(this, tmp, this.roots, parent, this.tightenToSource);
      this.cycleStage(parent);
      this.layeringStage();
      this.crossingStage(parent);
      initialX = this.placementStage(initialX, parent);
    }
  }

  filterDescendants(cell, result) {
    let model = this.graph.model;

    if (model.isVertex(cell) && cell != this.parent && this.graph.isCellVisible(cell)) {
      result[wangObjectIdentity.get(cell)] = cell;
    }

    if (this.traverseAncestors || (cell == this.parent && this.graph.isCellVisible(cell))) {
      let childCount = model.getChildCount(cell);

      for (let i = 0; i < childCount; i++) {
        let child = model.getChildAt(cell, i);

        if (!this.isPort(child)) {
          this.filterDescendants(child, result);
        }
      }
    }
  }

  isPort(cell) {
    if (cell != null && cell.geometry != null) {
      return cell.geometry.relative;
    } else {
      return false;
    }
  }

  getEdgesBetween(source, target, directed) {
    directed = directed != null ? directed : false;
    let edges = this.getEdges(source);
    let result = [];

    for (let i = 0; i < edges.length; i++) {
      let src = this.getVisibleterminal(edges[i], true);
      let trg = this.getVisibleterminal(edges[i], false);

      if ((src == source && trg == target) || (!directed && src == target && trg == source)) {
        result.push(edges[i]);
      }
    }

    return result;
  }

  traverse(vertex, directed, edge, allVertices, currentComp, hierarchyVertices, filledVertexSet) {
    if (vertex != null && allVertices != null) {
      let vertexID = wangObjectIdentity.get(vertex);

      if (allVertices[vertexID] == null && (filledVertexSet == null ? true : filledVertexSet[vertexID] != null)) {
        if (currentComp[vertexID] == null) {
          currentComp[vertexID] = vertex;
        }

        if (allVertices[vertexID] == null) {
          allVertices[vertexID] = vertex;
        }

        if (filledVertexSet !== null) {
          delete filledVertexSet[vertexID];
        }

        let edges = this.getEdges(vertex);
        let edgeIsSource = [];

        for (let i = 0; i < edges.length; i++) {
          edgeIsSource[i] = this.getVisibleterminal(edges[i], true) == vertex;
        }

        for (let i = 0; i < edges.length; i++) {
          if (!directed || edgeIsSource[i]) {
            let next = this.getVisibleterminal(edges[i], !edgeIsSource[i]);
            let netCount = 1;

            for (let j = 0; j < edges.length; j++) {
              if (j == i) {
                continue;
              } else {
                let isSource2 = edgeIsSource[j];
                let otherTerm = this.getVisibleterminal(edges[j], !isSource2);

                if (otherTerm == next) {
                  if (isSource2) {
                    netCount++;
                  } else {
                    netCount--;
                  }
                }
              }
            }

            if (netCount >= 0) {
              currentComp = this.traverse(
                next,
                directed,
                edges[i],
                allVertices,
                currentComp,
                hierarchyVertices,
                filledVertexSet
              );
            }
          }
        }
      } else {
        if (currentComp[vertexID] == null) {
          for (let i = 0; i < hierarchyVertices.length; i++) {
            let comp = hierarchyVertices[i];

            if (comp[vertexID] != null) {
              for (let key in comp) {
                currentComp[key] = comp[key];
              }

              hierarchyVertices.splice(i, 1);
              return currentComp;
            }
          }
        }
      }
    }

    return currentComp;
  }

  cycleStage(parent) {
    let cycleStage = new wangMinimumCycleRemover(this);
    cycleStage.execute(parent);
  }

  layeringStage() {
    this.model.initialRank();
    this.model.fixRanks();
  }

  crossingStage(parent) {
    let crossingStage = new wangMedianHybridCrossingReduction(this);
    crossingStage.execute(parent);
  }

  placementStage(initialX, parent) {
    let placementStage = new wangCoordinateAssignment(
      this,
      this.intraCellSpacing,
      this.interRankCellSpacing,
      this.orientation,
      initialX,
      this.parallelEdgeSpacing
    );
    placementStage.fineTuning = this.fineTuning;
    placementStage.execute(parent);
    return placementStage.limitX + this.interHierarchySpacing;
  }
}
