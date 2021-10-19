import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangUtils } from '@wangGraph/util/wangUtils';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangRectangle } from '@wangGraph/util/wangRectangle';
import { wangClient } from '@wangGraph/wangClient';

export class wangWindow extends wangEventSource {
  closeImage = wangClient.imageBasePath + '/close.gif';
  minimizeImage = wangClient.imageBasePath + '/minimize.gif';
  normalizeImage = wangClient.imageBasePath + '/normalize.gif';
  maximizeImage = wangClient.imageBasePath + '/maximize.gif';
  resizeImage = wangClient.imageBasePath + '/resize.gif';
  visible = false;
  minimumSize = new wangRectangle(0, 0, 50, 40);
  destroyOnClose = true;
  contentHeightCorrection = document.documentMode == 8 || document.documentMode == 7 ? 6 : 2;
  title = null;
  content = null;

  constructor(title, content, x, y, width, height, minimizable, movable, replaceNode, style) {
    super();

    if (content != null) {
      minimizable = minimizable != null ? minimizable : true;
      this.content = content;
      this.init(x, y, width, height, style);
      this.installMaximizeHandler();
      this.installMinimizeHandler();
      this.installCloseHandler();
      this.setMinimizable(minimizable);
      this.setTitle(title);

      if (movable == null || movable) {
        this.installMoveHandler();
      }

      if (replaceNode != null && replaceNode.parentNode != null) {
        replaceNode.parentNode.replaceChild(this.div, replaceNode);
      } else {
        document.body.appendChild(this.div);
      }
    }
  }

  init(x, y, width, height, style) {
    style = style != null ? style : 'wangWindow';
    this.div = document.createElement('div');
    this.div.className = style;
    this.div.style.left = x + 'px';
    this.div.style.top = y + 'px';
    this.table = document.createElement('table');
    this.table.className = style;

    if (wangClient.IS_POINTER) {
      this.div.style.touchAction = 'none';
    }

    if (width != null) {
      if (!wangClient.IS_QUIRKS) {
        this.div.style.width = width + 'px';
      }

      this.table.style.width = width + 'px';
    }

    if (height != null) {
      if (!wangClient.IS_QUIRKS) {
        this.div.style.height = height + 'px';
      }

      this.table.style.height = height + 'px';
    }

    let tbody = document.createElement('tbody');
    let tr = document.createElement('tr');
    this.title = document.createElement('td');
    this.title.className = style + 'Title';
    this.buttons = document.createElement('div');
    this.buttons.style.position = 'absolute';
    this.buttons.style.display = 'inline-block';
    this.buttons.style.right = '4px';
    this.buttons.style.top = '5px';
    this.title.appendChild(this.buttons);
    tr.appendChild(this.title);
    tbody.appendChild(tr);
    tr = document.createElement('tr');
    this.td = document.createElement('td');
    this.td.className = style + 'Pane';

    if (document.documentMode == 7) {
      this.td.style.height = '100%';
    }

    this.contentWrapper = document.createElement('div');
    this.contentWrapper.className = style + 'Pane';
    this.contentWrapper.style.width = '100%';
    this.contentWrapper.appendChild(this.content);

    if (wangClient.IS_QUIRKS || this.content.nodeName.toUpperCase() != 'DIV') {
      this.contentWrapper.style.height = '100%';
    }

    this.td.appendChild(this.contentWrapper);
    tr.appendChild(this.td);
    tbody.appendChild(tr);
    this.table.appendChild(tbody);
    this.div.appendChild(this.table);

    let activator = (evt) => {
      this.activate();
    };

    wangEvent.addGestureListeners(this.title, activator);
    wangEvent.addGestureListeners(this.table, activator);
    this.hide();
  }

  setTitle(title) {
    let child = this.title.firstChild;

    while (child != null) {
      let next = child.nextSibling;

      if (child.nodeType == wangConstants.NODETYPE_TEXT) {
        child.parentNode.removeChild(child);
      }

      child = next;
    }

    wangUtils.write(this.title, title || '');
    this.title.appendChild(this.buttons);
  }

  setScrollable(scrollable) {
    if (navigator.userAgent == null || navigator.userAgent.indexOf('Presto/2.5') < 0) {
      if (scrollable) {
        this.contentWrapper.style.overflow = 'auto';
      } else {
        this.contentWrapper.style.overflow = 'hidden';
      }
    }
  }

