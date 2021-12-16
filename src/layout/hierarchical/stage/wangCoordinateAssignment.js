import { wangHierarchicalLayoutStage } from '@wangGraph/layout/hierarchical/stage/wangHierarchicalLayoutStage';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangHierarchicalEdgeStyle } from '@wangGraph/layout/hierarchical/wangHierarchicalEdgeStyle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { WeightedCellSorter } from '@wangGraph/layout/WeightedCellSorter';
import { wangDictionary } from '@wangGraph/util/wangDictionary';
import { wangLog } from '@wangGraph/util/wangLog';
export class wangCoordinateAssignment extends wangHierarchicalLayoutStage {
  maxIterations = 8;
  prefHozEdgeSep = 5;
  prefVertEdgeOff = 2;
  minEdgeJetty = 12;
  channelBuffer = 4;
  jettyPositions = null;
  limitX = null;
  currentXDelta = null;
  widestRank = null;
  rankTopY = null;
  rankBottomY = null;
  widestRankValue = null;
  rankWidths = null;
  rankY = null;
  fineTuning = true;
  nextLayerConnectedCache = null;
  previousLayerConnectedCache = null;
  groupPadding = 10;

  constructor(layout, intraCellSpacing, interRankCellSpacing, orientation, initialX, parallelEdgeSpacing) {
    super();
    this.layout = layout;
    this.intraCellSpacing = intraCellSpacing;
    this.interRankCellSpacing = interRankCellSpacing;
    this.orientation = orientation;
    this.initialX = initialX;
    this.parallelEdgeSpacing = parallelEdgeSpacing;
  }

  printStatus() {
    let model = this.layout.getModel();
    wangLog.show();
    wangLog.writeln('======Coord assignment debug=======');

    for (let j = 0; j < model.ranks.length; j++) {
      wangLog.write('Rank ', j, ' : ');
      let rank = model.ranks[j];

      for (let k = 0; k < rank.length; k++) {
        let cell = rank[k];
        wangLog.write(cell.getGeneralPurposeletiable(j), '  ');
      }

      wangLog.writeln();
    }

    wangLog.writeln('====================================');
  }

  execute(parent) {
    this.jettyPositions = Object();
    let model = this.layout.getModel();
    this.currentXDelta = 0.0;
    this.initialCoords(this.layout.getGraph(), model);

    if (this.fineTuning) {
      this.minNode(model);
    }

    let bestXDelta = 100000000.0;

    if (this.fineTuning) {
      for (let i = 0; i < this.maxIterations; i++) {
        if (i != 0) {
          this.medianPos(i, model);
          this.minNode(model);
        }

        if (this.currentXDelta < bestXDelta) {
          for (let j = 0; j < model.ranks.length; j++) {
            let rank = model.ranks[j];

            for (let k = 0; k < rank.length; k++) {
              let cell = rank[k];
              cell.setX(j, cell.getGeneralPurposeletiable(j));
            }
          }

          bestXDelta = this.currentXDelta;
        } else {
          for (let j = 0; j < model.ranks.length; j++) {
            let rank = model.ranks[j];

            for (let k = 0; k < rank.length; k++) {
              let cell = rank[k];
              cell.setGeneralPurposeletiable(j, cell.getX(j));
            }
          }
        }

        this.minPath(this.layout.getGraph(), model);
        this.currentXDelta = 0;
      }
    }

    this.setCellLocations(this.layout.getGraph(), model);
  }

