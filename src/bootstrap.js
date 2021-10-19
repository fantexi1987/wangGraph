import { wangClient } from '@wangGraph/wangClient';
import { wangResources } from '@wangGraph/util/wangResources';
import { wangCellRenderer } from '@wangGraph/view/wangCellRenderer';
import { wangCodecRegistry } from '@wangGraph/io/wangCodecRegistry';
import { wangChildChangeCodec } from '@wangGraph/io/wangChildChangeCodec';
import { wangCellCodec } from '@wangGraph/io/wangCellCodec';
import { wangDefaultKeyHandlerCodec } from '@wangGraph/io/wangDefaultKeyHandlerCodec';
import { wangDefaultPopupMenuCodec } from '@wangGraph/io/wangDefaultPopupMenuCodec';
import { wangDefaultToolbarCodec } from '@wangGraph/io/wangDefaultToolbarCodec';
import { wangEditorCodec } from '@wangGraph/io/wangEditorCodec';
import { wangGenericChangeCodec } from '@wangGraph/io/wangGenericChangeCodec';
import { wangGraphCodec } from '@wangGraph/io/wangGraphCodec';
import { wangGraphViewCodec } from '@wangGraph/io/wangGraphViewCodec';
import { wangModelCodec } from '@wangGraph/io/wangModelCodec';
import { wangRootChangeCodec } from '@wangGraph/io/wangRootChangeCodec';
import { wangStylesheetCodec } from '@wangGraph/io/wangStylesheetCodec';
import { wangTerminalChangeCodec } from '@wangGraph/io/wangTerminalChangeCodec';
import { wangCylinder } from '@wangGraph/shape/wangCylinder';
import { wangRhombus } from '@wangGraph/shape/wangRhombus';
import { wangEllipse } from '@wangGraph/shape/wangEllipse';
import { wangSwimlane } from '@wangGraph/shape/wangSwimlane';
import { wangDoubleEllipse } from '@wangGraph/shape/wangDoubleEllipse';
import { wangArrowConnector } from '@wangGraph/shape/wangArrowConnector';
import { wangArrow } from '@wangGraph/shape/wangArrow';
import { wangLine } from '@wangGraph/shape/wangLine';
import { wangCloud } from '@wangGraph/shape/wangCloud';
import { wangHexagon } from '@wangGraph/shape/wangHexagon';
import { wangTriangle } from '@wangGraph/shape/wangTriangle';
import { wangActor } from '@wangGraph/shape/wangActor';
import { wangLabel } from '@wangGraph/shape/wangLabel';
import { wangCellAttributeChange } from '@wangGraph/model/changes/wangCellAttributeChange';
import { wangVisibleChange } from '@wangGraph/model/changes/wangVisibleChange';
import { wangCollapseChange } from '@wangGraph/model/changes/wangCollapseChange';
import { wangGeometryChange } from '@wangGraph/model/changes/wangGeometryChange';
import { wangStyleChange } from '@wangGraph/model/changes/wangStyleChange';
import { wangValueChange } from '@wangGraph/model/changes/wangValueChange';
import { wangMarker, diamond, createOpenArrow, createArrow, oval } from '@wangGraph/shape/wangMarker';
import { wangPerimeter } from '@wangGraph/view/wangPerimeter';
import { wangEdgeStyle } from '@wangGraph/view/wangEdgeStyle';
import { wangConstants } from '@wangGraph/util/wangConstants';
import { wangStyleRegistry } from '@wangGraph/view/wangStyleRegistry';
import { wangRectangleShape } from '@wangGraph/shape/wangRectangleShape';
import { wangConnector } from '@wangGraph/shape/wangConnector';
import { wangImageShape } from '@wangGraph/shape/wangImageShape';

