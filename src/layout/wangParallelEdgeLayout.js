import { wangGraphLayout } from '@wangGraph/layout/wangGraphLayout';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangObjectIdentity } from '@wangGraph/util/wangObjectIdentity';

export class wangParallelEdgeLayout extends wangGraphLayout {
  spacing = 20;

  constructor(graph) {
    super(graph);
  }

  execute(parent) {
    let lookup = this.findParallels(parent);
    this.graph.model.beginUpdate();

    try {
      for (let i in lookup) {
        let parallels = lookup[i];

        if (parallels.length > 1) {
          this.layout(parallels);
        }
      }
    } finally {
      this.graph.model.endUpdate();
    }
  }

  findParallels(parent) {
    let model = this.graph.getModel();
    let lookup = [];
    let childCount = model.getChildCount(parent);

    for (let i = 0; i < childCount; i++) {
      let child = model.getChildAt(parent, i);

      if (!this.isEdgeIgnored(child)) {
        let id = this.getEdgeId(child);

        if (id != null) {
          if (lookup[id] == null) {
            lookup[id] = [];
          }

          lookup[id].push(child);
        }
      }
    }

    return lookup;
  }

  getEdgeId(edge) {
    let view = this.graph.getView();
    let src = view.getVisibleterminal(edge, true);
    let trg = view.getVisibleterminal(edge, false);

    if (src != null && trg != null) {
      src = wangObjectIdentity.get(src);
      trg = wangObjectIdentity.get(trg);
      return src > trg ? trg + '-' + src : src + '-' + trg;
    }

    return null;
  }

  layout(parallels) {
    let edge = parallels[0];
    let view = this.graph.getView();
    let model = this.graph.getModel();
    let src = model.getGeometry(view.getVisibleterminal(edge, true));
    let trg = model.getGeometry(view.getVisibleterminal(edge, false));

    if (src == trg) {
      let x0 = src.x + src.width + this.spacing;
      let y0 = src.y + src.height / 2;

      for (let i = 0; i < parallels.length; i++) {
        this.route(parallels[i], x0, y0);
        x0 += this.spacing;
      }
    } else if (src != null && trg != null) {
      let scx = src.x + src.width / 2;
      let scy = src.y + src.height / 2;
      let tcx = trg.x + trg.width / 2;
      let tcy = trg.y + trg.height / 2;
      let dx = tcx - scx;
      let dy = tcy - scy;
      let len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0) {
        let x0 = scx + dx / 2;
        let y0 = scy + dy / 2;
        let nx = (dy * this.spacing) / len;
        let ny = (dx * this.spacing) / len;
        x0 += (nx * (parallels.length - 1)) / 2;
        y0 -= (ny * (parallels.length - 1)) / 2;

        for (let i = 0; i < parallels.length; i++) {
          this.route(parallels[i], x0, y0);
          x0 -= nx;
          y0 += ny;
        }
      }
    }
  }

  route(edge, x, y) {
    if (this.graph.isCellMovable(edge)) {
      this.setEdgePoints(edge, [new wangPoint(x, y)]);
    }
  }
}