  minNode(model) {
    let nodeList = [];
    let map = new wangDictionary();
    let rank = [];

    for (let i = 0; i <= model.maxRank; i++) {
      rank[i] = model.ranks[i];

      for (let j = 0; j < rank[i].length; j++) {
        let node = rank[i][j];
        let nodeWrapper = new WeightedCellSorter(node, i);
        nodeWrapper.rankIndex = j;
        nodeWrapper.visited = true;
        nodeList.push(nodeWrapper);
        map.put(node, nodeWrapper);
      }
    }

    let maxTries = nodeList.length * 10;
    let count = 0;
    let tolerance = 1;

    while (nodeList.length > 0 && count <= maxTries) {
      let cellWrapper = nodeList.shift();
      let cell = cellWrapper.cell;
      let rankValue = cellWrapper.weightedValue;
      let rankIndex = parseInt(cellWrapper.rankIndex);
      let nextLayerConnectedCells = cell.getNextLayerConnectedCells(rankValue);
      let previousLayerConnectedCells = cell.getPreviousLayerConnectedCells(rankValue);
      let numNextLayerConnected = nextLayerConnectedCells.length;
      let numPreviousLayerConnected = previousLayerConnectedCells.length;
      let medianNextLevel = this.medianXValue(nextLayerConnectedCells, rankValue + 1);
      let medianPreviousLevel = this.medianXValue(previousLayerConnectedCells, rankValue - 1);
      let numConnectedNeighbours = numNextLayerConnected + numPreviousLayerConnected;
      let currentPosition = cell.getGeneralPurposeletiable(rankValue);
      let cellMedian = currentPosition;

      if (numConnectedNeighbours > 0) {
        cellMedian =
          (medianNextLevel * numNextLayerConnected + medianPreviousLevel * numPreviousLayerConnected) /
          numConnectedNeighbours;
      }

      let positionChanged = false;

      if (cellMedian < currentPosition - tolerance) {
        if (rankIndex == 0) {
          cell.setGeneralPurposeletiable(rankValue, cellMedian);
          positionChanged = true;
        } else {
          let leftCell = rank[rankValue][rankIndex - 1];
          let leftLimit = leftCell.getGeneralPurposeletiable(rankValue);
          leftLimit = leftLimit + leftCell.width / 2 + this.intraCellSpacing + cell.width / 2;

          if (leftLimit < cellMedian) {
            cell.setGeneralPurposeletiable(rankValue, cellMedian);
            positionChanged = true;
          } else if (leftLimit < cell.getGeneralPurposeletiable(rankValue) - tolerance) {
            cell.setGeneralPurposeletiable(rankValue, leftLimit);
            positionChanged = true;
          }
        }
      } else if (cellMedian > currentPosition + tolerance) {
        let rankSize = rank[rankValue].length;

        if (rankIndex == rankSize - 1) {
          cell.setGeneralPurposeletiable(rankValue, cellMedian);
          positionChanged = true;
        } else {
          let rightCell = rank[rankValue][rankIndex + 1];
          let rightLimit = rightCell.getGeneralPurposeletiable(rankValue);
          rightLimit = rightLimit - rightCell.width / 2 - this.intraCellSpacing - cell.width / 2;

          if (rightLimit > cellMedian) {
            cell.setGeneralPurposeletiable(rankValue, cellMedian);
            positionChanged = true;
          } else if (rightLimit > cell.getGeneralPurposeletiable(rankValue) + tolerance) {
            cell.setGeneralPurposeletiable(rankValue, rightLimit);
            positionChanged = true;
          }
        }
      }

      if (positionChanged) {
        for (let i = 0; i < nextLayerConnectedCells.length; i++) {
          let connectedCell = nextLayerConnectedCells[i];
          let connectedCellWrapper = map.get(connectedCell);

          if (connectedCellWrapper != null) {
            if (connectedCellWrapper.visited == false) {
              connectedCellWrapper.visited = true;
              nodeList.push(connectedCellWrapper);
            }
          }
        }

        for (let i = 0; i < previousLayerConnectedCells.length; i++) {
          let connectedCell = previousLayerConnectedCells[i];
          let connectedCellWrapper = map.get(connectedCell);

          if (connectedCellWrapper != null) {
            if (connectedCellWrapper.visited == false) {
              connectedCellWrapper.visited = true;
              nodeList.push(connectedCellWrapper);
            }
          }
        }
      }

      cellWrapper.visited = false;
      count++;
    }
  }

  medianPos(i, model) {
    let downwardSweep = i % 2 == 0;

    if (downwardSweep) {
      for (let j = model.maxRank; j > 0; j--) {
        this.rankMedianPosition(j - 1, model, j);
      }
    } else {
      for (let j = 0; j < model.maxRank - 1; j++) {
        this.rankMedianPosition(j + 1, model, j);
      }
    }
  }

