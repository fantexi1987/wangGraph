import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangXmlRequest } from '@wangGraph/util/wangXmlRequest';
import { wangClient } from '@wangGraph/wangClient';

export class wangResources {
  static resources = {};
  static extension = '.txt';
  static resourcesEncoded = false;
  static loadDefaultBundle = true;
  static loadSpecialBundle = true;

  static isLanguageSupported(lan) {
    if (wangClient.languages != null) {
      return wangClient.languages.indexOf(lan) >= 0;
    }

    return true;
  }

  static getDefaultBundle(basename, lan) {
    if (wangResources.loadDefaultBundle || !wangResources.isLanguageSupported(lan)) {
      return basename + wangResources.extension;
    } else {
      return null;
    }
  }

  static getSpecialBundle(basename, lan) {
    if (wangClient.languages == null || !this.isLanguageSupported(lan)) {
      let dash = lan.indexOf('-');

      if (dash > 0) {
        lan = lan.substring(0, dash);
      }
    }

    if (
      wangResources.loadSpecialBundle &&
      wangResources.isLanguageSupported(lan) &&
      lan != wangClient.defaultLanguage
    ) {
      return basename + '_' + lan + wangResources.extension;
    } else {
      return null;
    }
  }

  static add(basename, lan, callback) {
    lan = lan != null ? lan : wangClient.language != null ? wangClient.language.toLowerCase() : wangConstants.NONE;

    if (lan != wangConstants.NONE) {
      let defaultBundle = wangResources.getDefaultBundle(basename, lan);
      let specialBundle = wangResources.getSpecialBundle(basename, lan);

      let loadSpecialBundle = function () {
        if (specialBundle != null) {
          if (callback) {
            wangXmlRequest.get(
              specialBundle,
              function (req) {
                wangResources.parse(req.getText());
                callback();
              },
              function () {
                callback();
              }
            );
          } else {
            try {
              let req = wangXmlRequest.load(specialBundle);

              if (req.isReady()) {
                wangResources.parse(req.getText());
              }
            } catch (e) {
              /* ignore */
            }
          }
        } else if (callback != null) {
          callback();
        }
      };

      if (defaultBundle != null) {
        if (callback) {
          wangXmlRequest.get(
            defaultBundle,
            function (req) {
              wangResources.parse(req.getText());
              loadSpecialBundle();
            },
            function () {
              loadSpecialBundle();
            }
          );
        } else {
          try {
            let req = wangXmlRequest.load(defaultBundle);

            if (req.isReady()) {
              wangResources.parse(req.getText());
            }

            loadSpecialBundle();
          } catch (e) {
            /* ignore */
          }
        }
      } else {
        loadSpecialBundle();
      }
    }
  }

  static parse(text) {
    if (text != null) {
      let lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].charAt(0) != '#') {
          let index = lines[i].indexOf('=');

          if (index > 0) {
            let key = lines[i].substring(0, index);
            let idx = lines[i].length;

            if (lines[i].charCodeAt(idx - 1) == 13) {
              idx--;
            }

            let value = lines[i].substring(index + 1, idx);

            if (this.resourcesEncoded) {
              value = value.replace(/\\(?=u[a-fA-F\d]{4})/g, '%');
              wangResources.resources[key] = unescape(value);
            } else {
              wangResources.resources[key] = value;
            }
          }
        }
      }
    }
  }

  static get(key, params, defaultValue) {
    let value = wangResources.resources[key];

    if (value == null) {
      value = defaultValue;
    }

    if (value != null && params != null) {
      value = wangResources.replacePlaceholders(value, params);
    }

    return value;
  }

  static replacePlaceholders(value, params) {
    let result = [];
    let index = null;

    for (let i = 0; i < value.length; i++) {
      let c = value.charAt(i);

      if (c == '{') {
        index = '';
      } else if (index != null && c == '}') {
        index = parseInt(index) - 1;

        if (index >= 0 && index < params.length) {
          result.push(params[index]);
        }

        index = null;
      } else if (index != null) {
        index += c;
      } else {
        result.push(c);
      }
    }

    return result.join('');
  }

  static loadResources(callback) {
    wangResources.add(wangClient.basePath + '/resources/editor', null, function () {
      wangResources.add(wangClient.basePath + '/resources/graph', null, callback);
    });
  }
}
