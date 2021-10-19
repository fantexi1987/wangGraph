import { wangTemporaryCellStates } from '@wangGraph/view/wangTemporaryCellStates';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangClient } from '@wangGraph/wangClient';
import { wangRectangle } from '@wangGraph/util/wangRectangle';

export class wangPrintPreview {
  marginTop = 0;
  marginBottom = 0;
  autoOrigin = true;
  printOverlays = false;
  printControls = false;
  printBackgroundImage = false;
  backgroundColor = '#ffffff';
  wnd = null;
  targetWindow = null;
  pageCount = 0;
  clipping = true;

  constructor(graph, scale, pageFormat, border, x0, y0, borderColor, title, pageSelector) {
    this.graph = graph;
    this.scale = scale != null ? scale : 1 / graph.pageScale;
    this.border = border != null ? border : 0;
    this.pageFormat = wangRectangle.fromRectangle(pageFormat != null ? pageFormat : graph.pageFormat);
    this.title = title != null ? title : 'Printer-friendly version';
    this.x0 = x0 != null ? x0 : 0;
    this.y0 = y0 != null ? y0 : 0;
    this.borderColor = borderColor;
    this.pageSelector = pageSelector != null ? pageSelector : true;
  }

  getWindow() {
    return this.wnd;
  }

  getDoctype() {
    let dt = '';

    if (document.documentMode == 5) {
      dt = '<meta http-equiv="X-UA-Compatible" content="IE=5">';
    } else if (document.documentMode == 8) {
      dt = '<meta http-equiv="X-UA-Compatible" content="IE=8">';
    } else if (document.documentMode > 8) {
      dt = '<!--[if IE]><meta http-equiv="X-UA-Compatible" content="IE=edge"><![endif]-->';
    }

    return dt;
  }

  appendGraph(graph, scale, x0, y0, forcePageBreaks, keepOpen) {
    this.graph = graph;
    this.scale = scale != null ? scale : 1 / graph.pageScale;
    this.x0 = x0;
    this.y0 = y0;
    this.open(null, null, forcePageBreaks, keepOpen);
  }

