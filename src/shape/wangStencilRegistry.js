export class wangStencilRegistry {
  static stencils = {};

  static addStencil(name, stencil) {
    wangStencilRegistry.stencils[name] = stencil;
  }

  static getStencil(name) {
    return wangStencilRegistry.stencils[name];
  }
}