  activate() {
    if (wangWindow.activeWindow != this) {
      let style = wangUtils.getCurrentStyle(this.getElement());
      let index = style != null ? style.zIndex : 3;

      if (wangWindow.activeWindow) {
        let elt = wangWindow.activeWindow.getElement();

        if (elt != null && elt.style != null) {
          elt.style.zIndex = index;
        }
      }

      let previousWindow = wangWindow.activeWindow;
      this.getElement().style.zIndex = parseInt(index) + 1;
      this.fireEvent(new wangEventObject(wangEvent.ACTIVATE, 'previousWindow', previousWindow));
    }
  }

  getElement() {
    return this.div;
  }

  fit() {
    wangUtils.fit(this.div);
  }

  isResizable() {
    if (this.resize != null) {
      return this.resize.style.display != 'none';
    }

    return false;
  }

  setResizable(resizable) {
    if (resizable) {
      if (this.resize == null) {
        this.resize = document.createElement('img');
        this.resize.style.position = 'absolute';
        this.resize.style.bottom = '2px';
        this.resize.style.right = '2px';
        this.resize.setAttribute('src', this.resizeImage);
        this.resize.style.cursor = 'nw-resize';
        let startX = null;
        let startY = null;
        let width = null;
        let height = null;

        let start = (evt) => {
          this.activate();
          startX = wangEvent.getClientX(evt);
          startY = wangEvent.getClientY(evt);
          width = this.div.offsetWidth;
          height = this.div.offsetHeight;
          wangEvent.addGestureListeners(document, null, dragHandler, dropHandler);
          this.fireEvent(new wangEventObject(wangEvent.RESIZE_START, 'event', evt));
          wangEvent.consume(evt);
        };

        let dragHandler = (evt) => {
          if (startX != null && startY != null) {
            let dx = wangEvent.getClientX(evt) - startX;
            let dy = wangEvent.getClientY(evt) - startY;
            this.setSize(width + dx, height + dy);
            this.fireEvent(new wangEventObject(wangEvent.RESIZE, 'event', evt));
            wangEvent.consume(evt);
          }
        };

        let dropHandler = (evt) => {
          if (startX != null && startY != null) {
            startX = null;
            startY = null;
            wangEvent.removeGestureListeners(document, null, dragHandler, dropHandler);
            this.fireEvent(new wangEventObject(wangEvent.RESIZE_END, 'event', evt));
            wangEvent.consume(evt);
          }
        };

        wangEvent.addGestureListeners(this.resize, start, dragHandler, dropHandler);
        this.div.appendChild(this.resize);
      } else {
        this.resize.style.display = 'inline';
      }
    } else if (this.resize != null) {
      this.resize.style.display = 'none';
    }
  }

  setSize(width, height) {
    width = Math.max(this.minimumSize.width, width);
    height = Math.max(this.minimumSize.height, height);

    if (!wangClient.IS_QUIRKS) {
      this.div.style.width = width + 'px';
      this.div.style.height = height + 'px';
    }

    this.table.style.width = width + 'px';
    this.table.style.height = height + 'px';

    if (!wangClient.IS_QUIRKS) {
      this.contentWrapper.style.height =
        this.div.offsetHeight - this.title.offsetHeight - this.contentHeightCorrection + 'px';
    }
  }

  setMinimizable(minimizable) {
    this.minimize.style.display = minimizable ? '' : 'none';
  }

  getMinimumSize() {
    return new wangRectangle(0, 0, 0, this.title.offsetHeight);
  }