  rankMedianPosition(rankValue, model, nextRankValue) {
    let rank = model.ranks[rankValue];
    let weightedValues = [];
    let cellMap = new Object();

    for (let i = 0; i < rank.length; i++) {
      let currentCell = rank[i];
      weightedValues[i] = new WeightedCellSorter();
      weightedValues[i].cell = currentCell;
      weightedValues[i].rankIndex = i;
      cellMap[currentCell.id] = weightedValues[i];
      let nextLayerConnectedCells = null;

      if (nextRankValue < rankValue) {
        nextLayerConnectedCells = currentCell.getPreviousLayerConnectedCells(rankValue);
      } else {
        nextLayerConnectedCells = currentCell.getNextLayerConnectedCells(rankValue);
      }

      weightedValues[i].weightedValue = this.calculatedWeightedValue(currentCell, nextLayerConnectedCells);
    }

    weightedValues.sort(WeightedCellSorter.compare);

    for (let i = 0; i < weightedValues.length; i++) {
      let numConnectionsNextLevel = 0;
      let cell = weightedValues[i].cell;
      let nextLayerConnectedCells = null;
      let medianNextLevel = 0;

      if (nextRankValue < rankValue) {
        nextLayerConnectedCells = cell.getPreviousLayerConnectedCells(rankValue).slice();
      } else {
        nextLayerConnectedCells = cell.getNextLayerConnectedCells(rankValue).slice();
      }

      if (nextLayerConnectedCells != null) {
        numConnectionsNextLevel = nextLayerConnectedCells.length;

        if (numConnectionsNextLevel > 0) {
          medianNextLevel = this.medianXValue(nextLayerConnectedCells, nextRankValue);
        } else {
          medianNextLevel = cell.getGeneralPurposeletiable(rankValue);
        }
      }

      let leftBuffer = 0.0;
      let leftLimit = -100000000.0;

      for (let j = weightedValues[i].rankIndex - 1; j >= 0; ) {
        let weightedValue = cellMap[rank[j].id];

        if (weightedValue != null) {
          let leftCell = weightedValue.cell;

          if (weightedValue.visited) {
            leftLimit =
              leftCell.getGeneralPurposeletiable(rankValue) +
              leftCell.width / 2.0 +
              this.intraCellSpacing +
              leftBuffer +
              cell.width / 2.0;
            j = -1;
          } else {
            leftBuffer += leftCell.width + this.intraCellSpacing;
            j--;
          }
        }
      }

      let rightBuffer = 0.0;
      let rightLimit = 100000000.0;

      for (let j = weightedValues[i].rankIndex + 1; j < weightedValues.length; ) {
        let weightedValue = cellMap[rank[j].id];

        if (weightedValue != null) {
          let rightCell = weightedValue.cell;

          if (weightedValue.visited) {
            rightLimit =
              rightCell.getGeneralPurposeletiable(rankValue) -
              rightCell.width / 2.0 -
              this.intraCellSpacing -
              rightBuffer -
              cell.width / 2.0;
            j = weightedValues.length;
          } else {
            rightBuffer += rightCell.width + this.intraCellSpacing;
            j++;
          }
        }
      }

      if (medianNextLevel >= leftLimit && medianNextLevel <= rightLimit) {
        cell.setGeneralPurposeletiable(rankValue, medianNextLevel);
      } else if (medianNextLevel < leftLimit) {
        cell.setGeneralPurposeletiable(rankValue, leftLimit);
        this.currentXDelta += leftLimit - medianNextLevel;
      } else if (medianNextLevel > rightLimit) {
        cell.setGeneralPurposeletiable(rankValue, rightLimit);
        this.currentXDelta += medianNextLevel - rightLimit;
      }

      weightedValues[i].visited = true;
    }
  }

  calculatedWeightedValue(currentCell, collection) {
    let totalWeight = 0;

    for (let i = 0; i < collection.length; i++) {
      let cell = collection[i];

      if (currentCell.isVertex() && cell.isVertex()) {
        totalWeight++;
      } else if (currentCell.isEdge() && cell.isEdge()) {
        totalWeight += 8;
      } else {
        totalWeight += 2;
      }
    }

    return totalWeight;
  }

