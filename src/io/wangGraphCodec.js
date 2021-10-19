import { wangObjectCodec } from '@wangGraph/io/wangObjectCodec';
import { wangGraph } from '@wangGraph/view/wangGraph';

export class wangGraphCodec extends wangObjectCodec {
  constructor() {
    super(new wangGraph(), [
      'graphListeners',
      'eventListeners',
      'view',
      'container',
      'cellRenderer',
      'editor',
      'selection'
    ]);
  }
}
