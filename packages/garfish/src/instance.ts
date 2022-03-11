import Garfish from '@garfish/core';
import { GarfishRouter } from '@garfish/router';
import { GarfishBrowserVm } from '@garfish/browser-vm';
import { GarfishBrowserSnapshot } from '@garfish/browser-snapshot';
import { def, warn, hasOwn, inBrowser, __GARFISH_FLAG__ } from '@garfish/utils';

declare global {
  interface Window {
    Garfish: Garfish;
    __GARFISH__: boolean;
    __GAR__: boolean;
    __PROWER_BY_GAR__: boolean;
  }
}

// Initialize the Garfish, currently existing environment to allow only one instance (export to is for test)
function createContext(): Garfish {
  let fresh = false;
  // Existing garfish instance, direct return
  if (inBrowser() && window['__GARFISH__'] && window['Garfish']) {
    return window['Garfish'];
  }

  const GarfishInstance = new Garfish({
    plugins: [GarfishRouter(), GarfishBrowserVm(), GarfishBrowserSnapshot()],
  });

  type globalValue = boolean | Garfish | Record<string, unknown>;
  const set = (namespace: string, val: globalValue = GarfishInstance) => {
    if (hasOwn(window, namespace)) {
      if (!(window[namespace] && window[namespace].flag === __GARFISH_FLAG__)) {
        const next = () => {
          fresh = true;
          if (__DEV__) {
            warn(`"Window.${namespace}" will be overwritten by "garfish".`);
          }
        };
        const desc = Object.getOwnPropertyDescriptor(window, namespace);
        if (desc) {
          if (desc.configurable) {
            def(window, namespace, val);
            next();
          } else if (desc.writable) {
            window[namespace] = val;
            next();
          }
        }
      }
    } else {
      fresh = true;
      def(window, namespace, val);
    }
  };

  if (inBrowser()) {
    // Global flag
    if (!(window.Gar && window.Gar.flag === __GARFISH_FLAG__)) {
      def(window, 'Gar', GarfishInstance);
    }
    if (!(window.Garfish && window.Garfish.flag === __GARFISH_FLAG__)) {
      def(window, 'Garfish', GarfishInstance);
    }
    if (!window.__PROWER_BY_GAR__) {
      def(window, '__PROWER_BY_GAR__', true);
    }
    if (!window.__GAR__) {
      def(window, '__GAR__', true);
    }
  }

  if (fresh) {
    if (__DEV__) {
      if (__VERSION__ !== window['Garfish'].version) {
        warn(
          'The "garfish version" used by the main and sub-applications is inconsistent.',
        );
      }
    }
  }
  return GarfishInstance;
}

export const GarfishInstance = createContext();