  medianXValue(connectedCells, rankValue) {
    if (connectedCells.length == 0) {
      return 0;
    }

    let medianValues = [];

    for (let i = 0; i < connectedCells.length; i++) {
      medianValues[i] = connectedCells[i].getGeneralPurposeletiable(rankValue);
    }

    medianValues.sort(function (a, b) {
      return a - b;
    });

    if (connectedCells.length % 2 == 1) {
      return medianValues[Math.floor(connectedCells.length / 2)];
    } else {
      let medianPoint = connectedCells.length / 2;
      let leftMedian = medianValues[medianPoint - 1];
      let rightMedian = medianValues[medianPoint];
      return (leftMedian + rightMedian) / 2;
    }
  }

  initialCoords(facade, model) {
    this.calculateWidestRank(facade, model);

    for (let i = this.widestRank; i >= 0; i--) {
      if (i < model.maxRank) {
        this.rankCoordinates(i, facade, model);
      }
    }

    for (let i = this.widestRank + 1; i <= model.maxRank; i++) {
      if (i > 0) {
        this.rankCoordinates(i, facade, model);
      }
    }
  }

  rankCoordinates(rankValue, graph, model) {
    let rank = model.ranks[rankValue];
    let maxY = 0.0;
    let localX = this.initialX + (this.widestRankValue - this.rankWidths[rankValue]) / 2;
    let boundsWarning = false;

    for (let i = 0; i < rank.length; i++) {
      let node = rank[i];

      if (node.isVertex()) {
        let bounds = this.layout.getVertexBounds(node.cell);

        if (bounds != null) {
          if (this.orientation == wangConstants.DIRECTION_NORTH || this.orientation == wangConstants.DIRECTION_SOUTH) {
            node.width = bounds.width;
            node.height = bounds.height;
          } else {
            node.width = bounds.height;
            node.height = bounds.width;
          }
        } else {
          boundsWarning = true;
        }

        maxY = Math.max(maxY, node.height);
      } else if (node.isEdge()) {
        let numEdges = 1;

        if (node.edges != null) {
          numEdges = node.edges.length;
        } else {
          wangLog.warn('edge.edges is null');
        }

        node.width = (numEdges - 1) * this.parallelEdgeSpacing;
      }

      localX += node.width / 2.0;
      node.setX(rankValue, localX);
      node.setGeneralPurposeletiable(rankValue, localX);
      localX += node.width / 2.0;
      localX += this.intraCellSpacing;
    }

    if (boundsWarning == true) {
      wangLog.warn('At least one cell has no bounds');
    }
  }

  calculateWidestRank(graph, model) {
    let y = -this.interRankCellSpacing;
    let lastRankMaxCellHeight = 0.0;
    this.rankWidths = [];
    this.rankY = [];

    for (let rankValue = model.maxRank; rankValue >= 0; rankValue--) {
      let maxCellHeight = 0.0;
      let rank = model.ranks[rankValue];
      let localX = this.initialX;
      let boundsWarning = false;

      for (let i = 0; i < rank.length; i++) {
        let node = rank[i];

        if (node.isVertex()) {
          let bounds = this.layout.getVertexBounds(node.cell);

          if (bounds != null) {
            if (
              this.orientation == wangConstants.DIRECTION_NORTH ||
              this.orientation == wangConstants.DIRECTION_SOUTH
            ) {
              node.width = bounds.width;
              node.height = bounds.height;
            } else {
              node.width = bounds.height;
              node.height = bounds.width;
            }
          } else {
            boundsWarning = true;
          }

          maxCellHeight = Math.max(maxCellHeight, node.height);
        } else if (node.isEdge()) {
          let numEdges = 1;

          if (node.edges != null) {
            numEdges = node.edges.length;
          } else {
            wangLog.warn('edge.edges is null');
          }

          node.width = (numEdges - 1) * this.parallelEdgeSpacing;
        }

        localX += node.width / 2.0;
        node.setX(rankValue, localX);
        node.setGeneralPurposeletiable(rankValue, localX);
        localX += node.width / 2.0;
        localX += this.intraCellSpacing;

        if (localX > this.widestRankValue) {
          this.widestRankValue = localX;
          this.widestRank = rankValue;
        }

        this.rankWidths[rankValue] = localX;
      }

      if (boundsWarning == true) {
        wangLog.warn('At least one cell has no bounds');
      }

      this.rankY[rankValue] = y;
      let distanceToNextRank = maxCellHeight / 2.0 + lastRankMaxCellHeight / 2.0 + this.interRankCellSpacing;
      lastRankMaxCellHeight = maxCellHeight;

      if (this.orientation == wangConstants.DIRECTION_NORTH || this.orientation == wangConstants.DIRECTION_WEST) {
        y += distanceToNextRank;
      } else {
        y -= distanceToNextRank;
      }

      for (let i = 0; i < rank.length; i++) {
        let cell = rank[i];
        cell.setY(rankValue, y);
      }
    }
  }

