// ==UserScript==
// @name         Ocado Auto Price Sort
// @version      2.2.0
// @released     2026-08-09T15:08:34+0100
// @namespace    https://github.com/paulte/tampermonkey-ocado
// @description  Automatically sets Ocado sort to "Price per Unit: Low to High" when searching without an explicit sort.
// @author       paulte
// @downloadURL  https://github.com/paulte/tampermonkey-ocado/releases/latest/download/fix-search-order.user.js
// @updateURL    https://github.com/paulte/tampermonkey-ocado/releases/latest/download/fix-search-order.user.js
// @match        https://www.ocado.com/*
// @icon         https://www.google.com/s2/favicons?domain=ocado.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

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

  function watchNavigation() {
    let lastUrl = location.href;

    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;

        setTimeout(() => {
          trySetSort();
        }, 1000);
      }
    }, 500);
  }

  function watchDomChanges() {
    const observer = new MutationObserver(() => {
      trySetSort();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    log('Starting');

    setTimeout(() => {
      trySetSort();
    }, 1000);

    watchNavigation();
    watchDomChanges();
  }

  init();
})();
