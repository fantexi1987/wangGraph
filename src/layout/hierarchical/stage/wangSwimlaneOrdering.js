import { wangHierarchicalLayoutStage } from '@wangGraph/layout/hierarchical/stage/wangHierarchicalLayoutStage';
import { wangCellPath } from '@wangGraph/model/wangCellPath';
import { wangUtils } from '@wangGraph/util/wangUtils';
export class wangSwimlaneOrdering extends wangHierarchicalLayoutStage {
  constructor(layout) {
    super();
    this.layout = layout;
  }

  execute(parent) {
    let model = this.layout.getModel();
    let seenNodes = new Object();
    let unseenNodes = wangUtils.clone(model.vertexMapper, null, true);
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
        let isAncestor = parent != null && parent.swimlaneIndex == node.swimlaneIndex && node.isAncestor(parent);
        let reversedOverSwimlane =
          parent != null &&
          connectingEdge != null &&
          parent.swimlaneIndex < node.swimlaneIndex &&
          connectingEdge.source == node;

        if (isAncestor) {
          connectingEdge.invert();
          wangUtils.remove(connectingEdge, parent.connectsAsSource);
          node.connectsAsSource.push(connectingEdge);
          parent.connectsAsTarget.push(connectingEdge);
          wangUtils.remove(connectingEdge, node.connectsAsTarget);
        } else if (reversedOverSwimlane) {
          connectingEdge.invert();
          wangUtils.remove(connectingEdge, parent.connectsAsTarget);
          node.connectsAsTarget.push(connectingEdge);
          parent.connectsAsSource.push(connectingEdge);
          wangUtils.remove(connectingEdge, node.connectsAsSource);
        }

        let cellId = wangCellPath.create(node.cell);
        seenNodes[cellId] = node;
        delete unseenNodes[cellId];
      },
      rootsArray,
      true,
      null
    );
  }
}