  minPath(graph, model) {
    let edges = model.edgeMapper.getValues();

    for (let j = 0; j < edges.length; j++) {
      let cell = edges[j];

      if (cell.maxRank - cell.minRank - 1 < 1) {
        continue;
      }

      let referenceX = cell.getGeneralPurposeletiable(cell.minRank + 1);
      let edgeStraight = true;
      let refSegCount = 0;

      for (let i = cell.minRank + 2; i < cell.maxRank; i++) {
        let x = cell.getGeneralPurposeletiable(i);

        if (referenceX != x) {
          edgeStraight = false;
          referenceX = x;
        } else {
          refSegCount++;
        }
      }

      if (!edgeStraight) {
        let upSegCount = 0;
        let downSegCount = 0;
        let upXPositions = [];
        let downXPositions = [];
        let currentX = cell.getGeneralPurposeletiable(cell.minRank + 1);

        for (var i = cell.minRank + 1; i < cell.maxRank - 1; i++) {
          let nextX = cell.getX(i + 1);

          if (currentX == nextX) {
            upXPositions[i - cell.minRank - 1] = currentX;
            upSegCount++;
          } else if (this.repositionValid(model, cell, i + 1, currentX)) {
            upXPositions[i - cell.minRank - 1] = currentX;
            upSegCount++;
          } else {
            upXPositions[i - cell.minRank - 1] = nextX;
            currentX = nextX;
          }
        }

        currentX = cell.getX(i);

        for (let i = cell.maxRank - 1; i > cell.minRank + 1; i--) {
          let nextX = cell.getX(i - 1);

          if (currentX == nextX) {
            downXPositions[i - cell.minRank - 2] = currentX;
            downSegCount++;
          } else if (this.repositionValid(model, cell, i - 1, currentX)) {
            downXPositions[i - cell.minRank - 2] = currentX;
            downSegCount++;
          } else {
            downXPositions[i - cell.minRank - 2] = cell.getX(i - 1);
            currentX = nextX;
          }
        }

        if (downSegCount > refSegCount || upSegCount > refSegCount) {
          if (downSegCount >= upSegCount) {
            for (let i = cell.maxRank - 2; i > cell.minRank; i--) {
              cell.setX(i, downXPositions[i - cell.minRank - 1]);
            }
          } else if (upSegCount > downSegCount) {
            for (let i = cell.minRank + 2; i < cell.maxRank; i++) {
              cell.setX(i, upXPositions[i - cell.minRank - 2]);
            }
          } else {
            /* ignore */
          }
        }
      }
    }
  }

