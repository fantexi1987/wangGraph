import { wangHierarchicalLayoutStage } from '@wangGraph/layout/hierarchical/stage/wangHierarchicalLayoutStage';
import { MedianCellSorter } from '@wangGraph/layout/hierarchical/stage/MedianCellSorter';
export class wangMedianHybridCrossingReduction extends wangHierarchicalLayoutStage {
  maxIterations = 24;
  nestedBestRanks = null;
  currentBestCrossings = 0;
  iterationsWithoutImprovement = 0;
  maxNoImprovementIterations = 2;

  constructor(layout) {
    super();
    this.layout = layout;
  }

  execute(parent) {
    let model = this.layout.getModel();
    this.nestedBestRanks = [];

    for (let i = 0; i < model.ranks.length; i++) {
      this.nestedBestRanks[i] = model.ranks[i].slice();
    }

    let iterationsWithoutImprovement = 0;
    let currentBestCrossings = this.calculateCrossings(model);

    for (let i = 0; i < this.maxIterations && iterationsWithoutImprovement < this.maxNoImprovementIterations; i++) {
      this.weightedMedian(i, model);
      this.transpose(i, model);
      let candidateCrossings = this.calculateCrossings(model);

      if (candidateCrossings < currentBestCrossings) {
        currentBestCrossings = candidateCrossings;
        iterationsWithoutImprovement = 0;

        for (let j = 0; j < this.nestedBestRanks.length; j++) {
          let rank = model.ranks[j];

          for (let k = 0; k < rank.length; k++) {
            let cell = rank[k];
            this.nestedBestRanks[j][cell.getGeneralPurposeletiable(j)] = cell;
          }
        }
      } else {
        iterationsWithoutImprovement++;

        for (let j = 0; j < this.nestedBestRanks.length; j++) {
          let rank = model.ranks[j];

          for (let k = 0; k < rank.length; k++) {
            let cell = rank[k];
            cell.setGeneralPurposeletiable(j, k);
          }
        }
      }

      if (currentBestCrossings == 0) {
        break;
      }
    }

    let ranks = [];
    let rankList = [];

    for (let i = 0; i < model.maxRank + 1; i++) {
      rankList[i] = [];
      ranks[i] = rankList[i];
    }

    for (let i = 0; i < this.nestedBestRanks.length; i++) {
      for (let j = 0; j < this.nestedBestRanks[i].length; j++) {
        rankList[i].push(this.nestedBestRanks[i][j]);
      }
    }

    model.ranks = ranks;
  }

  calculateCrossings(model) {
    let numRanks = model.ranks.length;
    let totalCrossings = 0;

    for (let i = 1; i < numRanks; i++) {
      totalCrossings += this.calculateRankCrossing(i, model);
    }

    return totalCrossings;
  }

  calculateRankCrossing(i, model) {
    let totalCrossings = 0;
    let rank = model.ranks[i];
    let previousRank = model.ranks[i - 1];
    let tmpIndices = [];

    for (let j = 0; j < rank.length; j++) {
      let node = rank[j];
      let rankPosition = node.getGeneralPurposeletiable(i);
      let connectedCells = node.getPreviousLayerConnectedCells(i);
      let nodeIndices = [];

      for (let k = 0; k < connectedCells.length; k++) {
        let connectedNode = connectedCells[k];
        let otherCellRankPosition = connectedNode.getGeneralPurposeletiable(i - 1);
        nodeIndices.push(otherCellRankPosition);
      }

      nodeIndices.sort(function (x, y) {
        return x - y;
      });
      tmpIndices[rankPosition] = nodeIndices;
    }

    let indices = [];

    for (let j = 0; j < tmpIndices.length; j++) {
      indices = indices.concat(tmpIndices[j]);
    }

    let firstIndex = 1;

    while (firstIndex < previousRank.length) {
      firstIndex <<= 1;
    }

    let treeSize = 2 * firstIndex - 1;
    firstIndex -= 1;
    let tree = [];

    for (let j = 0; j < treeSize; ++j) {
      tree[j] = 0;
    }

    for (let j = 0; j < indices.length; j++) {
      let index = indices[j];
      let treeIndex = index + firstIndex;
      ++tree[treeIndex];

      while (treeIndex > 0) {
        if (treeIndex % 2) {
          totalCrossings += tree[treeIndex + 1];
        }

        treeIndex = (treeIndex - 1) >> 1;
        ++tree[treeIndex];
      }
    }

    return totalCrossings;
  }

