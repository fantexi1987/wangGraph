window.getGraphData = function (treeNum = 1, row = 10, column = 5) {
  const getData = (treeNum = 1, row = 10, column = 5) => {
    const nodes = [];
    const edges = [];
    const res = { nodes, edges };
    for (let i = 0; i < treeNum; i++) {
      const base = i * (row * column + 2);
      const tree = getOneTree(base, row, column);
      res.nodes = res.nodes.concat(tree.nodes);
      res.edges = res.edges.concat(tree.edges);
    }
    return res;
  };
  const getOneTree = (base, row = 10, column = 5) => {
    const getEdge = (source, target) => {
      return { source, target };
    };
    const getDefaultCell = (id) => {
      return {
        id: id.toString()
      };
    };
    const nodes = [];
    const edges = [];
    const initData = { nodes, edges };
    const initNode = getDefaultCell(0 + base);
    initData.nodes.push(initNode);
    const endNode = getDefaultCell(1 + column * row + base);
    for (let i = 1; i < column * row + 1; i++) {
      const node = getDefaultCell(i + base);
      let edge;
      if (i % row === 1) {
        edge = getEdge(initNode.id, node.id);
      } else {
        edge = getEdge(initData.nodes[i - 1].id, node.id);
        if (i % row === 0) {
          const extralEdge = getEdge(node.id, endNode.id);
          initData.edges.push(extralEdge);
        }
      }
      initData.nodes.push(node);
      initData.edges.push(edge);
    }
    initData.nodes.push(endNode);
    return initData;
  };
  const uuid = () => {
    const s = [];
    const hexDigits = '0123456789abcdef';
    for (let i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4';
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = '-';
    const id = s.join('');
    return id;
  };
  const getMxCellStr = (id) => {
    let str = '';
    id += ' ';
    const wangCellStr =
      wangCellHead +
      ` id = "${id}"` +
      ` style = "${wangCellStyle}"` +
      ` parent = "layer1"` +
      ` vertex = "1"` +
      ` name = "${id}"` +
      ` value = "${id}"` +
      '>';
    const wangGeoStr = wangGeometry + ' width = "80"' + ' height = "40"' + ` as = "geometry"` + `/>`;
    str = wangCellStr + wangGeoStr + wangCellEnd;
    return str;
  };
  const getEdgeStr = (source, target) => {
    let str = '';
    source += ' ';
    target += ' ';
    const id = uuid();
    const wangCellStr =
      wangCellHead +
      ` id = "${id}"` +
      ` style = "${edgeStyle}"` +
      ` parent = "layer1"` +
      ` source = "${source}"` +
      ` target = "${target}"` +
      ` edge = "1"` +
      '>';
    const wangGeoStr = wangGeometry + ` width = "80"` + ' height = "60"' + ` as = "geometry"` + `/>`;
    str = wangCellStr + wangGeoStr + wangCellEnd;
    return str;
  };

  const { edges, nodes } = getData(treeNum, row, column);
  const header = `<wangGraphModel><root><wangCell id = "0" /><wangCell id = "layer1" parent = "0" name = "layer1"></wangCell>`;
  const ender = ` </root></wangGraphModel>`;
  const wangCellHead = '<wangCell';
  const wangCellEnd = '</wangCell>';
  const wangGeometry = '<wangGeometry';
  const wangCellStyle = 'shape=if;fillColor=#E1DE68';
  const edgeStyle = 'shape=connector';
  let xmlStr = header;
  for (let edge of edges) {
    const { source, target } = edge;
    xmlStr += getEdgeStr(source, target);
  }
  for (let node of nodes) {
    const { id } = node;
    xmlStr += getMxCellStr(id);
  }
  xmlStr += ender;
  return xmlStr;
}
