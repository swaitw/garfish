// The logic of vue-bridge-test is referenced from single-spa typography
// Because the Garfish lifecycle does not agree with that of single-spa  part logical coupling in the framework
// https://github.com/single-spa/single-spa-vue/blob/main/src/single-spa-vue.test.js

import { reactBridge } from '../src/reactBridge';
import '../../../node_modules/@testing-library/jest-dom/extend-expect';

const domElId = '#sub-app-container';
const cssSelector = '#app';

describe('react-bridge', () => {
  let React,
    ReactDOM,
    props,
    appInfo,
    appContainer,
    container,
    rootComponent,
    loadRootComponent,
    $el,
    $createElement,
    $render;

  beforeEach(() => {
    React = {
      createElement: $createElement,
    };
    ReactDOM = {
      render: $render,
      unmountComponentAtNode: jest.fn(),
      hydrate: jest.fn(),
    };

    container = document.createElement('div');
    container.setAttribute('id', domElId.replace('#', ''));
    document.body.appendChild(container);

    appContainer = document.createElement('div');
    container.setAttribute('id', cssSelector.replace('#', ''));
    container.appendChild(appContainer);

    $el = '#app2';

    appInfo = {
      appName: 'test-app',
      basename: '/demo',
      dom: container,
    };
    props = {
      store: { counter: 100 },
    };

    $createElement = jest.fn();
    $render = jest.fn();
    rootComponent = {};
    loadRootComponent = jest.fn();
  });

  afterEach(() => {
    document.querySelectorAll(cssSelector).forEach((node) => {
      node.remove();
    });
  });

  it('throws an error when required parameters are not provided', () => {
    expect(() => reactBridge({})).toThrow();
    expect(() => reactBridge({ React })).toThrow();
    expect(() => reactBridge({ React, ReactDOM })).toThrow();
    expect(() => reactBridge({ React, ReactDOM, $el })).toThrow();
    expect(() =>
      reactBridge({ React, ReactDOM, loadRootComponent }),
    ).not.toThrow();
    expect(() => reactBridge({ React, ReactDOM, rootComponent })).not.toThrow();

    expect(() =>
      reactBridge({ React, ReactDOM, rootComponent, loadRootComponent }),
    ).not.toThrow();

    expect(() =>
      reactBridge({ React, ReactDOM, $el, rootComponent, loadRootComponent }),
    ).not.toThrow();
  });

  it('throws an error when opts.el is provided and opts.el.dom does not exist in the dom during mount', async () => {
    const provider = reactBridge({
      React,
      ReactDOM,
      el: '#invalid_app',
      rootComponent,
    });

    const lifeCycles = await provider(appInfo, props);
    expect(() => lifeCycles.render({ ...appInfo, props })).toThrow();
  });

  it('throws an error when opts.errorBoundary is provided and the type is not function', async () => {
    expect(() =>
      reactBridge({
        React,
        ReactDOM,
        loadRootComponent,
        errorBoundary: {},
      }),
    ).toThrow();
  });

  it('function called when mounts and unmounts a React component', async () => {
    const provider = reactBridge({
      React,
      ReactDOM,
      rootComponent,
    });

    const lifeCycles = await provider(appInfo, props);
    expect(React.createElement).not.toHaveBeenCalled();
    expect(ReactDOM.render).not.toHaveBeenCalled();

    lifeCycles.render({ ...appInfo, props });
    expect(React.createElement).toHaveBeenCalled();
    expect(ReactDOM.unmountComponentAtNode).not.toHaveBeenCalled();

    lifeCycles.destroy(props);
    expect(ReactDOM.unmountComponentAtNode).toHaveBeenCalled();
  });

  it("mounts and unmounts a React component with a 'renderType' of 'hydrate'", async () => {
    const provider = reactBridge({
      React,
      ReactDOM,
      rootComponent,
      renderType: 'hydrate',
    });

    const lifeCycles = await provider(appInfo, props);
    expect(ReactDOM.hydrate).not.toHaveBeenCalled();
    lifeCycles.render({ ...appInfo, props });
    expect(ReactDOM.hydrate).toHaveBeenCalled();
  });

  it('implements a render function for you if you provide loadRootComponent', async () => {
    const opts = {
      React,
      ReactDOM,
      rootComponent,
      loadRootComponent,
    };

    opts.loadRootComponent.mockReturnValue(Promise.resolve({}));

    const provider = reactBridge(opts);
    const lifeCycles = await provider(appInfo, props);
    lifeCycles.render({ ...appInfo, props });
    expect(opts.loadRootComponent).toHaveBeenCalled();
  });

  it('loadRootComponent function will recieve the props provided at mount', async () => {
    const opts = {
      React,
      ReactDOM,
      rootComponent,
      loadRootComponent,
    };
    opts.loadRootComponent.mockReturnValue(Promise.resolve({}));

    const provider = reactBridge({
      React,
      ReactDOM,
      loadRootComponent,
    });

    const lifeCycles = await provider(appInfo, props);
    lifeCycles.render({ ...appInfo, props });
    expect(loadRootComponent.mock.calls[0][0]).toEqual({ ...appInfo, props });
    expect(loadRootComponent.mock.calls[0][0].appName).toBe('test-app');
    expect(loadRootComponent.mock.calls[0][0].props.store.counter).toBe(100);

    lifeCycles.destroy(props);
  });

  describe('opts.el', () => {
    it("mounts into the div you provided in the opts.el if you provide an 'el' in opts", async () => {
      const opts = {
        React,
        ReactDOM,
        rootComponent,
        el: '#test_el',
      };
      const $testEl = document.createElement('div');
      $testEl.setAttribute('id', 'test_el');
      container.appendChild($testEl);

      const provider = reactBridge(opts);
      const lifeCycles = await provider(appInfo, props);

      lifeCycles.render({ ...appInfo, props });
      expect(React.createElement).toHaveBeenCalled();
      expect(document.getElementById('test_el')).toBeInTheDocument();
      expect(document.getElementById('test_el')).not.toBeNull;
      expect(document.getElementById('test_el').children).not.toBeNull;
      expect(document.getElementById('app')).toBeNull;
    });

    it("mounts into the garfish-react-bridge div if you don't provide an 'el' in opts", async () => {
      const opts = {
        React,
        ReactDOM,
        rootComponent,
      };

      const provider = reactBridge(opts);
      const lifeCycles = await provider(appInfo, props);

      lifeCycles.render({ ...appInfo, props });
      expect(React.createElement).toHaveBeenCalled();
      expect(document.getElementById('app')).not.toBeNull;
      expect(document.getElementById('app').children).not.toBeNull;
    });
  });
});
