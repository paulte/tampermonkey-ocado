// ==UserScript==
// @name         Ocado Auto Price Sort
// @version      2.2.6
// @released     2026-08-09T22:43:51+0100
// @namespace    https://github.com/paulte/tampermonkey-ocado
// @description  Automatically sets Ocado sort to "Price per Unit: Low to High" when searching without an explicit sort, and skips optional checkout steps.
// @author       paulte
// @downloadURL  https://github.com/paulte/tampermonkey-ocado/releases/latest/download/fix-search-order.user.js
// @updateURL    https://github.com/paulte/tampermonkey-ocado/releases/latest/download/fix-search-order.user.js
// @match        https://ocado.com/*
// @match        https://www.ocado.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Search sorting
  // -------------------------------------------------------------------------

  const TARGET_SORT_LABEL = 'Price per Unit: Low to High';

  const MAX_ATTEMPTS = 30;
  const RETRY_DELAY = 500;

  const DEBUG = false;

  function log(...args) {
    if (DEBUG) {
      console.log('[Ocado Auto Price Sort]', ...args);
    }
  }

  function shouldAutoSort() {
    const urlParams = new URLSearchParams(location.search);

    return urlParams.has('q') && !urlParams.has('sortBy');
  }

  function getSortButton() {
    return document.querySelector('div[data-test="sort-button"]');
  }

  function getCurrentSelection(sortButton) {
    return sortButton?.querySelector('span')?.textContent?.trim();
  }

  function findTargetOption() {
    return Array.from(document.querySelectorAll('[role="option"]')).find(
      (option) => option.getAttribute('data-name') === TARGET_SORT_LABEL,
    );
  }

  function trySetSort(attempt = 0) {
    if (!shouldAutoSort()) {
      return;
    }

    const sortButton = getSortButton();

    if (!sortButton) {
      retry(attempt);
      return;
    }

    const currentSelection = getCurrentSelection(sortButton);

    if (currentSelection === TARGET_SORT_LABEL) {
      log('Sort already set');
      return;
    }

    if (sortButton.getAttribute('aria-expanded') !== 'true') {
      sortButton.click();

      retry(attempt);
      return;
    }

    const option = findTargetOption();

    if (option) {
      option.click();

      log('Sort set:', TARGET_SORT_LABEL);
      return;
    }

    retry(attempt);
  }

  function retry(attempt) {
    if (attempt >= MAX_ATTEMPTS) {
      log('Unable to set sort after max attempts');
      return;
    }

    setTimeout(() => {
      trySetSort(attempt + 1);
    }, RETRY_DELAY);
  }

  // -------------------------------------------------------------------------
  // Checkout
  // -------------------------------------------------------------------------

  const CHECKOUT_MATCH = '/checkout/checkout-walk';
  const CHECKOUT_SELECTOR = 'a[data-test="checkout-walk-crumbs-link"]';

  let checkoutBusy = false;

  function isCheckout() {
    return location.pathname.includes(CHECKOUT_MATCH);
  }

  function findAndClickCheckout() {
    const el = document.querySelector(CHECKOUT_SELECTOR);

    if (!el) {
      return false;
    }

    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();

    if (!text.includes('Continue checkout')) {
      return false;
    }

    log('Clicking checkout:', text);

    el.click();

    return true;
  }

  function checkoutLoop() {
    if (!isCheckout() || checkoutBusy) {
      return;
    }

    const clicked = findAndClickCheckout();

    if (clicked) {
      checkoutBusy = true;

      setTimeout(() => {
        checkoutBusy = false;
        checkoutLoop();
      }, 1500);
    }
  }

  // -------------------------------------------------------------------------
  // Navigation / DOM watching
  // -------------------------------------------------------------------------

  function handlePageChange() {
    trySetSort();
    checkoutLoop();
  }

  function watchNavigation() {
    let lastUrl = location.href;

    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;

        setTimeout(handlePageChange, 500);
      }
    }, 500);
  }

  function watchDomChanges() {
    const observer = new MutationObserver(() => {
      trySetSort();
      checkoutLoop();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    log('Starting');

    setTimeout(handlePageChange, 1000);

    watchNavigation();
    watchDomChanges();

    checkoutLoop();
  }

  init();
})();