  open(css, targetWindow, forcePageBreaks, keepOpen) {
    let previousInitializeOverlay = this.graph.cellRenderer.initializeOverlay;
    let div = null;

    try {
      if (this.printOverlays) {
        this.graph.cellRenderer.initializeOverlay = function (state, overlay) {
          overlay.init(state.view.getDrawPane());
        };
      }

      if (this.printControls) {
        this.graph.cellRenderer.initControl = function (state, control, handleEvents, clickHandler) {
          control.dialect = state.view.graph.dialect;
          control.init(state.view.getDrawPane());
        };
      }

      this.wnd = targetWindow != null ? targetWindow : this.wnd;
      let isNewWindow = false;

      if (this.wnd == null) {
        isNewWindow = true;
        this.wnd = window.open();
      }

      let doc = this.wnd.document;

      if (isNewWindow) {
        let dt = this.getDoctype();

        if (dt != null && dt.length > 0) {
          doc.writeln(dt);
        }

        if (document.compatMode === 'CSS1Compat') {
          doc.writeln('<!DOCTYPE html>');
        }

        doc.writeln('<html>');
        doc.writeln('<head>');
        this.writeHead(doc, css);
        doc.writeln('</head>');
        doc.writeln('<body class="wangPage">');
      }

      let bounds = this.graph.getGraphBounds().clone();
      let currentScale = this.graph.getView().getScale();
      let sc = currentScale / this.scale;
      let tr = this.graph.getView().getTranslate();

      if (!this.autoOrigin) {
        this.x0 -= tr.x * this.scale;
        this.y0 -= tr.y * this.scale;
        bounds.width += bounds.x;
        bounds.height += bounds.y;
        bounds.x = 0;
        bounds.y = 0;
        this.border = 0;
      }

      let availableWidth = this.pageFormat.width - this.border * 2;
      let availableHeight = this.pageFormat.height - this.border * 2;
      this.pageFormat.height += this.marginTop + this.marginBottom;
      bounds.width /= sc;
      bounds.height /= sc;
      let hpages = Math.max(1, Math.ceil((bounds.width + this.x0) / availableWidth));
      let vpages = Math.max(1, Math.ceil((bounds.height + this.y0) / availableHeight));
      this.pageCount = hpages * vpages;

      let writePageSelector = () => {
        if (this.pageSelector && (vpages > 1 || hpages > 1)) {
          let table = this.createPageSelector(vpages, hpages);
          doc.body.appendChild(table);
        }
      };

      let addPage = (div, addBreak) => {
        if (this.borderColor != null) {
          div.style.borderColor = this.borderColor;
          div.style.borderStyle = 'solid';
          div.style.borderWidth = '1px';
        }

        div.style.background = this.backgroundColor;

        if (forcePageBreaks || addBreak) {
          div.style.pageBreakAfter = 'always';
        }

        if (isNewWindow && (document.documentMode >= 11 || wangClient.IS_EDGE)) {
          doc.writeln(div.outerHTML);
          div.parentNode.removeChild(div);
        } else if (document.documentMode >= 11 || wangClient.IS_EDGE) {
          let clone = doc.createElement('div');
          clone.innerHTML = div.outerHTML;
          clone = clone.getElementsByTagName('div')[0];
          doc.body.appendChild(clone);
          div.parentNode.removeChild(div);
        } else {
          div.parentNode.removeChild(div);
          doc.body.appendChild(div);
        }

        if (forcePageBreaks || addBreak) {
          this.addPageBreak(doc);
        }
      };

      let cov = this.getCoverPages(this.pageFormat.width, this.pageFormat.height);

      if (cov != null) {
        for (let i = 0; i < cov.length; i++) {
          addPage(cov[i], true);
        }
      }

      let apx = this.getAppendices(this.pageFormat.width, this.pageFormat.height);

      for (let i = 0; i < vpages; i++) {
        let dy =
          (i * availableHeight) / this.scale - this.y0 / this.scale + (bounds.y - tr.y * currentScale) / currentScale;

        for (let j = 0; j < hpages; j++) {
          if (this.wnd == null) {
            return null;
          }

          let dx =
            (j * availableWidth) / this.scale - this.x0 / this.scale + (bounds.x - tr.x * currentScale) / currentScale;
          let pageNum = i * hpages + j + 1;
          let clip = new wangRectangle(dx, dy, availableWidth, availableHeight);
          div = this.renderPage(
            this.pageFormat.width,
            this.pageFormat.height,
            0,
            0,
            (div) => {
              this.addGraphFragment(-dx, -dy, this.scale, pageNum, div, clip);

              if (this.printBackgroundImage) {
                this.insertBackgroundImage(div, -dx, -dy);
              }
            },
            pageNum
          );
          div.setAttribute('id', 'wangPage-' + pageNum);
          addPage(div, apx != null || i < vpages - 1 || j < hpages - 1);
        }
      }

      if (apx != null) {
        for (let i = 0; i < apx.length; i++) {
          addPage(apx[i], i < apx.length - 1);
        }
      }

      if (isNewWindow && !keepOpen) {
        this.closeDocument();
        writePageSelector();
      }

      this.wnd.focus();
    } catch (e) {
      if (div != null && div.parentNode != null) {
        div.parentNode.removeChild(div);
      }
    } finally {
      this.graph.cellRenderer.initializeOverlay = previousInitializeOverlay;
    }

    return this.wnd;
  }

  addPageBreak(doc) {
    let hr = doc.createElement('hr');
    hr.className = 'wangPageBreak';
    doc.body.appendChild(hr);
  }

  closeDocument() {
    try {
      if (this.wnd != null && this.wnd.document != null) {
        let doc = this.wnd.document;
        this.writePostfix(doc);
        doc.writeln('</body>');
        doc.writeln('</html>');
        doc.close();
        wangEvent.release(doc.body);
      }
    } catch (e) {
      /* ignore */
    }
  }