  installMinimizeHandler() {
    this.minimize = document.createElement('img');
    this.minimize.setAttribute('src', this.minimizeImage);
    this.minimize.setAttribute('title', 'Minimize');
    this.minimize.style.cursor = 'pointer';
    this.minimize.style.marginLeft = '2px';
    this.minimize.style.display = 'none';
    this.buttons.appendChild(this.minimize);
    let minimized = false;
    let maxDisplay = null;
    let height = null;

    let funct = (evt) => {
      this.activate();

      if (!minimized) {
        minimized = true;
        this.minimize.setAttribute('src', this.normalizeImage);
        this.minimize.setAttribute('title', 'Normalize');
        this.contentWrapper.style.display = 'none';
        maxDisplay = this.maximize.style.display;
        this.maximize.style.display = 'none';
        height = this.table.style.height;
        let minSize = this.getMinimumSize();

        if (minSize.height > 0) {
          if (!wangClient.IS_QUIRKS) {
            this.div.style.height = minSize.height + 'px';
          }

          this.table.style.height = minSize.height + 'px';
        }

        if (minSize.width > 0) {
          if (!wangClient.IS_QUIRKS) {
            this.div.style.width = minSize.width + 'px';
          }

          this.table.style.width = minSize.width + 'px';
        }

        if (this.resize != null) {
          this.resize.style.visibility = 'hidden';
        }

        this.fireEvent(new wangEventObject(wangEvent.MINIMIZE, 'event', evt));
      } else {
        minimized = false;
        this.minimize.setAttribute('src', this.minimizeImage);
        this.minimize.setAttribute('title', 'Minimize');
        this.contentWrapper.style.display = '';
        this.maximize.style.display = maxDisplay;

        if (!wangClient.IS_QUIRKS) {
          this.div.style.height = height;
        }

        this.table.style.height = height;

        if (this.resize != null) {
          this.resize.style.visibility = '';
        }

        this.fireEvent(new wangEventObject(wangEvent.NORMALIZE, 'event', evt));
      }

      wangEvent.consume(evt);
    };

    wangEvent.addGestureListeners(this.minimize, funct);
  }

  setMaximizable(maximizable) {
    this.maximize.style.display = maximizable ? '' : 'none';
  }

  installMaximizeHandler() {
    this.maximize = document.createElement('img');
    this.maximize.setAttribute('src', this.maximizeImage);
    this.maximize.setAttribute('title', 'Maximize');
    this.maximize.style.cursor = 'default';
    this.maximize.style.marginLeft = '2px';
    this.maximize.style.cursor = 'pointer';
    this.maximize.style.display = 'none';
    this.buttons.appendChild(this.maximize);
    let maximized = false;
    let x = null;
    let y = null;
    let height = null;
    let width = null;
    let minDisplay = null;

    let funct = (evt) => {
      this.activate();

      if (this.maximize.style.display != 'none') {
        if (!maximized) {
          maximized = true;
          this.maximize.setAttribute('src', this.normalizeImage);
          this.maximize.setAttribute('title', 'Normalize');
          this.contentWrapper.style.display = '';
          minDisplay = this.minimize.style.display;
          this.minimize.style.display = 'none';
          x = parseInt(this.div.style.left);
          y = parseInt(this.div.style.top);
          height = this.table.style.height;
          width = this.table.style.width;
          this.div.style.left = '0px';
          this.div.style.top = '0px';
          let docHeight = Math.max(document.body.clientHeight || 0, document.documentElement.clientHeight || 0);

          if (!wangClient.IS_QUIRKS) {
            this.div.style.width = document.body.clientWidth - 2 + 'px';
            this.div.style.height = docHeight - 2 + 'px';
          }

          this.table.style.width = document.body.clientWidth - 2 + 'px';
          this.table.style.height = docHeight - 2 + 'px';

          if (this.resize != null) {
            this.resize.style.visibility = 'hidden';
          }

          if (!wangClient.IS_QUIRKS) {
            let style = wangUtils.getCurrentStyle(this.contentWrapper);

            if (style.overflow == 'auto' || this.resize != null) {
              this.contentWrapper.style.height =
                this.div.offsetHeight - this.title.offsetHeight - this.contentHeightCorrection + 'px';
            }
          }

          this.fireEvent(new wangEventObject(wangEvent.MAXIMIZE, 'event', evt));
        } else {
          maximized = false;
          this.maximize.setAttribute('src', this.maximizeImage);
          this.maximize.setAttribute('title', 'Maximize');
          this.contentWrapper.style.display = '';
          this.minimize.style.display = minDisplay;
          this.div.style.left = x + 'px';
          this.div.style.top = y + 'px';

          if (!wangClient.IS_QUIRKS) {
            this.div.style.height = height;
            this.div.style.width = width;
            let style = wangUtils.getCurrentStyle(this.contentWrapper);

            if (style.overflow == 'auto' || this.resize != null) {
              this.contentWrapper.style.height =
                this.div.offsetHeight - this.title.offsetHeight - this.contentHeightCorrection + 'px';
            }
          }

          this.table.style.height = height;
          this.table.style.width = width;

          if (this.resize != null) {
            this.resize.style.visibility = '';
          }

          this.fireEvent(new wangEventObject(wangEvent.NORMALIZE, 'event', evt));
        }

        wangEvent.consume(evt);
      }
    };

    wangEvent.addGestureListeners(this.maximize, funct);
    wangEvent.addListener(this.title, 'dblclick', funct);
  }