export function bootstrap() {
  // wangClient
  if (typeof window.wangLoadResources == 'undefined') {
    window.wangLoadResources = true;
  }

  if (typeof window.wangForceIncludes == 'undefined') {
    window.wangForceIncludes = false;
  }

  if (typeof window.wangResourceExtension == 'undefined') {
    wangResources.extension = '.txt';
  }

  if (typeof window.wangLoadStylesheets == 'undefined') {
    window.wangLoadStylesheets = true;
  }

  if (typeof window.wangBasePath != 'undefined' && window.wangBasePath.length > 0) {
    if (window.wangBasePath.substring(window.wangBasePath.length - 1) == '/') {
      window.wangBasePath = window.wangBasePath.substring(0, window.wangBasePath.length - 1);
    }

    wangClient.basePath = window.wangBasePath;
  } else {
    wangClient.basePath = '.';
  }

  if (typeof window.wangImageBasePath != 'undefined' && window.wangImageBasePath.length > 0) {
    if (window.wangImageBasePath.substring(window.wangImageBasePath.length - 1) == '/') {
      window.wangImageBasePath = window.wangImageBasePath.substring(0, window.wangImageBasePath.length - 1);
    }

    wangClient.imageBasePath = window.wangImageBasePath;
  } else {
    wangClient.imageBasePath = wangClient.basePath + '/images';
  }

  if (typeof window.wangLanguage != 'undefined' && window.wangLanguage != null) {
    wangClient.language = window.wangLanguage;
  } else {
    wangClient.language = wangClient.IS_IE ? navigator.userLanguage : navigator.language;
  }

  if (typeof window.wangDefaultLanguage != 'undefined' && window.wangDefaultLanguage != null) {
    wangClient.defaultLanguage = window.wangDefaultLanguage;
  } else {
    wangClient.defaultLanguage = 'en';
  }

  if (window.wangLoadStylesheets) {
    wangClient.link('stylesheet', wangClient.basePath + '/css/common.css');
  }

  if (typeof wangLanguages != 'undefined' && window.wangLanguages != null) {
    wangClient.languages = window.wangLanguages;
  }

  if (wangClient.IS_VML) {
    if (wangClient.IS_SVG) {
      wangClient.IS_VML = false;
    } else {
      if (document.namespaces != null) {
        if (document.documentMode == 8) {
          document.namespaces.add(wangClient.VML_PREFIX, 'urn:schemas-microsoft-com:vml', '#default#VML');
          document.namespaces.add(wangClient.OFFICE_PREFIX, 'urn:schemas-microsoft-com:office:office', '#default#VML');
        } else {
          document.namespaces.add(wangClient.VML_PREFIX, 'urn:schemas-microsoft-com:vml');
          document.namespaces.add(wangClient.OFFICE_PREFIX, 'urn:schemas-microsoft-com:office:office');
        }
      }

      if (wangClient.IS_QUIRKS && document.styleSheets.length >= 30) {
        (function () {
          let node = document.createElement('style');
          node.type = 'text/css';
          node.styleSheet.cssText =
            wangClient.VML_PREFIX +
            '\\:*{behavior:url(#default#VML)}' +
            wangClient.OFFICE_PREFIX +
            '\\:*{behavior:url(#default#VML)}';
          document.getElementsByTagName('head')[0].appendChild(node);
        })();
      } else {
        document.createStyleSheet().cssText =
          wangClient.VML_PREFIX +
          '\\:*{behavior:url(#default#VML)}' +
          wangClient.OFFICE_PREFIX +
          '\\:*{behavior:url(#default#VML)}';
      }

      if (window.wangLoadStylesheets) {
        wangClient.link('stylesheet', wangClient.basePath + '/css/explorer.css');
      }
    }
  }

  // wangEditor
  if (window.wangLoadResources) {
    wangResources.add(wangClient.basePath + '/resources/editor');
  } else {
    wangClient.defaultBundles.push(wangClient.basePath + '/resources/editor');
  }

  // wangGraph
  if (window.wangLoadResources) {
    wangResources.add(wangClient.basePath + '/resources/graph');
  } else {
    wangClient.defaultBundles.push(wangClient.basePath + '/resources/graph');
  }

  // wangMarker
  wangMarker.addMarker('classic', createArrow(2));
  wangMarker.addMarker('classicThin', createArrow(3));
  wangMarker.addMarker('block', createArrow(2));
  wangMarker.addMarker('blockThin', createArrow(3));

  wangMarker.addMarker('open', createOpenArrow(2));
  wangMarker.addMarker('openThin', createOpenArrow(3));
  wangMarker.addMarker('oval', oval);

  wangMarker.addMarker('diamond', diamond);
  wangMarker.addMarker('diamondThin', diamond);

  // wangCellRenderer
  wangCellRenderer.registerShape(wangConstants.SHAPE_RECTANGLE, wangRectangleShape);
  wangCellRenderer.registerShape(wangConstants.SHAPE_ELLIPSE, wangEllipse);
  wangCellRenderer.registerShape(wangConstants.SHAPE_RHOMBUS, wangRhombus);
  wangCellRenderer.registerShape(wangConstants.SHAPE_CYLINDER, wangCylinder);
  wangCellRenderer.registerShape(wangConstants.SHAPE_CONNECTOR, wangConnector);
  wangCellRenderer.registerShape(wangConstants.SHAPE_ACTOR, wangActor);
  wangCellRenderer.registerShape(wangConstants.SHAPE_TRIANGLE, wangTriangle);
  wangCellRenderer.registerShape(wangConstants.SHAPE_HEXAGON, wangHexagon);
  wangCellRenderer.registerShape(wangConstants.SHAPE_CLOUD, wangCloud);
  wangCellRenderer.registerShape(wangConstants.SHAPE_LINE, wangLine);
  wangCellRenderer.registerShape(wangConstants.SHAPE_ARROW, wangArrow);
  wangCellRenderer.registerShape(wangConstants.SHAPE_ARROW_CONNECTOR, wangArrowConnector);
  wangCellRenderer.registerShape(wangConstants.SHAPE_DOUBLE_ELLIPSE, wangDoubleEllipse);
  wangCellRenderer.registerShape(wangConstants.SHAPE_SWIMLANE, wangSwimlane);
  wangCellRenderer.registerShape(wangConstants.SHAPE_IMAGE, wangImageShape);
  wangCellRenderer.registerShape(wangConstants.SHAPE_LABEL, wangLabel);

  // codec registry
  wangCodecRegistry.register(new wangChildChangeCodec());
  wangCodecRegistry.register(new wangCellCodec());
  wangCodecRegistry.register(new wangDefaultKeyHandlerCodec());
  wangCodecRegistry.register(new wangDefaultPopupMenuCodec());
  wangCodecRegistry.register(new wangDefaultToolbarCodec());
  wangCodecRegistry.register(new wangEditorCodec());

  wangCodecRegistry.register(new wangGenericChangeCodec(new wangValueChange(), 'value'));
  wangCodecRegistry.register(new wangGenericChangeCodec(new wangStyleChange(), 'style'));
  wangCodecRegistry.register(new wangGenericChangeCodec(new wangGeometryChange(), 'geometry'));
  wangCodecRegistry.register(new wangGenericChangeCodec(new wangCollapseChange(), 'collapsed'));
  wangCodecRegistry.register(new wangGenericChangeCodec(new wangVisibleChange(), 'visible'));
  wangCodecRegistry.register(new wangGenericChangeCodec(new wangCellAttributeChange(), 'value'));

  wangCodecRegistry.register(new wangGraphCodec());
  wangCodecRegistry.register(new wangGraphViewCodec());
  wangCodecRegistry.register(new wangModelCodec());
  wangCodecRegistry.register(new wangRootChangeCodec());
  wangCodecRegistry.register(new wangStylesheetCodec());
  wangCodecRegistry.register(new wangTerminalChangeCodec());

  // wangStyleRegistry
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_ELBOW, wangEdgeStyle.ElbowConnector);
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_ENTITY_RELATION, wangEdgeStyle.EntityRelation);
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_LOOP, wangEdgeStyle.Loop);
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_SIDETOSIDE, wangEdgeStyle.SideToSide);
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_TOPTOBOTTOM, wangEdgeStyle.TopToBottom);
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_ORTHOGONAL, wangEdgeStyle.OrthConnector);
  wangStyleRegistry.putValue(wangConstants.EDGESTYLE_SEGMENT, wangEdgeStyle.SegmentConnector);
  wangStyleRegistry.putValue(wangConstants.PERIMETER_ELLIPSE, wangPerimeter.EllipsePerimeter);
  wangStyleRegistry.putValue(wangConstants.PERIMETER_RECTANGLE, wangPerimeter.RectanglePerimeter);
  wangStyleRegistry.putValue(wangConstants.PERIMETER_RHOMBUS, wangPerimeter.RhombusPerimeter);
  wangStyleRegistry.putValue(wangConstants.PERIMETER_TRIANGLE, wangPerimeter.TrianglePerimeter);
  wangStyleRegistry.putValue(wangConstants.PERIMETER_HEXAGON, wangPerimeter.HexagonPerimeter);
}
