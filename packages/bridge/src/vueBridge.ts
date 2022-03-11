// The logic of reactBridge is referenced from single-spa typography
// Because the Garfish lifecycle does not agree with that of single-spa  part logical coupling in the framework
// https://github.com/single-spa/single-spa-vue/blob/main/src/single-spa-vue.js
const defaultOpts = {
  Vue: null, // vue2
  createApp: null, // vue3
  VueRouter: null,

  // required - one or the other
  rootComponent: null,
  loadRootComponent: null,

  appOptions: null,
  handleInstance: null,
  el: null,
  canUpdate: true, // by default, allow parcels created with garfish-react-bridge to be updated
};

declare const __GARFISH_EXPORTS__: {
  provider: Object;
};

declare global {
  interface Window {
    __GARFISH__: boolean;
  }
}

export function vueBridge(this: any, userOpts) {
  if (typeof userOpts !== 'object') {
    throw new Error('garfish-vue-bridge: requires a configuration object');
  }

  const opts = {
    ...defaultOpts,
    ...userOpts,
  };

  if (!opts.Vue && !opts.createApp) {
    throw Error(
      'garfish-vue-bridge: must be passed opts.Vue or opts.createApp',
    );
  }

  if (
    opts.appOptions.el &&
    typeof opts.appOptions.el !== 'string' &&
    !(opts.appOptions.el instanceof HTMLElement)
  ) {
    throw Error(
      `garfish-vue-bridge: appOptions.el must be a string CSS selector, an HTMLElement, or not provided at all. Was given ${typeof opts
        .appOptions.el}`,
    );
  }

  opts.createApp = opts.createApp || (opts.Vue && opts.Vue.createApp);
  // Just a shared object to store the mounted object state
  // key - name of single-spa app, since it is unique
  const mountedInstances = {};
  const providerLifeCycle = {
    render: (props) => mount.call(this, opts, mountedInstances, props),
    destroy: (props) => unmount.call(this, opts, mountedInstances, props),
    update: (props) =>
      opts.canUpdate && update.call(this, opts, mountedInstances, props),
  };

  const provider = async function (this: any, appInfo, props) {
    await bootstrap.call(this, opts, appInfo, props);
    return providerLifeCycle;
  };

  // in sandbox env
  if (
    window.__GARFISH__ &&
    typeof __GARFISH_EXPORTS__ === 'object' &&
    __GARFISH_EXPORTS__
  ) {
    __GARFISH_EXPORTS__.provider = provider;
  }
  return provider;
}

function bootstrap(opts, appInfo, props) {
  if (opts.loadRootComponent) {
    return opts
      .loadRootComponent({
        ...appInfo,
        props,
      })
      .then((root) => (opts.rootComponent = root));
  } else {
    return Promise.resolve();
  }
}

function resolveAppOptions(opts, props) {
  if (typeof opts.appOptions === 'function') {
    return opts.appOptions(props);
  }
  return { ...opts.appOptions };
}

function mount(opts, mountedInstances, props) {
  const instance = {
    domEl: null,
    vueInstance: null,
    root: null,
  };

  const appOptions = resolveAppOptions(opts, props);

  if (!(props.dom instanceof HTMLElement)) {
    throw Error(
      `garfish-vue-bridge: Garfish runtime provides no dom attributes to mount， ${props.dom}`,
    );
  }

  if (appOptions.el) {
    appOptions.el = props.dom.querySelector(appOptions.el);
    if (!appOptions.el) {
      throw Error(
        `If appOptions.el is provided to garfish, the dom element must exist in the dom. Was provided as ${appOptions.el}.If use js as sub application entry resource please don't provider el options`,
      );
    }
  } else {
    appOptions.el = props.dom;
  }

  instance.domEl = appOptions.el;

  if (!appOptions.render && !appOptions.template && opts.rootComponent) {
    appOptions.render = (h) => h(opts.rootComponent);
  }

  if (!appOptions.data) {
    appOptions.data = {};
  }

  appOptions.data = () => ({ ...appOptions.data, ...props });

  if (opts.createApp) {
    instance.vueInstance = opts.createApp(appOptions);
    if (opts.handleInstance) {
      opts.handleInstance(instance.vueInstance, props);
      instance.root = instance.vueInstance.mount(appOptions.el);
      mountedInstances[props.appName] = instance;

      return instance.vueInstance;
    } else {
      instance.root = instance.vueInstance.mount(appOptions.el);
    }
  } else {
    // vue2 el options will auto replace render dom，garfish cache mode can't replace render dom https://cn.vuejs.org/v2/api/#el
    delete appOptions.el;
    instance.vueInstance = new opts.Vue(appOptions);
    instance.vueInstance.$mount();
    instance.domEl.appendChild(instance.vueInstance.$el);
    if (instance.vueInstance.bind) {
      instance.vueInstance = instance.vueInstance.bind(instance.vueInstance);
    }
    if (opts.handleInstance) {
      opts.handleInstance(instance.vueInstance, props);
      mountedInstances[props.appName] = instance;
      return instance.vueInstance;
    }
  }

  mountedInstances[props.appName] = instance;
  return instance.vueInstance;
}

function update(opts, mountedInstances, props) {
  const instance = mountedInstances[props.appName];
  const data = {
    ...(opts.appOptions.data || {}),
    ...props,
  };
  const root = instance.root || instance.vueInstance;
  for (const prop in data) {
    root[prop] = data[prop];
  }
}

function unmount(opts, mountedInstances, props) {
  const instance = mountedInstances[props.appName];
  if (opts.createApp) {
    instance.vueInstance.unmount(instance.domEl);
  } else {
    instance.vueInstance.$destroy();
    instance.vueInstance.$el.innerHTML = '';
  }
  delete instance.vueInstance;

  if (instance.domEl) {
    instance.domEl.innerHTML = '';
    delete instance.domEl;
  }
}
