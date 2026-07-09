import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        'shadow-intensity'?: string | number;
        exposure?: string | number;
        'environment-image'?: string;
        'interaction-prompt'?: string;
        crossOrigin?: string;
      };
    }
  }
}