  installMoveHandler() {
    this.title.style.cursor = 'move';
    wangEvent.addGestureListeners(this.title, (evt) => {
      let startX = wangEvent.getClientX(evt);
      let startY = wangEvent.getClientY(evt);
      let x = this.getX();
      let y = this.getY();

      let dragHandler = (evt) => {
        let dx = wangEvent.getClientX(evt) - startX;
        let dy = wangEvent.getClientY(evt) - startY;
        this.setLocation(x + dx, y + dy);
        this.fireEvent(new wangEventObject(wangEvent.MOVE, 'event', evt));
        wangEvent.consume(evt);
      };

      let dropHandler = (evt) => {
        wangEvent.removeGestureListeners(document, null, dragHandler, dropHandler);
        this.fireEvent(new wangEventObject(wangEvent.MOVE_END, 'event', evt));
        wangEvent.consume(evt);
      };

      wangEvent.addGestureListeners(document, null, dragHandler, dropHandler);
      this.fireEvent(new wangEventObject(wangEvent.MOVE_START, 'event', evt));
      wangEvent.consume(evt);
    });

    if (wangClient.IS_POINTER) {
      this.title.style.touchAction = 'none';
    }
  }

  setLocation(x, y) {
    this.div.style.left = x + 'px';
    this.div.style.top = y + 'px';
  }

  getX() {
    return parseInt(this.div.style.left);
  }

  getY() {
    return parseInt(this.div.style.top);
  }

  installCloseHandler() {
    this.closeImg = document.createElement('img');
    this.closeImg.setAttribute('src', this.closeImage);
    this.closeImg.setAttribute('title', 'Close');
    this.closeImg.style.marginLeft = '2px';
    this.closeImg.style.cursor = 'pointer';
    this.closeImg.style.display = 'none';
    this.buttons.appendChild(this.closeImg);
    wangEvent.addGestureListeners(this.closeImg, (evt) => {
      this.fireEvent(new wangEventObject(wangEvent.CLOSE, 'event', evt));

      if (this.destroyOnClose) {
        this.destroy();
      } else {
        this.setVisible(false);
      }

      wangEvent.consume(evt);
    });
  }

  setImage(image) {
    this.image = document.createElement('img');
    this.image.setAttribute('src', image);
    this.image.setAttribute('align', 'left');
    this.image.style.marginRight = '4px';
    this.image.style.marginLeft = '0px';
    this.image.style.marginTop = '-2px';
    this.title.insertBefore(this.image, this.title.firstChild);
  }

  setClosable(closable) {
    this.closeImg.style.display = closable ? '' : 'none';
  }

  isVisible() {
    if (this.div != null) {
      return this.div.style.display != 'none';
    }

    return false;
  }

  setVisible(visible) {
    if (this.div != null && this.isVisible() != visible) {
      if (visible) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  show() {
    this.div.style.display = '';
    this.activate();
    let style = wangUtils.getCurrentStyle(this.contentWrapper);

    if (
      !wangClient.IS_QUIRKS &&
      (style.overflow == 'auto' || this.resize != null) &&
      this.contentWrapper.style.display != 'none'
    ) {
      this.contentWrapper.style.height =
        this.div.offsetHeight - this.title.offsetHeight - this.contentHeightCorrection + 'px';
    }

    this.fireEvent(new wangEventObject(wangEvent.SHOW));
  }

  hide() {
    this.div.style.display = 'none';
    this.fireEvent(new wangEventObject(wangEvent.HIDE));
  }

  destroy() {
    this.fireEvent(new wangEventObject(wangEvent.DESTROY));

    if (this.div != null) {
      wangEvent.release(this.div);
      this.div.parentNode.removeChild(this.div);
      this.div = null;
    }

    this.title = null;
    this.content = null;
    this.contentWrapper = null;
  }
}
