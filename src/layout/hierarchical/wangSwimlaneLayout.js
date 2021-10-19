import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';
import { wangCoordinateAssignment } from '@wangGraph/layout/hierarchical/stage/wangCoordinateAssignment';
import { wangMedianHybridCrossingReduction } from '@wangGraph/layout/hierarchical/stage/wangMedianHybridCrossingReduction';
import { wangSwimlaneOrdering } from '@wangGraph/layout/hierarchical/stage/wangSwimlaneOrdering';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';
import { wangSwimlaneModel } from '@wangGraph/layout/hierarchical/model/wangSwimlaneModel';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangHierarchicalEdgeStyle } from '@wangGraph/layout/hierarchical/wangHierarchicalEdgeStyle';

export class wangSwimlaneLayout extends wangGraphLayout {
  roots = null;
  swimlanes = null;
  dummyVertexWidth = 50;
  resizeParent = false;
  maintainParentLocation = false;
  moveParent = false;
  parentBorder = 30;
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

  execute(parent, swimlanes) {
    this.parent = parent;
    let model = this.graph.model;
    this.edgesCache = new wangDictionary();
    this.edgeSourceTermCache = new wangDictionary();
    this.edgesTargetTermCache = new wangDictionary();

    if (swimlanes == null || swimlanes.length < 1) {
      return;
    }

    if (parent == null) {
      parent = model.getParent(swimlanes[0]);
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

    this.swimlanes = swimlanes;
    let dummyVertices = [];

    for (let i = 0; i < swimlanes.length; i++) {
      let children = this.graph.getChildCells(swimlanes[i]);

      if (children == null || children.length == 0) {
        let vertex = this.graph.insertVertex(swimlanes[i], null, null, 0, 0, this.dummyVertexWidth, 0);
        dummyVertices.push(vertex);
      }
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

      this.graph.removeCells(dummyVertices);
    } finally {
      model.endUpdate();
    }
  }

  updateGroupBounds() {
    let cells = [];
    let model = this.model;

    for (let key in model.edgeMapper) {
      let edge = model.edgeMapper[key];

      for (let i = 0; i < edge.edges.length; i++) {
        cells.push(edge.edges[i]);
      }
    }

    let layoutBounds = this.graph.getBoundingBoxFromGeometry(cells, true);
    let childBounds = [];

    for (let i = 0; i < this.swimlanes.length; i++) {
      let lane = this.swimlanes[i];
      let geo = this.graph.getCellGeometry(lane);

      if (geo != null) {
        let children = this.graph.getChildCells(lane);
        let size = this.graph.isSwimlane(lane) ? this.graph.getStartSize(lane) : new wangRectangle();
        let bounds = this.graph.getBoundingBoxFromGeometry(children);
        childBounds[i] = bounds;
        let childrenY = bounds.y + geo.y - size.height - this.parentBorder;
        let maxChildrenY = bounds.y + geo.y + bounds.height;

        if (layoutBounds == null) {
          layoutBounds = new wangRectangle(0, childrenY, 0, maxChildrenY - childrenY);
        } else {
          layoutBounds.y = Math.min(layoutBounds.y, childrenY);
          let maxY = Math.max(layoutBounds.y + layoutBounds.height, maxChildrenY);
          layoutBounds.height = maxY - layoutBounds.y;
        }
      }
    }

    for (let i = 0; i < this.swimlanes.length; i++) {
      let lane = this.swimlanes[i];
      let geo = this.graph.getCellGeometry(lane);

      if (geo != null) {
        let children = this.graph.getChildCells(lane);
        let size = this.graph.isSwimlane(lane) ? this.graph.getStartSize(lane) : new wangRectangle();
        let newGeo = geo.clone();
        let leftGroupBorder = i == 0 ? this.parentBorder : this.interRankCellSpacing / 2;
        let w = size.width + leftGroupBorder;
        let x = childBounds[i].x - w;
        let y = layoutBounds.y - this.parentBorder;
        newGeo.x += x;
        newGeo.y = y;
        newGeo.width = childBounds[i].width + w + this.interRankCellSpacing / 2;
        newGeo.height = layoutBounds.height + size.height + 2 * this.parentBorder;
        this.graph.model.setGeometry(lane, newGeo);
        this.graph.moveCells(children, -x, geo.y - y);
      }
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

        if (cell != null && model.isVertex(cell) && this.graph.isCellVisible(cell) && model.isAncestor(parent, cell)) {
          let conns = this.getEdges(cell);
          let fanOut = 0;
          let fanIn = 0;

          for (let k = 0; k < conns.length; k++) {
            let src = this.getVisibleterminal(conns[k], true);

            if (src == cell) {
              let other = this.getVisibleterminal(conns[k], false);

              if (model.isAncestor(parent, other)) {
                fanOut++;
              }
            } else if (model.isAncestor(parent, src)) {
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
          ((target == cell &&
            (this.parent == null || this.graph.isValidAncestor(source, this.parent, this.traverseAncestors))) ||
            (source == cell &&
              (this.parent == null || this.graph.isValidAncestor(target, this.parent, this.traverseAncestors)))))
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
    let allVertexSet = Object();

    if (this.swimlanes != null && this.swimlanes.length > 0 && parent != null) {
      let filledVertexSet = Object();

      for (let i = 0; i < this.swimlanes.length; i++) {
        this.filterDescendants(this.swimlanes[i], filledVertexSet);
      }

      this.roots = [];
      let filledVertexSetEmpty = true;

      for (let key in filledVertexSet) {
        if (filledVertexSet[key] != null) {
          filledVertexSetEmpty = false;
          break;
        }
      }

      let laneCounter = 0;

      while (!filledVertexSetEmpty && laneCounter < this.swimlanes.length) {
        let candidateRoots = this.findRoots(this.swimlanes[laneCounter], filledVertexSet);

        if (candidateRoots.length == 0) {
          laneCounter++;
          continue;
        }

        for (let i = 0; i < candidateRoots.length; i++) {
          let vertexSet = Object();
          hierarchyVertices.push(vertexSet);
          this.traverse(
            candidateRoots[i],
            true,
            null,
            allVertexSet,
            vertexSet,
            hierarchyVertices,
            filledVertexSet,
            laneCounter
          );
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

    let tmp = [];

    for (let key in allVertexSet) {
      tmp.push(allVertexSet[key]);
    }

    this.model = new wangSwimlaneModel(this, tmp, this.roots, parent, this.tightenToSource);
    this.cycleStage(parent);
    this.layeringStage();
    this.crossingStage(parent);
    this.placementStage(0, parent);
  }

  filterDescendants(cell, result) {
    let model = this.graph.model;

    if (
      model.isVertex(cell) &&
      cell != this.parent &&
      model.getParent(cell) != this.parent &&
      this.graph.isCellVisible(cell)
    ) {
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
    if (cell.geometry.relative) {
      return true;
    }

    return false;
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

  traverse(vertex, directed, edge, allVertices, currentComp, hierarchyVertices, filledVertexSet, swimlaneIndex) {
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
        let model = this.graph.model;

        for (let i = 0; i < edges.length; i++) {
          let otherVertex = this.getVisibleterminal(edges[i], true);
          let isSource = otherVertex == vertex;

          if (isSource) {
            otherVertex = this.getVisibleterminal(edges[i], false);
          }

          let otherIndex = 0;

          for (otherIndex = 0; otherIndex < this.swimlanes.length; otherIndex++) {
            if (model.isAncestor(this.swimlanes[otherIndex], otherVertex)) {
              break;
            }
          }

          if (otherIndex >= this.swimlanes.length) {
            continue;
          }

          if (otherIndex > swimlaneIndex || ((!directed || isSource) && otherIndex == swimlaneIndex)) {
            currentComp = this.traverse(
              otherVertex,
              directed,
              edges[i],
              allVertices,
              currentComp,
              hierarchyVertices,
              filledVertexSet,
              otherIndex
            );
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
    let cycleStage = new wangSwimlaneOrdering(this);
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
