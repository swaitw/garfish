/// <reference types="cypress" />

const basename = '/examples';

describe('whole process vm sandbox set variable', () => {
  beforeEach(() => {
    Cypress.env({
      garfishRunConfig: {
        basename: basename,
        disablePreloadApp: true,
        sandbox: {
          snapshot: false,
        },
      },
    });
  });

  it('set global history variable', () => {
    const ProxyVariableTitle = 'vm sandbox';
    cy.visit('http://localhost:8090');

    cy.window().then((win) => {
      win.history.pushState({}, 'react16', `${basename}/react16/vm-sandbox`);
      cy.contains('[data-test=title]', ProxyVariableTitle)
        .then(() => {
          expect(win.history.scrollRestoration).to.equal('auto');
        })
        .then(() => {
          return cy.get('[data-test=click-set-history-proxy-variable]').click();
        })
        .then(() => {
          expect(win.history.scrollRestoration).to.equal('manual');
        });
    });
  });
});