  writeHead(doc, css) {
    if (this.title != null) {
      doc.writeln('<title>' + this.title + '</title>');
    }

    wangClient.link('stylesheet', wangClient.basePath + '/css/common.css', doc);
    doc.writeln('<style type="text/css">');
    doc.writeln('@media print {');
    doc.writeln('  * { -webkit-print-color-adjust: exact; }');
    doc.writeln('  table.wangPageSelector { display: none; }');
    doc.writeln('  hr.wangPageBreak { display: none; }');
    doc.writeln('}');
    doc.writeln('@media screen {');
    doc.writeln(
      '  table.wangPageSelector { position: fixed; right: 10px; top: 10px;' +
        'font-family: Arial; font-size:10pt; border: solid 1px darkgray;' +
        'background: white; border-collapse:collapse; }'
    );
    doc.writeln('  table.wangPageSelector td { border: solid 1px gray; padding:4px; }');
    doc.writeln('  body.wangPage { background: gray; }');
    doc.writeln('}');

    if (css != null) {
      doc.writeln(css);
    }

    doc.writeln('</style>');
  }

  writePostfix(doc) {}

  createPageSelector(vpages, hpages) {
    let doc = this.wnd.document;
    let table = doc.createElement('table');
    table.className = 'wangPageSelector';
    table.setAttribute('border', '0');
    let tbody = doc.createElement('tbody');

    for (let i = 0; i < vpages; i++) {
      let row = doc.createElement('tr');

      for (let j = 0; j < hpages; j++) {
        let pageNum = i * hpages + j + 1;
        let cell = doc.createElement('td');
        let a = doc.createElement('a');
        a.setAttribute('href', '#wangPage-' + pageNum);

        if (wangClient.IS_NS && !wangClient.IS_SF && !wangClient.IS_GC) {
          let js =
            "let page = document.getElementById('wangPage-" +
            pageNum +
            "');page.scrollIntoView(true);event.preventDefault();";
          a.setAttribute('onclick', js);
        }

        wangUtils.write(a, pageNum, doc);
        cell.appendChild(a);
        row.appendChild(cell);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
  }

  renderPage(w, h, dx, dy, content, pageNumber) {
    let doc = this.wnd.document;
    let div = document.createElement('div');
    let arg = null;

    try {
      if (dx != 0 || dy != 0) {
        div.style.position = 'relative';
        div.style.width = w + 'px';
        div.style.height = h + 'px';
        div.style.pageBreakInside = 'avoid';
        let innerDiv = document.createElement('div');
        innerDiv.style.position = 'relative';
        innerDiv.style.top = this.border + 'px';
        innerDiv.style.left = this.border + 'px';
        innerDiv.style.width = w - 2 * this.border + 'px';
        innerDiv.style.height = h - 2 * this.border + 'px';
        innerDiv.style.overflow = 'hidden';
        let viewport = document.createElement('div');
        viewport.style.position = 'relative';
        viewport.style.marginLeft = dx + 'px';
        viewport.style.marginTop = dy + 'px';

        if (doc.documentMode == 8) {
          innerDiv.style.position = 'absolute';
          viewport.style.position = 'absolute';
        }

        if (doc.documentMode == 10) {
          viewport.style.width = '100%';
          viewport.style.height = '100%';
        }

        innerDiv.appendChild(viewport);
        div.appendChild(innerDiv);
        document.body.appendChild(div);
        arg = viewport;
      } else {
        div.style.width = w + 'px';
        div.style.height = h + 'px';
        div.style.overflow = 'hidden';
        div.style.pageBreakInside = 'avoid';

        if (doc.documentMode == 8) {
          div.style.position = 'relative';
        }

        let innerDiv = document.createElement('div');
        innerDiv.style.width = w - 2 * this.border + 'px';
        innerDiv.style.height = h - 2 * this.border + 'px';
        innerDiv.style.overflow = 'hidden';
        innerDiv.style.top = this.border + 'px';
        innerDiv.style.left = this.border + 'px';

        if (this.graph.dialect == wangConstants.DIALECT_VML) {
          innerDiv.style.position = 'absolute';
        }

        div.appendChild(innerDiv);
        document.body.appendChild(div);
        arg = innerDiv;
      }
    } catch (e) {
      div.parentNode.removeChild(div);
      div = null;
      throw e;
    }

    content(arg);
    return div;
  }

  getRoot() {
    let root = this.graph.view.currentRoot;

    if (root == null) {
      root = this.graph.getModel().getRoot();
    }

    return root;
  }

  addGraphFragment(dx, dy, scale, pageNumber, div, clip) {
    let view = this.graph.getView();
    let previousContainer = this.graph.container;
    this.graph.container = div;
    let canvas = view.getCanvas();
    let backgroundPane = view.getBackgroundPane();
    let drawPane = view.getDrawPane();
    let overlayPane = view.getOverlayPane();
    let realScale = scale;

    if (this.graph.dialect == wangConstants.DIALECT_SVG) {
      view.createSvg();

      if (!wangClient.NO_FO) {
        let g = view.getDrawPane().parentNode;
        let prev = g.getAttribute('transform');
        g.setAttribute('transformOrigin', '0 0');
        g.setAttribute('transform', 'scale(' + scale + ',' + scale + ')' + 'translate(' + dx + ',' + dy + ')');
        scale = 1;
        dx = 0;
        dy = 0;
      }
    } else if (this.graph.dialect == wangConstants.DIALECT_VML) {
      view.createVml();
    } else {
      view.createHtml();
    }

    let eventsEnabled = view.isEventsEnabled();
    view.setEventsEnabled(false);
    let graphEnabled = this.graph.isEnabled();
    this.graph.setEnabled(false);
    let translate = view.getTranslate();
    view.translate = new wangPoint(dx, dy);
    let redraw = this.graph.cellRenderer.redraw;
    let states = view.states;
    let s = view.scale;

    if (this.clipping) {
      let tempClip = new wangRectangle(
        (clip.x + translate.x) * s,
        (clip.y + translate.y) * s,
        (clip.width * s) / realScale,
        (clip.height * s) / realScale
      );

      this.graph.cellRenderer.redraw = function (state, force, rendering) {
        if (state != null) {
          let orig = states.get(state.cell);

          if (orig != null) {
            let bbox = view.getBoundingBox(orig, false);

            if (bbox != null && bbox.width > 0 && bbox.height > 0 && !wangUtils.intersects(tempClip, bbox)) {
              return;
            }
          }
        }

        redraw.apply(this, arguments);
      };
    }

    let temp = null;

    try {
      let cells = [this.getRoot()];
      temp = new wangTemporaryCellStates(view, scale, cells, null, (state) => {
        return this.getLinkForCellState(state);
      });
    } finally {
      let tmp = div.firstChild;

      while (tmp != null) {
        let next = tmp.nextSibling;
        let name = tmp.nodeName.toLowerCase();

        if (name == 'svg') {
          tmp.style.overflow = 'hidden';
          tmp.style.position = 'relative';
          tmp.style.top = this.marginTop + 'px';
          tmp.setAttribute('width', clip.width);
          tmp.setAttribute('height', clip.height);
          tmp.style.width = '';
          tmp.style.height = '';
        } else if (tmp.style.cursor != 'default' && name != 'div') {
          tmp.parentNode.removeChild(tmp);
        }

        tmp = next;
      }

      if (this.printBackgroundImage) {
        let svgs = div.getElementsByTagName('svg');

        if (svgs.length > 0) {
          svgs[0].style.position = 'absolute';
        }
      }

      view.overlayPane.parentNode.removeChild(view.overlayPane);
      this.graph.setEnabled(graphEnabled);
      this.graph.container = previousContainer;
      this.graph.cellRenderer.redraw = redraw;
      view.canvas = canvas;
      view.backgroundPane = backgroundPane;
      view.drawPane = drawPane;
      view.overlayPane = overlayPane;
      view.translate = translate;
      temp.destroy();
      view.setEventsEnabled(eventsEnabled);
    }
  }

  getLinkForCellState(state) {
    return this.graph.getLinkForCell(state.cell);
  }

  insertBackgroundImage(div, dx, dy) {
    let bg = this.graph.backgroundImage;

    if (bg != null) {
      let img = document.createElement('img');
      img.style.position = 'absolute';
      img.style.marginLeft = Math.round(dx * this.scale) + 'px';
      img.style.marginTop = Math.round(dy * this.scale) + 'px';
      img.setAttribute('width', Math.round(this.scale * bg.width));
      img.setAttribute('height', Math.round(this.scale * bg.height));
      img.src = bg.src;
      div.insertBefore(img, div.firstChild);
    }
  }

  getCoverPages() {
    return null;
  }

  getAppendices() {
    return null;
  }

  print(css) {
    let wnd = this.open(css);

    if (wnd != null) {
      wnd.print();
    }
  }

  close() {
    if (this.wnd != null) {
      this.wnd.close();
      this.wnd = null;
    }
  }
}
