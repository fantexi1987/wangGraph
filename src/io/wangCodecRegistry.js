import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangUtils } from '@wangGraph/util/wangUtils';

export class wangCodecRegistry {
  static codecs = [];
  static aliases = [];

  static register(codec) {
    if (codec != null) {
      let name = codec.getName();
      wangCodecRegistry.codecs[name] = codec;
      let classname = wangUtils.getFunctionName(codec.template.constructor);

      if (classname != name) {
        wangCodecRegistry.addAlias(classname, name);
      }
    }

    return codec;
  }

  static addAlias(classname, codecname) {
    wangCodecRegistry.aliases[classname] = codecname;
  }

  static getCodec(ctor) {
    let codec = null;

    if (ctor != null) {
      let name = wangUtils.getFunctionName(ctor);
      let tmp = wangCodecRegistry.aliases[name];

      if (tmp != null) {
        name = tmp;
      }

      codec = wangCodecRegistry.codecs[name];

      if (codec == null) {
        try {
          codec = new wangObjectCodec(new ctor());
          wangCodecRegistry.register(codec);
        } catch (e) {
          /* ignore */
        }
      }
    }

    return codec;
  }
}
