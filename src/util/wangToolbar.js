import { wangEventSource } from '@wangGraph/util/wangEventSource';
import { wangEventObject } from '@wangGraph/util/wangEventObject';
import { wangPoint } from '@wangGraph/util/wangPoint';
import { wangPopupMenu } from '@wangGraph/util/wangPopupMenu';
import { wangClient } from '@wangGraph/wangClient';
import { wangEvent } from '@wangGraph/util/wangEvent';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangToolbar extends wangEventSource {
  enabled = true;
  noReset = false;
  updateDefaultMode = true;

  constructor(container) {
    super();
    this.container = container;
  }

  addItem(title, icon, funct, pressedIcon, style, factoryMethod) {
    let img = document.createElement(icon != null ? 'img' : 'button');
    let initialClassName = style || (factoryMethod != null ? 'wangToolbarMode' : 'wangToolbarItem');
    img.className = initialClassName;
    img.setAttribute('src', icon);

    if (title != null) {
      if (icon != null) {
        img.setAttribute('title', title);
      } else {
        wangUtils.write(img, title);
      }
    }

    this.container.appendChild(img);

    if (funct != null) {
      wangEvent.addListener(img, 'click', funct);

      if (wangClient.IS_TOUCH) {
        wangEvent.addListener(img, 'touchend', funct);
      }
    }

    let mouseHandler = (evt) => {
      if (pressedIcon != null) {
        img.setAttribute('src', icon);
      } else {
        img.style.backgroundColor = '';
      }
    };

    wangEvent.addGestureListeners(
      img,
      (evt) => {
        if (pressedIcon != null) {
          img.setAttribute('src', pressedIcon);
        } else {
          img.style.backgroundColor = 'gray';
        }

        if (factoryMethod != null) {
          if (this.menu == null) {
            this.menu = new wangPopupMenu();
            this.menu.init();
          }

          let last = this.currentImg;

          if (this.menu.isMenuShowing()) {
            this.menu.hideMenu();
          }

          if (last != img) {
            this.currentImg = img;
            this.menu.factoryMethod = factoryMethod;
            let point = new wangPoint(img.offsetLeft, img.offsetTop + img.offsetHeight);
            this.menu.popup(point.x, point.y, null, evt);

            if (this.menu.isMenuShowing()) {
              img.className = initialClassName + 'Selected';

              this.menu.hideMenu = function () {
                wangPopupMenu.prototype.hideMenu.apply(this);
                img.className = initialClassName;
                this.currentImg = null;
              };
            }
          }
        }
      },
      null,
      mouseHandler
    );
    wangEvent.addListener(img, 'mouseout', mouseHandler);
    return img;
  }

  addCombo(style) {
    let div = document.createElement('div');
    div.style.display = 'inline';
    div.className = 'wangToolbarComboContainer';
    let select = document.createElement('select');
    select.className = style || 'wangToolbarCombo';
    div.appendChild(select);
    this.container.appendChild(div);
    return select;
  }

  addActionCombo(title, style) {
    let select = document.createElement('select');
    select.className = style || 'wangToolbarCombo';
    this.addOption(select, title, null);
    wangEvent.addListener(select, 'change', function (evt) {
      let value = select.options[select.selectedIndex];
      select.selectedIndex = 0;

      if (value.funct != null) {
        value.funct(evt);
      }
    });
    this.container.appendChild(select);
    return select;
  }

  addOption(combo, title, value) {
    let option = document.createElement('option');
    wangUtils.writeln(option, title);

    if (typeof value == 'function') {
      option.funct = value;
    } else {
      option.setAttribute('value', value);
    }

    combo.appendChild(option);
    return option;
  }

  addSwitchMode(title, icon, funct, pressedIcon, style) {
    let img = document.createElement('img');
    img.initialClassName = style || 'wangToolbarMode';
    img.className = img.initialClassName;
    img.setAttribute('src', icon);
    img.altIcon = pressedIcon;

    if (title != null) {
      img.setAttribute('title', title);
    }

    wangEvent.addListener(img, 'click', (evt) => {
      let tmp = this.selectedMode.altIcon;

      if (tmp != null) {
        this.selectedMode.altIcon = this.selectedMode.getAttribute('src');
        this.selectedMode.setAttribute('src', tmp);
      } else {
        this.selectedMode.className = this.selectedMode.initialClassName;
      }

      if (this.updateDefaultMode) {
        this.defaultMode = img;
      }

      this.selectedMode = img;
      tmp = img.altIcon;

      if (tmp != null) {
        img.altIcon = img.getAttribute('src');
        img.setAttribute('src', tmp);
      } else {
        img.className = img.initialClassName + 'Selected';
      }

      this.fireEvent(new wangEventObject(wangEvent.SELECT));
      funct();
    });
    this.container.appendChild(img);

    if (this.defaultMode == null) {
      this.defaultMode = img;
      this.selectMode(img);
      funct();
    }

    return img;
  }

  addMode(title, icon, funct, pressedIcon, style, toggle) {
    toggle = toggle != null ? toggle : true;
    let img = document.createElement(icon != null ? 'img' : 'button');
    img.initialClassName = style || 'wangToolbarMode';
    img.className = img.initialClassName;
    img.setAttribute('src', icon);
    img.altIcon = pressedIcon;

    if (title != null) {
      img.setAttribute('title', title);
    }

    if (this.enabled && toggle) {
      wangEvent.addListener(img, 'click', (evt) => {
        this.selectMode(img, funct);
        this.noReset = false;
      });
      wangEvent.addListener(img, 'dblclick', (evt) => {
        this.selectMode(img, funct);
        this.noReset = true;
      });

      if (this.defaultMode == null) {
        this.defaultMode = img;
        this.defaultFunction = funct;
        this.selectMode(img, funct);
      }
    }

    this.container.appendChild(img);
    return img;
  }

  selectMode(domNode, funct) {
    if (this.selectedMode != domNode) {
      if (this.selectedMode != null) {
        let tmp = this.selectedMode.altIcon;

        if (tmp != null) {
          this.selectedMode.altIcon = this.selectedMode.getAttribute('src');
          this.selectedMode.setAttribute('src', tmp);
        } else {
          this.selectedMode.className = this.selectedMode.initialClassName;
        }
      }

      this.selectedMode = domNode;
      let tmp = this.selectedMode.altIcon;

      if (tmp != null) {
        this.selectedMode.altIcon = this.selectedMode.getAttribute('src');
        this.selectedMode.setAttribute('src', tmp);
      } else {
        this.selectedMode.className = this.selectedMode.initialClassName + 'Selected';
      }

      this.fireEvent(new wangEventObject(wangEvent.SELECT, 'function', funct));
    }
  }

  resetMode(forced) {
    if ((forced || !this.noReset) && this.selectedMode != this.defaultMode) {
      this.selectMode(this.defaultMode, this.defaultFunction);
    }
  }

  addSeparator(icon) {
    return this.addItem(null, icon, null);
  }

  addBreak() {
    wangUtils.br(this.container);
  }

  addLine() {
    let hr = document.createElement('hr');
    hr.style.marginRight = '6px';
    hr.setAttribute('size', '1');
    this.container.appendChild(hr);
  }

  destroy() {
    wangEvent.release(this.container);
    this.container = null;
    this.defaultMode = null;
    this.defaultFunction = null;
    this.selectedMode = null;

    if (this.menu != null) {
      this.menu.destroy();
    }
  }
}
