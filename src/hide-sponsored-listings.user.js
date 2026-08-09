// ==UserScript==
// @name         Hide Sponsored Listings in Amazon Search
// @namespace    https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings
// @supportURL   https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/issues
// @released     __RELEASED__
// @description  Remove sponsored listings from Amazon search results
// @author       paulte
// @match        https://www.amazon.co.uk/s*
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let removeTimeout;

  function findSponsoredContainer(label) {
    /*
     * Multi-content Amazon sponsored blocks and ordinary
     * sponsored results use s-result-item.
     *
     * This is deliberately checked first because AdHolder
     * sponsored blocks are also s-result-item elements.
     */
    const resultItem = label.closest('.s-result-item');

    if (resultItem) {
      return resultItem;
    }

    /*
     * Older/alternative Amazon result structure.
     */
    const listItem = label.closest('div[role="listitem"]');

    if (listItem) {
      return listItem;
    }

    /*
     * Amazon card-based sponsored result structure.
     */
    const cardContainer = label.closest('.puis-card-container');

    if (cardContainer) {
      return cardContainer;
    }

    return null;
  }

  function removeSponsored() {
    /*
     * Amazon has used several sponsored markers.
     *
     * Keep all known semantic markers rather than relying on
     * generated Amazon CSS class names.
     */
    const sponsoredLabels = document.querySelectorAll(
      [
        '.puis-sponsored-label-text',
        '.s-widget-sponsored-label-text',
        '[aria-label="Leave feedback on Sponsored ad"]',
        '[aria-label="Leave feedback on sponsored ad"]',
      ].join(', '),
    );

    const removedContainers = new Set();

    sponsoredLabels.forEach((label) => {
      const container = findSponsoredContainer(label);

      /*
       * Multiple sponsored markers can exist inside the
       * same multi-content AdHolder. Only remove the parent
       * once.
       */
      if (container && !removedContainers.has(container)) {
        removedContainers.add(container);
        container.remove();

        console.log('Removed sponsored listing.');
      }
    });
  }

  function debouncedRemoveSponsored() {
    clearTimeout(removeTimeout);
    removeTimeout = setTimeout(removeSponsored, 300);
  }

  /*
   * Handle sponsored content already present when the script
   * starts.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeSponsored);
  } else {
    removeSponsored();
  }

  /*
   * Amazon dynamically adds and replaces search-result content,
   * so continue watching the page for new sponsored listings.
   */
  const observer = new MutationObserver(debouncedRemoveSponsored);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
