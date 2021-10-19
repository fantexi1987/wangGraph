import { wangGraphHierarchyEdge } from '@wangGraph/layout/hierarchical/model/wangGraphHierarchyEdge';
import { wangGraphHierarchyNode } from '@wangGraph/layout/hierarchical/model/wangGraphHierarchyNode';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangDictionary } from '@wangGraph/util/wangDictionary';

export class wangGraphHierarchyModel {
  ranks = null;
  dfsCount = 0;
  SOURCESCANSTARTRANK = 100000000;

  constructor(layout, vertices, roots, parent, tightenToSource) {
    let graph = layout.getGraph();
    this.tightenToSource = tightenToSource;
    this.roots = roots;
    this.parent = parent;
    this.vertexMapper = new wangDictionary();
    this.edgeMapper = new wangDictionary();
    this.maxRank = 0;
    let internalVertices = [];

    if (vertices == null) {
      vertices = this.graph.getChildVertices(parent);
    }

    this.maxRank = this.SOURCESCANSTARTRANK;
    this.createInternalCells(layout, vertices, internalVertices);

    for (let i = 0; i < vertices.length; i++) {
      let edges = internalVertices[i].connectsAsSource;

      for (let j = 0; j < edges.length; j++) {
        let internalEdge = edges[j];
        let realEdges = internalEdge.edges;

        if (realEdges != null && realEdges.length > 0) {
          let realEdge = realEdges[0];
          let targetCell = layout.getVisibleterminal(realEdge, false);
          let internalTargetCell = this.vertexMapper.get(targetCell);

          if (internalVertices[i] == internalTargetCell) {
            targetCell = layout.getVisibleterminal(realEdge, true);
            internalTargetCell = this.vertexMapper.get(targetCell);
          }

          if (internalTargetCell != null && internalVertices[i] != internalTargetCell) {
            internalEdge.target = internalTargetCell;

            if (internalTargetCell.connectsAsTarget.length == 0) {
              internalTargetCell.connectsAsTarget = [];
            }

            if (wangUtils.indexOf(internalTargetCell.connectsAsTarget, internalEdge) < 0) {
              internalTargetCell.connectsAsTarget.push(internalEdge);
            }
          }
        }
      }

      internalVertices[i].temp[0] = 1;
    }
  }

  createInternalCells(layout, vertices, internalVertices) {
    let graph = layout.getGraph();

    for (let i = 0; i < vertices.length; i++) {
      internalVertices[i] = new wangGraphHierarchyNode(vertices[i]);
      this.vertexMapper.put(vertices[i], internalVertices[i]);
      let conns = layout.getEdges(vertices[i]);
      internalVertices[i].connectsAsSource = [];

      for (let j = 0; j < conns.length; j++) {
        let cell = layout.getVisibleterminal(conns[j], false);

        if (cell != vertices[i] && layout.graph.model.isVertex(cell) && !layout.isVertexIgnored(cell)) {
          let undirectedEdges = layout.getEdgesBetween(vertices[i], cell, false);
          let directedEdges = layout.getEdgesBetween(vertices[i], cell, true);

          if (
            undirectedEdges != null &&
            undirectedEdges.length > 0 &&
            this.edgeMapper.get(undirectedEdges[0]) == null &&
            directedEdges.length * 2 >= undirectedEdges.length
          ) {
            let internalEdge = new wangGraphHierarchyEdge(undirectedEdges);

            for (let k = 0; k < undirectedEdges.length; k++) {
              let edge = undirectedEdges[k];
              this.edgeMapper.put(edge, internalEdge);
              graph.resetEdge(edge);

              if (layout.disableEdgeStyle) {
                layout.setEdgeStyleEnabled(edge, false);
                layout.setOrthogonalEdge(edge, true);
              }
            }

            internalEdge.source = internalVertices[i];

            if (wangUtils.indexOf(internalVertices[i].connectsAsSource, internalEdge) < 0) {
              internalVertices[i].connectsAsSource.push(internalEdge);
            }
          }
        }
      }

      internalVertices[i].temp[0] = 0;
    }
  }

