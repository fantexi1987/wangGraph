import { wangHierarchicalLayoutStage } from '@wangGraph/layout/hierarchical/stage/wangHierarchicalLayoutStage';
import { wangUtils } from '@wangGraph/util/wangUtils';
export class wangMinimumCycleRemover extends wangHierarchicalLayoutStage {
  constructor(layout) {
    super();
    this.layout = layout;
  }

  execute(parent) {
    let model = this.layout.getModel();
    let seenNodes = new Object();
    let unseenNodesArray = model.vertexMapper.getValues();
    let unseenNodes = new Object();

    for (let i = 0; i < unseenNodesArray.length; i++) {
      unseenNodes[unseenNodesArray[i].id] = unseenNodesArray[i];
    }

    let rootsArray = null;

    if (model.roots != null) {
      let modelRoots = model.roots;
      rootsArray = [];

      for (let i = 0; i < modelRoots.length; i++) {
        rootsArray[i] = model.vertexMapper.get(modelRoots[i]);
      }
    }

    model.visit(
      function (parent, node, connectingEdge, layer, seen) {
        if (node.isAncestor(parent)) {
          connectingEdge.invert();
          wangUtils.remove(connectingEdge, parent.connectsAsSource);
          parent.connectsAsTarget.push(connectingEdge);
          wangUtils.remove(connectingEdge, node.connectsAsTarget);
          node.connectsAsSource.push(connectingEdge);
        }

        seenNodes[node.id] = node;
        delete unseenNodes[node.id];
      },
      rootsArray,
      true,
      null
    );
    let seenNodesCopy = wangUtils.clone(seenNodes, null, true);
    model.visit(
      function (parent, node, connectingEdge, layer, seen) {
        if (node.isAncestor(parent)) {
          connectingEdge.invert();
          wangUtils.remove(connectingEdge, parent.connectsAsSource);
          node.connectsAsSource.push(connectingEdge);
          parent.connectsAsTarget.push(connectingEdge);
          wangUtils.remove(connectingEdge, node.connectsAsTarget);
        }

        seenNodes[node.id] = node;
        delete unseenNodes[node.id];
      },
      unseenNodes,
      true,
      seenNodesCopy
    );
  }
}