  repositionValid(model, cell, rank, position) {
    let rankArray = model.ranks[rank];
    let rankIndex = -1;

    for (let i = 0; i < rankArray.length; i++) {
      if (cell == rankArray[i]) {
        rankIndex = i;
        break;
      }
    }

    if (rankIndex < 0) {
      return false;
    }

    let currentX = cell.getGeneralPurposeletiable(rank);

    if (position < currentX) {
      if (rankIndex == 0) {
        return true;
      }

      let leftCell = rankArray[rankIndex - 1];
      let leftLimit = leftCell.getGeneralPurposeletiable(rank);
      leftLimit = leftLimit + leftCell.width / 2 + this.intraCellSpacing + cell.width / 2;

      if (leftLimit <= position) {
        return true;
      } else {
        return false;
      }
    } else if (position > currentX) {
      if (rankIndex == rankArray.length - 1) {
        return true;
      }

      let rightCell = rankArray[rankIndex + 1];
      let rightLimit = rightCell.getGeneralPurposeletiable(rank);
      rightLimit = rightLimit - rightCell.width / 2 - this.intraCellSpacing - cell.width / 2;

      if (rightLimit >= position) {
        return true;
      } else {
        return false;
      }
    }

    return true;
  }

  setCellLocations(graph, model) {
    this.rankTopY = [];
    this.rankBottomY = [];

    for (let i = 0; i < model.ranks.length; i++) {
      this.rankTopY[i] = Number.MAX_VALUE;
      this.rankBottomY[i] = -Number.MAX_VALUE;
    }

    let vertices = model.vertexMapper.getValues();

    for (let i = 0; i < vertices.length; i++) {
      this.setVertexLocation(vertices[i]);
    }

    if (
      this.layout.edgeStyle == wangHierarchicalEdgeStyle.ORTHOGONAL ||
      this.layout.edgeStyle == wangHierarchicalEdgeStyle.POLYLINE ||
      this.layout.edgeStyle == wangHierarchicalEdgeStyle.CURVE
    ) {
      this.localEdgeProcessing(model);
    }

    let edges = model.edgeMapper.getValues();

    for (let i = 0; i < edges.length; i++) {
      this.setEdgePosition(edges[i]);
    }
  }

  localEdgeProcessing(model) {
    for (let rankIndex = 0; rankIndex < model.ranks.length; rankIndex++) {
      let rank = model.ranks[rankIndex];

      for (let cellIndex = 0; cellIndex < rank.length; cellIndex++) {
        let cell = rank[cellIndex];

        if (cell.isVertex()) {
          let currentCells = cell.getPreviousLayerConnectedCells(rankIndex);
          let currentRank = rankIndex - 1;

          for (let k = 0; k < 2; k++) {
            if (
              currentRank > -1 &&
              currentRank < model.ranks.length &&
              currentCells != null &&
              currentCells.length > 0
            ) {
              let sortedCells = [];

              for (let j = 0; j < currentCells.length; j++) {
                let sorter = new WeightedCellSorter(currentCells[j], currentCells[j].getX(currentRank));
                sortedCells.push(sorter);
              }

              sortedCells.sort(WeightedCellSorter.compare);
              let leftLimit = cell.x[0] - cell.width / 2;
              let rightLimit = leftLimit + cell.width;
              let connectedEdgeCount = 0;
              let connectedEdgeGroupCount = 0;
              let connectedEdges = [];

              for (let j = 0; j < sortedCells.length; j++) {
                let innerCell = sortedCells[j].cell;
                let connections;

                if (innerCell.isVertex()) {
                  if (k == 0) {
                    connections = cell.connectsAsSource;
                  } else {
                    connections = cell.connectsAsTarget;
                  }

                  for (let connIndex = 0; connIndex < connections.length; connIndex++) {
                    if (connections[connIndex].source == innerCell || connections[connIndex].target == innerCell) {
                      connectedEdgeCount += connections[connIndex].edges.length;
                      connectedEdgeGroupCount++;
                      connectedEdges.push(connections[connIndex]);
                    }
                  }
                } else {
                  connectedEdgeCount += innerCell.edges.length;
                  connectedEdgeGroupCount++;
                  connectedEdges.push(innerCell);
                }
              }

              let requiredWidth = (connectedEdgeCount + 1) * this.prefHozEdgeSep;

              if (cell.width > requiredWidth + 2 * this.prefHozEdgeSep) {
                leftLimit += this.prefHozEdgeSep;
                rightLimit -= this.prefHozEdgeSep;
              }

              let availableWidth = rightLimit - leftLimit;
              let edgeSpacing = availableWidth / connectedEdgeCount;
              let currentX = leftLimit + edgeSpacing / 2.0;
              let currentYOffset = this.minEdgeJetty - this.prefVertEdgeOff;
              let maxYOffset = 0;

              for (let j = 0; j < connectedEdges.length; j++) {
                let numActualEdges = connectedEdges[j].edges.length;
                let pos = this.jettyPositions[connectedEdges[j].ids[0]];

                if (pos == null) {
                  pos = [];
                  this.jettyPositions[connectedEdges[j].ids[0]] = pos;
                }

                if (j < connectedEdgeCount / 2) {
                  currentYOffset += this.prefVertEdgeOff;
                } else if (j > connectedEdgeCount / 2) {
                  currentYOffset -= this.prefVertEdgeOff;
                }

                for (let m = 0; m < numActualEdges; m++) {
                  pos[m * 4 + k * 2] = currentX;
                  currentX += edgeSpacing;
                  pos[m * 4 + k * 2 + 1] = currentYOffset;
                }

                maxYOffset = Math.max(maxYOffset, currentYOffset);
              }
            }

            currentCells = cell.getNextLayerConnectedCells(rankIndex);
            currentRank = rankIndex + 1;
          }
        }
      }
    }
  }

