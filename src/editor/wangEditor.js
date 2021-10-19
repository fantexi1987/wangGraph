import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangGeometry } from '@wangGraph/model/wangGeometry';
import { wangCell } from '@wangGraph/model/wangCell';
import { wangOutline } from '@wangGraph/view/wangOutline';
import { wangForm } from '@wangGraph/util/wangForm';
import { wangWindow } from '@wangGraph/util/wangWindow';
import { wangDefaultToolbar } from '@wangGraph/editor/wangDefaultToolbar';
import { wangCompactTreeLayout } from '@wangGraph/layout/wangCompactTreeLayout';
import { wangStackLayout } from '@wangGraph/layout/wangStackLayout';
import { wangCellAttributeChange } from '@wangGraph/model/changes/wangCellAttributeChange';
import { wangValueChange } from '@wangGraph/model/changes/wangValueChange';
import { wangRootChange } from '@wangGraph/model/changes/wangRootChange';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangDivResizer } from '@wangGraph/util/wangDivResizer';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangRubberband } from '@wangGraph/handler/wangRubberband';
import { wangLayoutManager } from '@wangGraph/view/wangLayoutManager';
import { wangSwimlaneManager } from '@wangGraph/view/wangSwimlaneManager';
import { wangGraph } from '@wangGraph/view/wangGraph';
import { wangCodec } from '@wangGraph/io/wangCodec';
import { wangLog } from '@wangGraph/util/wangLog';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangClipboard } from '@wangGraph/util/wangClipboard';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangPrintPreview } from '@wangGraph/view/wangPrintPreview';
import { wangDefaultKeyHandler } from '@wangGraph/editor/wangDefaultKeyHandler';
import { wangUndoManager } from '@wangGraph/util/wangUndoManager';
import { wangDefaultPopupMenu } from '@wangGraph/editor/wangDefaultPopupMenu';
import { wangClient } from '@wangGraph/wangClient';
import { wangResources } from '@wangGraph/util/wangResources';

export class wangEditor extends wangEventSource {
  askZoomResource = wangClient.language != 'none' ? 'askZoom' : '';
  lastSavedResource = wangClient.language != 'none' ? 'lastSaved' : '';
  currentFileResource = wangClient.language != 'none' ? 'currentFile' : '';
  propertiesResource = wangClient.language != 'none' ? 'properties' : '';
  tasksResource = wangClient.language != 'none' ? 'tasks' : '';
  helpResource = wangClient.language != 'none' ? 'help' : '';
  outlineResource = wangClient.language != 'none' ? 'outline' : '';
  outline = null;
  graph = null;
  graphRenderHint = null;
  toolbar = null;
  status = null;
  popupHandler = null;
  undoManager = null;
  keyHandler = null;
  dblClickAction = 'edit';
  swimlaneRequired = false;
  disableContextMenu = true;
  insertFunction = null;
  forcedInserting = false;
  templates = null;
  defaultEdge = null;
  defaultEdgeStyle = null;
  defaultGroup = null;
  groupBorderSize = null;
  filename = null;
  linefeed = '&#xa;';
  postParameterName = 'xml';
  escapePostData = true;
  urlPost = null;
  urlImage = null;
  horizontalFlow = false;
  layoutDiagram = false;
  swimlaneSpacing = 0;
  maintainSwimlanes = false;
  layoutSwimlanes = false;
  cycleAttributeValues = null;
  cycleAttributeIndex = 0;
  cycleAttributeName = 'fillColor';
  tasks = null;
  tasksWindowImage = null;
  tasksTop = 20;
  help = null;
  helpWindowImage = null;
  urlHelp = null;
  helpWidth = 300;
  helpHeight = 260;
  propertiesWidth = 240;
  propertiesHeight = null;
  movePropertiesDialog = false;
  validating = false;
  modified = false;

  constructor(config) {
    super();
    this.actions = [];
    this.addActions();

    if (document.body != null) {
      this.cycleAttributeValues = [];
      this.popupHandler = new wangDefaultPopupMenu();
      this.undoManager = new wangUndoManager();
      this.graph = this.createGraph();
      this.toolbar = this.createToolbar();
      this.keyHandler = new wangDefaultKeyHandler(this);
      this.configure(config);
      this.graph.swimlaneIndicatorColorAttribute = this.cycleAttributeName;

      if (this.onInit != null) {
        this.onInit();
      }
    }
  }