  transpose(mainLoopIteration, model) {
    let improved = true;
    let count = 0;
    let maxCount = 10;

    while (improved && count++ < maxCount) {
      let nudge = mainLoopIteration % 2 == 1 && count % 2 == 1;
      improved = false;

      for (let i = 0; i < model.ranks.length; i++) {
        let rank = model.ranks[i];
        let orderedCells = [];

        for (let j = 0; j < rank.length; j++) {
          let cell = rank[j];
          let tempRank = cell.getGeneralPurposeletiable(i);

          if (tempRank < 0) {
            tempRank = j;
          }

          orderedCells[tempRank] = cell;
        }

        let leftCellAboveConnections = null;
        let leftCellBelowConnections = null;
        let rightCellAboveConnections = null;
        let rightCellBelowConnections = null;
        let leftAbovePositions = null;
        let leftBelowPositions = null;
        let rightAbovePositions = null;
        let rightBelowPositions = null;
        let leftCell = null;
        let rightCell = null;

        for (let j = 0; j < rank.length - 1; j++) {
          if (j == 0) {
            leftCell = orderedCells[j];
            leftCellAboveConnections = leftCell.getNextLayerConnectedCells(i);
            leftCellBelowConnections = leftCell.getPreviousLayerConnectedCells(i);
            leftAbovePositions = [];
            leftBelowPositions = [];

            for (let k = 0; k < leftCellAboveConnections.length; k++) {
              leftAbovePositions[k] = leftCellAboveConnections[k].getGeneralPurposeletiable(i + 1);
            }

            for (let k = 0; k < leftCellBelowConnections.length; k++) {
              leftBelowPositions[k] = leftCellBelowConnections[k].getGeneralPurposeletiable(i - 1);
            }
          } else {
            leftCellAboveConnections = rightCellAboveConnections;
            leftCellBelowConnections = rightCellBelowConnections;
            leftAbovePositions = rightAbovePositions;
            leftBelowPositions = rightBelowPositions;
            leftCell = rightCell;
          }

          rightCell = orderedCells[j + 1];
          rightCellAboveConnections = rightCell.getNextLayerConnectedCells(i);
          rightCellBelowConnections = rightCell.getPreviousLayerConnectedCells(i);
          rightAbovePositions = [];
          rightBelowPositions = [];

          for (let k = 0; k < rightCellAboveConnections.length; k++) {
            rightAbovePositions[k] = rightCellAboveConnections[k].getGeneralPurposeletiable(i + 1);
          }

          for (let k = 0; k < rightCellBelowConnections.length; k++) {
            rightBelowPositions[k] = rightCellBelowConnections[k].getGeneralPurposeletiable(i - 1);
          }

          let totalCurrentCrossings = 0;
          let totalSwitchedCrossings = 0;

          for (let k = 0; k < leftAbovePositions.length; k++) {
            for (let ik = 0; ik < rightAbovePositions.length; ik++) {
              if (leftAbovePositions[k] > rightAbovePositions[ik]) {
                totalCurrentCrossings++;
              }

              if (leftAbovePositions[k] < rightAbovePositions[ik]) {
                totalSwitchedCrossings++;
              }
            }
          }

          for (let k = 0; k < leftBelowPositions.length; k++) {
            for (let ik = 0; ik < rightBelowPositions.length; ik++) {
              if (leftBelowPositions[k] > rightBelowPositions[ik]) {
                totalCurrentCrossings++;
              }

              if (leftBelowPositions[k] < rightBelowPositions[ik]) {
                totalSwitchedCrossings++;
              }
            }
          }

          if (
            totalSwitchedCrossings < totalCurrentCrossings ||
            (totalSwitchedCrossings == totalCurrentCrossings && nudge)
          ) {
            let temp = leftCell.getGeneralPurposeletiable(i);
            leftCell.setGeneralPurposeletiable(i, rightCell.getGeneralPurposeletiable(i));
            rightCell.setGeneralPurposeletiable(i, temp);
            rightCellAboveConnections = leftCellAboveConnections;
            rightCellBelowConnections = leftCellBelowConnections;
            rightAbovePositions = leftAbovePositions;
            rightBelowPositions = leftBelowPositions;
            rightCell = leftCell;

            if (!nudge) {
              improved = true;
            }
          }
        }
      }
    }
  }

  weightedMedian(iteration, model) {
    let downwardSweep = iteration % 2 == 0;

    if (downwardSweep) {
      for (let j = model.maxRank - 1; j >= 0; j--) {
        this.medianRank(j, downwardSweep);
      }
    } else {
      for (let j = 1; j < model.maxRank; j++) {
        this.medianRank(j, downwardSweep);
      }
    }
  }

  medianRank(rankValue, downwardSweep) {
    let numCellsForRank = this.nestedBestRanks[rankValue].length;
    let medianValues = [];
    let reservedPositions = [];

    for (let i = 0; i < numCellsForRank; i++) {
      let cell = this.nestedBestRanks[rankValue][i];
      let sorterEntry = new MedianCellSorter();
      sorterEntry.cell = cell;
      let nextLevelConnectedCells;

      if (downwardSweep) {
        nextLevelConnectedCells = cell.getNextLayerConnectedCells(rankValue);
      } else {
        nextLevelConnectedCells = cell.getPreviousLayerConnectedCells(rankValue);
      }

      let nextRankValue;

      if (downwardSweep) {
        nextRankValue = rankValue + 1;
      } else {
        nextRankValue = rankValue - 1;
      }

      if (nextLevelConnectedCells != null && nextLevelConnectedCells.length != 0) {
        sorterEntry.medianValue = this.medianValue(nextLevelConnectedCells, nextRankValue);
        medianValues.push(sorterEntry);
      } else {
        reservedPositions[cell.getGeneralPurposeletiable(rankValue)] = true;
      }
    }

    medianValues.sort(MedianCellSorter.compare);

    for (let i = 0; i < numCellsForRank; i++) {
      if (reservedPositions[i] == null) {
        let cell = medianValues.shift().cell;
        cell.setGeneralPurposeletiable(rankValue, i);
      }
    }
  }

  medianValue(connectedCells, rankValue) {
    let medianValues = [];
    let arrayCount = 0;

    for (let i = 0; i < connectedCells.length; i++) {
      let cell = connectedCells[i];
      medianValues[arrayCount++] = cell.getGeneralPurposeletiable(rankValue);
    }

    medianValues.sort(function (a, b) {
      return a - b;
    });

    if (arrayCount % 2 == 1) {
      return medianValues[Math.floor(arrayCount / 2)];
    } else if (arrayCount == 2) {
      return (medianValues[0] + medianValues[1]) / 2.0;
    } else {
      let medianPoint = arrayCount / 2;
      let leftMedian = medianValues[medianPoint - 1] - medianValues[0];
      let rightMedian = medianValues[arrayCount - 1] - medianValues[medianPoint];
      return (
        (medianValues[medianPoint - 1] * rightMedian + medianValues[medianPoint] * leftMedian) /
        (leftMedian + rightMedian)
      );
    }
  }
}
