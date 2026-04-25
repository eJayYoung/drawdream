declare module 'pannellum-react' {
  import { ComponentType } from 'react';

  interface PannellumProps {
    image: string;
    width?: string;
    height?: string;
    autoLoad?: boolean;
    showControls?: boolean;
    showFullscreenCtrl?: boolean;
    showZoomCtrl?: boolean;
    mouseZoom?: boolean;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    yaw?: number;
    pitch?: number;
    config?: Record<string, unknown>;
    onLoad?: () => void;
    onRender?: () => void;
    onFullscreenChange?: (fullscreen: boolean) => void;
  }

  const Pannellum: ComponentType<PannellumProps>;
  export default Pannellum;
}