  isModified() {
    return this.modified;
  }

  setModified(value) {
    this.modified = value;
  }

  addActions() {
    this.addAction('save', function (editor) {
      editor.save();
    });
    this.addAction('print', function (editor) {
      let preview = new wangPrintPreview(editor.graph, 1);
      preview.open();
    });
    this.addAction('show', function (editor) {
      wangUtils.show(editor.graph, null, 10, 10);
    });
    this.addAction('exportImage', function (editor) {
      let url = editor.getUrlImage();

      if (url == null || wangClient.IS_LOCAL) {
        editor.execute('show');
      } else {
        let node = wangUtils.getViewXml(editor.graph, 1);
        let xml = wangUtils.getXml(node, '\n');
        wangUtils.submit(url, editor.postParameterName + '=' + encodeURIComponent(xml), document, '_blank');
      }
    });
    this.addAction('refresh', function (editor) {
      editor.graph.refresh();
    });
    this.addAction('cut', function (editor) {
      if (editor.graph.isEnabled()) {
        wangClipboard.cut(editor.graph);
      }
    });
    this.addAction('copy', function (editor) {
      if (editor.graph.isEnabled()) {
        wangClipboard.copy(editor.graph);
      }
    });
    this.addAction('paste', function (editor) {
      if (editor.graph.isEnabled()) {
        wangClipboard.paste(editor.graph);
      }
    });
    this.addAction('delete', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.removeCells();
      }
    });
    this.addAction('group', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setSelectionCell(editor.groupCells());
      }
    });
    this.addAction('ungroup', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setSelectionCells(editor.graph.ungroupCells());
      }
    });
    this.addAction('removeFromParent', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.removeCellsFromParent();
      }
    });
    this.addAction('undo', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.undo();
      }
    });
    this.addAction('redo', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.redo();
      }
    });
    this.addAction('zoomIn', function (editor) {
      editor.graph.zoomIn();
    });
    this.addAction('zoomOut', function (editor) {
      editor.graph.zoomOut();
    });
    this.addAction('actualSize', function (editor) {
      editor.graph.zoomActual();
    });
    this.addAction('fit', function (editor) {
      editor.graph.fit();
    });
    this.addAction('showProperties', function (editor, cell) {
      editor.showProperties(cell);
    });
    this.addAction('selectAll', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectAll();
      }
    });
    this.addAction('selectNone', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.clearSelection();
      }
    });
    this.addAction('selectVertices', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectVertices();
      }
    });
    this.addAction('selectEdges', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectEdges();
      }
    });
    this.addAction('edit', function (editor, cell) {
      if (editor.graph.isEnabled() && editor.graph.isCellEditable(cell)) {
        editor.graph.startEditingAtCell(cell);
      }
    });
    this.addAction('toBack', function (editor, cell) {
      if (editor.graph.isEnabled()) {
        editor.graph.orderCells(true);
      }
    });
    this.addAction('toFront', function (editor, cell) {
      if (editor.graph.isEnabled()) {
        editor.graph.orderCells(false);
      }
    });
    this.addAction('enterGroup', function (editor, cell) {
      editor.graph.enterGroup(cell);
    });
    this.addAction('exitGroup', function (editor) {
      editor.graph.exitGroup();
    });
    this.addAction('home', function (editor) {
      editor.graph.home();
    });
    this.addAction('selectPrevious', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectPreviousCell();
      }
    });
    this.addAction('selectNext', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectNextCell();
      }
    });
    this.addAction('selectParent', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectParentCell();
      }
    });
    this.addAction('selectChild', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.selectChildCell();
      }
    });
    this.addAction('collapse', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.foldCells(true);
      }
    });
    this.addAction('collapseAll', function (editor) {
      if (editor.graph.isEnabled()) {
        let cells = editor.graph.getChildVertices();
        editor.graph.foldCells(true, false, cells);
      }
    });
    this.addAction('expand', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.foldCells(false);
      }
    });
    this.addAction('expandAll', function (editor) {
      if (editor.graph.isEnabled()) {
        let cells = editor.graph.getChildVertices();
        editor.graph.foldCells(false, false, cells);
      }
    });
    this.addAction('bold', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.toggleCellStyleFlags(wangConstants.STYLE_FONTSTYLE, wangConstants.FONT_BOLD);
      }
    });
    this.addAction('italic', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.toggleCellStyleFlags(wangConstants.STYLE_FONTSTYLE, wangConstants.FONT_ITALIC);
      }
    });
    this.addAction('underline', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.toggleCellStyleFlags(wangConstants.STYLE_FONTSTYLE, wangConstants.FONT_UNDERLINE);
      }
    });
    this.addAction('alignCellsLeft', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.alignCells(wangConstants.ALIGN_LEFT);
      }
    });
    this.addAction('alignCellsCenter', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.alignCells(wangConstants.ALIGN_CENTER);
      }
    });
    this.addAction('alignCellsRight', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.alignCells(wangConstants.ALIGN_RIGHT);
      }
    });
    this.addAction('alignCellsTop', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.alignCells(wangConstants.ALIGN_TOP);
      }
    });
    this.addAction('alignCellsMiddle', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.alignCells(wangConstants.ALIGN_MIDDLE);
      }
    });
    this.addAction('alignCellsBottom', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.alignCells(wangConstants.ALIGN_BOTTOM);
      }
    });
    this.addAction('alignFontLeft', function (editor) {
      editor.graph.setCellStyles(wangConstants.STYLE_ALIGN, wangConstants.ALIGN_LEFT);
    });
    this.addAction('alignFontCenter', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setCellStyles(wangConstants.STYLE_ALIGN, wangConstants.ALIGN_CENTER);
      }
    });
    this.addAction('alignFontRight', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setCellStyles(wangConstants.STYLE_ALIGN, wangConstants.ALIGN_RIGHT);
      }
    });
    this.addAction('alignFontTop', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setCellStyles(wangConstants.STYLE_VERTICAL_ALIGN, wangConstants.ALIGN_TOP);
      }
    });
    this.addAction('alignFontMiddle', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setCellStyles(wangConstants.STYLE_VERTICAL_ALIGN, wangConstants.ALIGN_MIDDLE);
      }
    });
    this.addAction('alignFontBottom', function (editor) {
      if (editor.graph.isEnabled()) {
        editor.graph.setCellStyles(wangConstants.STYLE_VERTICAL_ALIGN, wangConstants.ALIGN_BOTTOM);
      }
    });
    this.addAction('zoom', function (editor) {
      let current = editor.graph.getView().scale * 100;
      let scale =
        parseFloat(wangUtils.prompt(wangResources.get(editor.askZoomResource) || editor.askZoomResource, current)) / 100;

      if (!isNaN(scale)) {
        editor.graph.getView().setScale(scale);
      }
    });
    this.addAction('toggletasks', function (editor) {
      if (editor.tasks != null) {
        editor.tasks.setVisible(!editor.tasks.isVisible());
      } else {
        editor.showTasks();
      }
    });
    this.addAction('toggleHelp', function (editor) {
      if (editor.help != null) {
        editor.help.setVisible(!editor.help.isVisible());
      } else {
        editor.showHelp();
      }
    });
    this.addAction('toggleOutline', function (editor) {
      if (editor.outline == null) {
        editor.showOutline();
      } else {
        editor.outline.setVisible(!editor.outline.isVisible());
      }
    });
    this.addAction('toggleConsole', function (editor) {
      wangLog.setVisible(!wangLog.isVisible());
    });
  }

  configure(node) {
    if (node != null) {
      let dec = new wangCodec(node.ownerDocument);
      dec.decode(node, this);
      this.resetHistory();
    }
  }

  resetFirstTime() {
    document.cookie = 'wangGraph=seen; expires=Fri, 27 Jul 2001 02:47:11 UTC; path=/';
  }

  resetHistory() {
    this.lastSnapshot = new Date().getTime();
    this.undoManager.clear();
    this.ignoredChanges = 0;
    this.setModified(false);
  }

  addAction(actionname, funct) {
    this.actions[actionname] = funct;
  }

  execute(actionname, cell, evt) {
    let action = this.actions[actionname];

    if (action != null) {
      try {
        let args = arguments;
        args[0] = this;
        action.apply(this, args);
      } catch (e) {
        wangUtils.error('Cannot execute ' + actionname + ': ' + e.message, 280, true);
        throw e;
      }
    } else {
      wangUtils.error('Cannot find action ' + actionname, 280, true);
    }
  }

  addTemplate(name, template) {
    this.templates[name] = template;
  }

  getTemplate(name) {
    return this.templates[name];
  }

  createGraph() {
    let graph = new wangGraph(null, null, this.graphRenderHint);
    graph.setTooltips(true);
    graph.setPanning(true);
    this.installDblClickHandler(graph);
    this.installUndoHandler(graph);
    this.installDrillHandler(graph);
    this.installChangeHandler(graph);
    this.installInsertHandler(graph);

    graph.popupMenuHandler.factoryMethod = (menu, cell, evt) => {
      return this.createPopupMenu(menu, cell, evt);
    };

    graph.connectionHandler.factoryMethod = (source, target) => {
      return this.createEdge(source, target);
    };

    this.createSwimlaneManager(graph);
    this.createLayoutManager(graph);
    return graph;
  }

  createSwimlaneManager(graph) {
    let swimlaneMgr = new wangSwimlaneManager(graph, false);

    swimlaneMgr.isHorizontal = () => {
      return this.horizontalFlow;
    };

    swimlaneMgr.isEnabled = () => {
      return this.maintainSwimlanes;
    };

    return swimlaneMgr;
  }

  createLayoutManager(graph) {
    let layoutMgr = new wangLayoutManager(graph);
    let self = this;

    layoutMgr.getLayout = function (cell) {
      let layout = null;
      let model = self.graph.getModel();

      if (model.getParent(cell) != null) {
        if (self.layoutSwimlanes && graph.isSwimlane(cell)) {
          if (self.swimlaneLayout == null) {
            self.swimlaneLayout = self.createSwimlaneLayout();
          }

          layout = self.swimlaneLayout;
        } else if (self.layoutDiagram && (graph.isValidRoot(cell) || model.getParent(model.getParent(cell)) == null)) {
          if (self.diagramLayout == null) {
            self.diagramLayout = self.createDiagramLayout();
          }

          layout = self.diagramLayout;
        }
      }

      return layout;
    };

    return layoutMgr;
  }

  setGraphContainer(container) {
    if (this.graph.container == null) {
      this.graph.init(container);
      this.rubberband = new wangRubberband(this.graph);

      if (this.disableContextMenu) {
        wangEvent.disableContextMenu(container);
      }

      if (wangClient.IS_QUIRKS) {
        new wangDivResizer(container);
      }
    }
  }

  installDblClickHandler(graph) {
    graph.addListener(wangEvent.DOUBLE_CLICK, (sender, evt) => {
      let cell = evt.getProperty('cell');

      if (cell != null && graph.isEnabled() && this.dblClickAction != null) {
        this.execute(this.dblClickAction, cell);
        evt.consume();
      }
    });
  }

  installUndoHandler(graph) {
    let listener = (sender, evt) => {
      let edit = evt.getProperty('edit');
      this.undoManager.undoableEditHappened(edit);
    };

    graph.getModel().addListener(wangEvent.UNDO, listener);
    graph.getView().addListener(wangEvent.UNDO, listener);

    let undoHandler = function (sender, evt) {
      let changes = evt.getProperty('edit').changes;
      graph.setSelectionCells(graph.getSelectionCellsForChanges(changes));
    };

    this.undoManager.addListener(wangEvent.UNDO, undoHandler);
    this.undoManager.addListener(wangEvent.REDO, undoHandler);
  }

  installDrillHandler(graph) {
    let listener = (sender) => {
      this.fireEvent(new wangEventObject(wangEvent.ROOT));
    };

    graph.getView().addListener(wangEvent.DOWN, listener);
    graph.getView().addListener(wangEvent.UP, listener);
  }

  installChangeHandler(graph) {
    let listener = (sender, evt) => {
      this.setModified(true);

      if (this.validating == true) {
        graph.validateGraph();
      }

      let changes = evt.getProperty('edit').changes;

      for (let i = 0; i < changes.length; i++) {
        let change = changes[i];

        if (
          change instanceof wangRootChange ||
          (change instanceof wangValueChange && change.cell == this.graph.model.root) ||
          (change instanceof wangCellAttributeChange && change.cell == this.graph.model.root)
        ) {
          this.fireEvent(new wangEventObject(wangEvent.ROOT));
          break;
        }
      }
    };

    graph.getModel().addListener(wangEvent.CHANGE, listener);
  }

  installInsertHandler(graph) {
    let self = this;
    let insertHandler = {
      mouseDown: function (sender, me) {
        if (self.insertFunction != null && !me.isPopupTrigger() && (self.forcedInserting || me.getState() == null)) {
          self.graph.clearSelection();
          self.insertFunction(me.getEvent(), me.getCell());
          this.isActive = true;
          me.consume();
        }
      },
      mouseMove: function (sender, me) {
        if (this.isActive) {
          me.consume();
        }
      },
      mouseUp: function (sender, me) {
        if (this.isActive) {
          this.isActive = false;
          me.consume();
        }
      }
    };
    graph.addMouseListener(insertHandler);
  }

  createDiagramLayout() {
    let gs = this.graph.gridSize;
    let layout = new wangStackLayout(this.graph, !this.horizontalFlow, this.swimlaneSpacing, 2 * gs, 2 * gs);

    layout.isVertexIgnored = function (cell) {
      return !layout.graph.isSwimlane(cell);
    };

    return layout;
  }

  createSwimlaneLayout() {
    return new wangCompactTreeLayout(this.graph, this.horizontalFlow);
  }

  createToolbar() {
    return new wangDefaultToolbar(null, this);
  }

  setToolbarContainer(container) {
    this.toolbar.init(container);

    if (wangClient.IS_QUIRKS) {
      new wangDivResizer(container);
    }
  }

  setStatusContainer(container) {
    if (this.status == null) {
      this.status = container;
      this.addListener(wangEvent.SAVE, () => {
        let tstamp = new Date().toLocaleString();
        this.setStatus((wangResources.get(this.lastSavedResource) || this.lastSavedResource) + ': ' + tstamp);
      });
      this.addListener(wangEvent.OPEN, () => {
        this.setStatus((wangResources.get(this.currentFileResource) || this.currentFileResource) + ': ' + this.filename);
      });

      if (wangClient.IS_QUIRKS) {
        new wangDivResizer(container);
      }
    }
  }

  setStatus(message) {
    if (this.status != null && message != null) {
      this.status.innerHTML = message;
    }
  }

  setTitleContainer(container) {
    this.addListener(wangEvent.ROOT, (sender) => {
      container.innerHTML = this.getTitle();
    });

    if (wangClient.IS_QUIRKS) {
      new wangDivResizer(container);
    }
  }

  treeLayout(cell, horizontal) {
    if (cell != null) {
      let layout = new wangCompactTreeLayout(this.graph, horizontal);
      layout.execute(cell);
    }
  }

  getTitle() {
    let title = '';
    let graph = this.graph;
    let cell = graph.getCurrentRoot();

    while (cell != null && graph.getModel().getParent(graph.getModel().getParent(cell)) != null) {
      if (graph.isValidRoot(cell)) {
        title = ' > ' + graph.convertValueToString(cell) + title;
      }

      cell = graph.getModel().getParent(cell);
    }

    let prefix = this.getRootTitle();
    return prefix + title;
  }

  getRootTitle() {
    let root = this.graph.getModel().getRoot();
    return this.graph.convertValueToString(root);
  }

  undo() {
    this.undoManager.undo();
  }

  redo() {
    this.undoManager.redo();
  }

  groupCells() {
    let border = this.groupBorderSize != null ? this.groupBorderSize : this.graph.gridSize;
    return this.graph.groupCells(this.createGroup(), border);
  }

  createGroup() {
    let model = this.graph.getModel();
    return model.cloneCell(this.defaultGroup);
  }

  open(filename) {
    if (filename != null) {
      let xml = wangUtils.load(filename).getXml();
      this.readGraphModel(xml.documentElement);
      this.filename = filename;
      this.fireEvent(new wangEventObject(wangEvent.OPEN, 'filename', filename));
    }
  }

  readGraphModel(node) {
    let dec = new wangCodec(node.ownerDocument);
    dec.decode(node, this.graph.getModel());
    this.resetHistory();
  }

  save(url, linefeed) {
    url = url || this.getUrlPost();

    if (url != null && url.length > 0) {
      let data = this.writeGraphModel(linefeed);
      this.postDiagram(url, data);
      this.setModified(false);
    }

    this.fireEvent(new wangEventObject(wangEvent.SAVE, 'url', url));
  }

  postDiagram(url, data) {
    if (this.escapePostData) {
      data = encodeURIComponent(data);
    }

    wangUtils.post(url, this.postParameterName + '=' + data, (req) => {
      this.fireEvent(new wangEventObject(wangEvent.POST, 'request', req, 'url', url, 'data', data));
    });
  }

  writeGraphModel(linefeed) {
    linefeed = linefeed != null ? linefeed : this.linefeed;
    let enc = new wangCodec();
    let node = enc.encode(this.graph.getModel());
    return wangUtils.getXml(node, linefeed);
  }

  getUrlPost() {
    return this.urlPost;
  }

  getUrlImage() {
    return this.urlImage;
  }

  swapStyles(first, second) {
    let style = this.graph.getStylesheet().styles[second];
    this.graph.getView().getStylesheet().putCellStyle(second, this.graph.getStylesheet().styles[first]);
    this.graph.getStylesheet().putCellStyle(first, style);
    this.graph.refresh();
  }

  showProperties(cell) {
    cell = cell || this.graph.getSelectionCell();

    if (cell == null) {
      cell = this.graph.getCurrentRoot();

      if (cell == null) {
        cell = this.graph.getModel().getRoot();
      }
    }

    if (cell != null) {
      this.graph.stopEditing(true);
      let offset = wangUtils.getOffset(this.graph.container);
      let x = offset.x + 10;
      let y = offset.y;

      if (this.properties != null && !this.movePropertiesDialog) {
        x = this.properties.getX();
        y = this.properties.getY();
      } else {
        let bounds = this.graph.getCellBounds(cell);

        if (bounds != null) {
          x += bounds.x + Math.min(200, bounds.width);
          y += bounds.y;
        }
      }

      this.hideProperties();
      let node = this.createProperties(cell);

      if (node != null) {
        this.properties = new wangWindow(
          wangResources.get(this.propertiesResource) || this.propertiesResource,
          node,
          x,
          y,
          this.propertiesWidth,
          this.propertiesHeight,
          false
        );
        this.properties.setVisible(true);
      }
    }
  }

  isPropertiesVisible() {
    return this.properties != null;
  }

  createProperties(cell) {
    let model = this.graph.getModel();
    let value = model.getValue(cell);

    if (wangUtils.isNode(value)) {
      let form = new wangForm('properties');
      let id = form.addText('ID', cell.getId());
      id.setAttribute('readonly', 'true');
      let geo = null;
      let yField = null;
      let xField = null;
      let widthField = null;
      let heightField = null;

      if (model.isVertex(cell)) {
        geo = model.getGeometry(cell);

        if (geo != null) {
          yField = form.addText('top', geo.y);
          xField = form.addText('left', geo.x);
          widthField = form.addText('width', geo.width);
          heightField = form.addText('height', geo.height);
        }
      }

      let tmp = model.getStyle(cell);
      let style = form.addText('Style', tmp || '');
      let attrs = value.attributes;
      let texts = [];

      for (let i = 0; i < attrs.length; i++) {
        let val = attrs[i].value;
        texts[i] = form.addTextarea(attrs[i].nodeName, val, attrs[i].nodeName == 'label' ? 4 : 2);
      }

      let okFunction = () => {
        this.hideProperties();
        model.beginUpdate();

        try {
          if (geo != null) {
            geo = geo.clone();
            geo.x = parseFloat(xField.value);
            geo.y = parseFloat(yField.value);
            geo.width = parseFloat(widthField.value);
            geo.height = parseFloat(heightField.value);
            model.setGeometry(cell, geo);
          }

          if (style.value.length > 0) {
            model.setStyle(cell, style.value);
          } else {
            model.setStyle(cell, null);
          }

          for (let i = 0; i < attrs.length; i++) {
            let edit = new wangCellAttributeChange(cell, attrs[i].nodeName, texts[i].value);
            model.execute(edit);
          }

          if (this.graph.isAutoSizeCell(cell)) {
            this.graph.updateCellSize(cell);
          }
        } finally {
          model.endUpdate();
        }
      };

      let cancelFunction = () => {
        this.hideProperties();
      };

      form.addButtons(okFunction, cancelFunction);
      return form.table;
    }

    return null;
  }

  hideProperties() {
    if (this.properties != null) {
      this.properties.destroy();
      this.properties = null;
    }
  }

  showTasks() {
    if (this.tasks == null) {
      let div = document.createElement('div');
      div.style.padding = '4px';
      div.style.paddingLeft = '20px';
      let w = document.body.clientWidth;
      let wnd = new wangWindow(
        wangResources.get(this.tasksResource) || this.tasksResource,
        div,
        w - 220,
        this.tasksTop,
        200
      );
      wnd.setClosable(true);
      wnd.destroyOnClose = false;

      let funct = (sender) => {
        wangEvent.release(div);
        div.innerHTML = '';
        this.createTasks(div);
      };

      this.graph.getModel().addListener(wangEvent.CHANGE, funct);
      this.graph.getSelectionModel().addListener(wangEvent.CHANGE, funct);
      this.graph.addListener(wangEvent.ROOT, funct);

      if (this.tasksWindowImage != null) {
        wnd.setImage(this.tasksWindowImage);
      }

      this.tasks = wnd;
      this.createTasks(div);
    }

    this.tasks.setVisible(true);
  }

  refreshTasks(div) {
    if (this.tasks != null) {
      let div = this.tasks.content;
      wangEvent.release(div);
      div.innerHTML = '';
      this.createTasks(div);
    }
  }

  createTasks(div) {}

  showHelp(tasks) {
    if (this.help == null) {
      let frame = document.createElement('iframe');
      frame.setAttribute('src', wangResources.get('urlHelp') || this.urlHelp);
      frame.setAttribute('height', '100%');
      frame.setAttribute('width', '100%');
      frame.setAttribute('frameBorder', '0');
      frame.style.backgroundColor = 'white';
      let w = document.body.clientWidth;
      let h = document.body.clientHeight || document.documentElement.clientHeight;
      let wnd = new wangWindow(
        wangResources.get(this.helpResource) || this.helpResource,
        frame,
        (w - this.helpWidth) / 2,
        (h - this.helpHeight) / 3,
        this.helpWidth,
        this.helpHeight
      );
      wnd.setMaximizable(true);
      wnd.setClosable(true);
      wnd.destroyOnClose = false;
      wnd.setResizable(true);

      if (this.helpWindowImage != null) {
        wnd.setImage(this.helpWindowImage);
      }

      if (wangClient.IS_NS) {
        let handler = function (sender) {
          let h = wnd.div.offsetHeight;
          frame.setAttribute('height', h - 26 + 'px');
        };

        wnd.addListener(wangEvent.RESIZE_END, handler);
        wnd.addListener(wangEvent.MAXIMIZE, handler);
        wnd.addListener(wangEvent.NORMALIZE, handler);
        wnd.addListener(wangEvent.SHOW, handler);
      }

      this.help = wnd;
    }

    this.help.setVisible(true);
  }

  showOutline() {
    let create = this.outline == null;

    if (create) {
      let div = document.createElement('div');
      div.style.overflow = 'hidden';
      div.style.position = 'relative';
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.background = 'white';
      div.style.cursor = 'move';

      if (document.documentMode == 8) {
        div.style.filter = 'progid:DXImageTransform.Microsoft.alpha(opacity=100)';
      }

      let wnd = new wangWindow(
        wangResources.get(this.outlineResource) || this.outlineResource,
        div,
        600,
        480,
        200,
        200,
        false
      );
      let outline = new wangOutline(this.graph, div);
      wnd.setClosable(true);
      wnd.setResizable(true);
      wnd.destroyOnClose = false;
      wnd.addListener(wangEvent.RESIZE_END, function () {
        outline.update();
      });
      this.outline = wnd;
      this.outline.outline = outline;
    }

    this.outline.setVisible(true);
    this.outline.outline.update(true);
  }

  setMode(modename) {
    if (modename == 'select') {
      this.graph.panningHandler.useLeftButtonForPanning = false;
      this.graph.setConnectable(false);
    } else if (modename == 'connect') {
      this.graph.panningHandler.useLeftButtonForPanning = false;
      this.graph.setConnectable(true);
    } else if (modename == 'pan') {
      this.graph.panningHandler.useLeftButtonForPanning = true;
      this.graph.setConnectable(false);
    }
  }

  createPopupMenu(menu, cell, evt) {
    this.popupHandler.createMenu(this, menu, cell, evt);
  }

  createEdge(source, target) {
    let e = null;

    if (this.defaultEdge != null) {
      let model = this.graph.getModel();
      e = model.cloneCell(this.defaultEdge);
    } else {
      e = new wangCell('');
      e.setEdge(true);
      let geo = new wangGeometry();
      geo.relative = true;
      e.setGeometry(geo);
    }

    let style = this.getEdgeStyle();

    if (style != null) {
      e.setStyle(style);
    }

    return e;
  }

  getEdgeStyle() {
    return this.defaultEdgeStyle;
  }

  consumeCycleAttribute(cell) {
    return this.cycleAttributeValues != null && this.cycleAttributeValues.length > 0 && this.graph.isSwimlane(cell)
      ? this.cycleAttributeValues[this.cycleAttributeIndex++ % this.cycleAttributeValues.length]
      : null;
  }

  cycleAttribute(cell) {
    if (this.cycleAttributeName != null) {
      let value = this.consumeCycleAttribute(cell);

      if (value != null) {
        cell.setStyle(cell.getStyle() + ';' + this.cycleAttributeName + '=' + value);
      }
    }
  }

  addVertex(parent, vertex, x, y) {
    let model = this.graph.getModel();

    while (parent != null && !this.graph.isValidDropTarget(parent)) {
      parent = model.getParent(parent);
    }

    parent = parent != null ? parent : this.graph.getSwimlaneAt(x, y);
    let scale = this.graph.getView().scale;
    let geo = model.getGeometry(vertex);
    let pgeo = model.getGeometry(parent);

    if (this.graph.isSwimlane(vertex) && !this.graph.swimlaneNesting) {
      parent = null;
    } else if (parent == null && this.swimlaneRequired) {
      return null;
    } else if (parent != null && pgeo != null) {
      let state = this.graph.getView().getState(parent);

      if (state != null) {
        x -= state.origin.x * scale;
        y -= state.origin.y * scale;

        if (this.graph.isConstrainedMoving) {
          let width = geo.width;
          let height = geo.height;
          let tmp = state.x + state.width;

          if (x + width > tmp) {
            x -= x + width - tmp;
          }

          tmp = state.y + state.height;

          if (y + height > tmp) {
            y -= y + height - tmp;
          }
        }
      } else if (pgeo != null) {
        x -= pgeo.x * scale;
        y -= pgeo.y * scale;
      }
    }

    geo = geo.clone();
    geo.x = this.graph.snap(x / scale - this.graph.getView().translate.x - this.graph.gridSize / 2);
    geo.y = this.graph.snap(y / scale - this.graph.getView().translate.y - this.graph.gridSize / 2);
    vertex.setGeometry(geo);

    if (parent == null) {
      parent = this.graph.getDefaultParent();
    }

    this.cycleAttribute(vertex);
    this.fireEvent(new wangEventObject(wangEvent.BEFORE_ADD_VERTEX, 'vertex', vertex, 'parent', parent));
    model.beginUpdate();

    try {
      vertex = this.graph.addCell(vertex, parent);

      if (vertex != null) {
        this.graph.constrainChild(vertex);
        this.fireEvent(new wangEventObject(wangEvent.ADD_VERTEX, 'vertex', vertex));
      }
    } finally {
      model.endUpdate();
    }

    if (vertex != null) {
      this.graph.setSelectionCell(vertex);
      this.graph.scrollCellToVisible(vertex);
      this.fireEvent(new wangEventObject(wangEvent.AFTER_ADD_VERTEX, 'vertex', vertex));
    }

    return vertex;
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;

      if (this.tasks != null) {
        this.tasks.destroy();
      }

      if (this.outline != null) {
        this.outline.destroy();
      }

      if (this.properties != null) {
        this.properties.destroy();
      }

      if (this.keyHandler != null) {
        this.keyHandler.destroy();
      }

      if (this.rubberband != null) {
        this.rubberband.destroy();
      }

      if (this.toolbar != null) {
        this.toolbar.destroy();
      }

      if (this.graph != null) {
        this.graph.destroy();
      }

      this.status = null;
      this.templates = null;
    }
  }
}