  setEdgePosition(cell) {
    let offsetX = 0;

    if (cell.temp[0] != 101207) {
      let maxRank = cell.maxRank;
      let minRank = cell.minRank;

      if (maxRank == minRank) {
        maxRank = cell.source.maxRank;
        minRank = cell.target.minRank;
      }

      let parallelEdgeCount = 0;
      let jettys = this.jettyPositions[cell.ids[0]];
      let source = cell.isReversed ? cell.target.cell : cell.source.cell;
      let graph = this.layout.graph;
      let layoutReversed =
        this.orientation == wangConstants.DIRECTION_EAST || this.orientation == wangConstants.DIRECTION_SOUTH;

      for (let i = 0; i < cell.edges.length; i++) {
        let realEdge = cell.edges[i];
        let realSource = this.layout.getVisibleterminal(realEdge, true);
        let newPoints = [];
        let reversed = cell.isReversed;

        if (realSource != source) {
          reversed = !reversed;
        }

        if (jettys != null) {
          let arrayOffset = reversed ? 2 : 0;
          let y = reversed
            ? layoutReversed
              ? this.rankBottomY[minRank]
              : this.rankTopY[minRank]
            : layoutReversed
            ? this.rankTopY[maxRank]
            : this.rankBottomY[maxRank];
          let jetty = jettys[parallelEdgeCount * 4 + 1 + arrayOffset];

          if (reversed != layoutReversed) {
            jetty = -jetty;
          }

          y += jetty;
          let x = jettys[parallelEdgeCount * 4 + arrayOffset];
          let modelSource = graph.model.getTerminal(realEdge, true);

          if (this.layout.isPort(modelSource) && graph.model.getParent(modelSource) == realSource) {
            let state = graph.view.getState(modelSource);

            if (state != null) {
              x = state.x;
            } else {
              x = realSource.geometry.x + cell.source.width * modelSource.geometry.x;
            }
          }

          if (this.orientation == wangConstants.DIRECTION_NORTH || this.orientation == wangConstants.DIRECTION_SOUTH) {
            newPoints.push(new wangPoint(x, y));

            if (this.layout.edgeStyle == wangHierarchicalEdgeStyle.CURVE) {
              newPoints.push(new wangPoint(x, y + jetty));
            }
          } else {
            newPoints.push(new wangPoint(y, x));

            if (this.layout.edgeStyle == wangHierarchicalEdgeStyle.CURVE) {
              newPoints.push(new wangPoint(y + jetty, x));
            }
          }
        }

        let loopStart = cell.x.length - 1;
        let loopLimit = -1;
        let loopDelta = -1;
        let currentRank = cell.maxRank - 1;

        if (reversed) {
          loopStart = 0;
          loopLimit = cell.x.length;
          loopDelta = 1;
          currentRank = cell.minRank + 1;
        }

        for (let j = loopStart; cell.maxRank != cell.minRank && j != loopLimit; j += loopDelta) {
          let positionX = cell.x[j] + offsetX;
          let topChannelY = (this.rankTopY[currentRank] + this.rankBottomY[currentRank + 1]) / 2.0;
          let bottomChannelY = (this.rankTopY[currentRank - 1] + this.rankBottomY[currentRank]) / 2.0;

          if (reversed) {
            let tmp = topChannelY;
            topChannelY = bottomChannelY;
            bottomChannelY = tmp;
          }

          if (this.orientation == wangConstants.DIRECTION_NORTH || this.orientation == wangConstants.DIRECTION_SOUTH) {
            newPoints.push(new wangPoint(positionX, topChannelY));
            newPoints.push(new wangPoint(positionX, bottomChannelY));
          } else {
            newPoints.push(new wangPoint(topChannelY, positionX));
            newPoints.push(new wangPoint(bottomChannelY, positionX));
          }

          this.limitX = Math.max(this.limitX, positionX);
          currentRank += loopDelta;
        }

        if (jettys != null) {
          let arrayOffset = reversed ? 2 : 0;
          let rankY = reversed
            ? layoutReversed
              ? this.rankTopY[maxRank]
              : this.rankBottomY[maxRank]
            : layoutReversed
            ? this.rankBottomY[minRank]
            : this.rankTopY[minRank];
          let jetty = jettys[parallelEdgeCount * 4 + 3 - arrayOffset];

          if (reversed != layoutReversed) {
            jetty = -jetty;
          }

          let y = rankY - jetty;
          let x = jettys[parallelEdgeCount * 4 + 2 - arrayOffset];
          let modelTarget = graph.model.getTerminal(realEdge, false);
          let realTarget = this.layout.getVisibleterminal(realEdge, false);

          if (this.layout.isPort(modelTarget) && graph.model.getParent(modelTarget) == realTarget) {
            let state = graph.view.getState(modelTarget);

            if (state != null) {
              x = state.x;
            } else {
              x = realTarget.geometry.x + cell.target.width * modelTarget.geometry.x;
            }
          }

          if (this.orientation == wangConstants.DIRECTION_NORTH || this.orientation == wangConstants.DIRECTION_SOUTH) {
            if (this.layout.edgeStyle == wangHierarchicalEdgeStyle.CURVE) {
              newPoints.push(new wangPoint(x, y - jetty));
            }

            newPoints.push(new wangPoint(x, y));
          } else {
            if (this.layout.edgeStyle == wangHierarchicalEdgeStyle.CURVE) {
              newPoints.push(new wangPoint(y - jetty, x));
            }

            newPoints.push(new wangPoint(y, x));
          }
        }

        if (cell.isReversed) {
          this.processReversedEdge(cell, realEdge);
        }

        this.layout.setEdgePoints(realEdge, newPoints);

        if (offsetX == 0.0) {
          offsetX = this.parallelEdgeSpacing;
        } else if (offsetX > 0) {
          offsetX = -offsetX;
        } else {
          offsetX = -offsetX + this.parallelEdgeSpacing;
        }

        parallelEdgeCount++;
      }

      cell.temp[0] = 101207;
    }
  }

  setVertexLocation(cell) {
    let realCell = cell.cell;
    let positionX = cell.x[0] - cell.width / 2;
    let positionY = cell.y[0] - cell.height / 2;
    this.rankTopY[cell.minRank] = Math.min(this.rankTopY[cell.minRank], positionY);
    this.rankBottomY[cell.minRank] = Math.max(this.rankBottomY[cell.minRank], positionY + cell.height);

    if (this.orientation == wangConstants.DIRECTION_NORTH || this.orientation == wangConstants.DIRECTION_SOUTH) {
      this.layout.setVertexLocation(realCell, positionX, positionY);
    } else {
      this.layout.setVertexLocation(realCell, positionY, positionX);
    }

    this.limitX = Math.max(this.limitX, positionX + cell.width);
  }

  processReversedEdge(graph, model) {}
}