  initialRank() {
    let startNodes = [];

    if (this.roots != null) {
      for (let i = 0; i < this.roots.length; i++) {
        let internalNode = this.vertexMapper.get(this.roots[i]);

        if (internalNode != null) {
          startNodes.push(internalNode);
        }
      }
    }

    let internalNodes = this.vertexMapper.getValues();

    for (let i = 0; i < internalNodes.length; i++) {
      internalNodes[i].temp[0] = -1;
    }

    let startNodesCopy = startNodes.slice();

    while (startNodes.length > 0) {
      let internalNode = startNodes[0];
      let layerDeterminingEdges;
      let edgesToBeMarked;
      layerDeterminingEdges = internalNode.connectsAsTarget;
      edgesToBeMarked = internalNode.connectsAsSource;
      let allEdgesScanned = true;
      let minimumLayer = this.SOURCESCANSTARTRANK;

      for (let i = 0; i < layerDeterminingEdges.length; i++) {
        let internalEdge = layerDeterminingEdges[i];

        if (internalEdge.temp[0] == 5270620) {
          let otherNode = internalEdge.source;
          minimumLayer = Math.min(minimumLayer, otherNode.temp[0] - 1);
        } else {
          allEdgesScanned = false;
          break;
        }
      }

      if (allEdgesScanned) {
        internalNode.temp[0] = minimumLayer;
        this.maxRank = Math.min(this.maxRank, minimumLayer);

        if (edgesToBeMarked != null) {
          for (let i = 0; i < edgesToBeMarked.length; i++) {
            let internalEdge = edgesToBeMarked[i];
            internalEdge.temp[0] = 5270620;
            let otherNode = internalEdge.target;

            if (otherNode.temp[0] == -1) {
              startNodes.push(otherNode);
              otherNode.temp[0] = -2;
            }
          }
        }

        startNodes.shift();
      } else {
        let removedCell = startNodes.shift();
        startNodes.push(internalNode);

        if (removedCell == internalNode && startNodes.length == 1) {
          break;
        }
      }
    }

    for (let i = 0; i < internalNodes.length; i++) {
      internalNodes[i].temp[0] -= this.maxRank;
    }

    for (let i = 0; i < startNodesCopy.length; i++) {
      let internalNode = startNodesCopy[i];
      let currentMaxLayer = 0;
      let layerDeterminingEdges = internalNode.connectsAsSource;

      for (let j = 0; j < layerDeterminingEdges.length; j++) {
        let internalEdge = layerDeterminingEdges[j];
        let otherNode = internalEdge.target;
        internalNode.temp[0] = Math.max(currentMaxLayer, otherNode.temp[0] + 1);
        currentMaxLayer = internalNode.temp[0];
      }
    }

    this.maxRank = this.SOURCESCANSTARTRANK - this.maxRank;
  }

  fixRanks() {
    let rankList = [];
    this.ranks = [];

    for (let i = 0; i < this.maxRank + 1; i++) {
      rankList[i] = [];
      this.ranks[i] = rankList[i];
    }

    let rootsArray = null;

    if (this.roots != null) {
      let oldRootsArray = this.roots;
      rootsArray = [];

      for (let i = 0; i < oldRootsArray.length; i++) {
        let cell = oldRootsArray[i];
        let internalNode = this.vertexMapper.get(cell);
        rootsArray[i] = internalNode;
      }
    }

    this.visit(
      function (parent, node, edge, layer, seen) {
        if (seen == 0 && node.maxRank < 0 && node.minRank < 0) {
          rankList[node.temp[0]].push(node);
          node.maxRank = node.temp[0];
          node.minRank = node.temp[0];
          node.temp[0] = rankList[node.maxRank].length - 1;
        }

        if (parent != null && edge != null) {
          let parentToCellRankDifference = parent.maxRank - node.maxRank;

          if (parentToCellRankDifference > 1) {
            edge.maxRank = parent.maxRank;
            edge.minRank = node.maxRank;
            edge.temp = [];
            edge.x = [];
            edge.y = [];

            for (let i = edge.minRank + 1; i < edge.maxRank; i++) {
              rankList[i].push(edge);
              edge.setGeneralPurposeletiable(i, rankList[i].length - 1);
            }
          }
        }
      },
      rootsArray,
      false,
      null
    );
  }

  visit(visitor, dfsRoots, trackAncestors, seenNodes) {
    if (dfsRoots != null) {
      for (let i = 0; i < dfsRoots.length; i++) {
        let internalNode = dfsRoots[i];

        if (internalNode != null) {
          if (seenNodes == null) {
            seenNodes = new Object();
          }

          if (trackAncestors) {
            internalNode.hashCode = [];
            internalNode.hashCode[0] = this.dfsCount;
            internalNode.hashCode[1] = i;
            this.extendedDfs(null, internalNode, null, visitor, seenNodes, internalNode.hashCode, i, 0);
          } else {
            this.dfs(null, internalNode, null, visitor, seenNodes, 0);
          }
        }
      }

      this.dfsCount++;
    }
  }

  dfs(parent, root, connectingEdge, visitor, seen, layer) {
    if (root != null) {
      let rootId = root.id;

      if (seen[rootId] == null) {
        seen[rootId] = root;
        visitor(parent, root, connectingEdge, layer, 0);
        let outgoingEdges = root.connectsAsSource.slice();

        for (let i = 0; i < outgoingEdges.length; i++) {
          let internalEdge = outgoingEdges[i];
          let targetNode = internalEdge.target;
          this.dfs(root, targetNode, internalEdge, visitor, seen, layer + 1);
        }
      } else {
        visitor(parent, root, connectingEdge, layer, 1);
      }
    }
  }

  extendedDfs(parent, root, connectingEdge, visitor, seen, ancestors, childHash, layer) {
    if (root != null) {
      if (parent != null) {
        if (root.hashCode == null || root.hashCode[0] != parent.hashCode[0]) {
          let hashCodeLength = parent.hashCode.length + 1;
          root.hashCode = parent.hashCode.slice();
          root.hashCode[hashCodeLength - 1] = childHash;
        }
      }

      let rootId = root.id;

      if (seen[rootId] == null) {
        seen[rootId] = root;
        visitor(parent, root, connectingEdge, layer, 0);
        let outgoingEdges = root.connectsAsSource.slice();

        for (let i = 0; i < outgoingEdges.length; i++) {
          let internalEdge = outgoingEdges[i];
          let targetNode = internalEdge.target;
          this.extendedDfs(root, targetNode, internalEdge, visitor, seen, root.hashCode, i, layer + 1);
        }
      } else {
        visitor(parent, root, connectingEdge, layer, 1);
      }
    }
  }
}
