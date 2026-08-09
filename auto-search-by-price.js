// ==UserScript==
// @name         Ocado Auto Price Sort (2025 SPA Fix)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Automatically sets Ocado sort to "Price per Unit: Low to High" if no sortBy is set, supports SPA and delayed rendering.
// @author       pepe
// @match        https://www.ocado.com/*
// @icon         https://www.google.com/s2/favicons?domain=ocado.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_SORT_LABEL = "Price per Unit: Low to High";

    function shouldAutoSort() {
        const urlParams = new URLSearchParams(location.search);
        return urlParams.has('q') && !urlParams.has('sortBy');
    }

    function trySetSort(attempt = 0) {
        const maxAttempts = 30;
        const delay = 500;

        if (!shouldAutoSort()) return;

        const sortButton = document.querySelector('div[data-test="sort-button"]');
        if (!sortButton) {
            if (attempt < maxAttempts) setTimeout(() => trySetSort(attempt + 1), delay);
            return;
        }

        const currentSelection = sortButton.querySelector('span._trigger__text_v6hvb_33')?.textContent.trim();
        if (currentSelection === TARGET_SORT_LABEL) {
            console.log("✅ Sort already set");
            return;
        }

        // Open dropdown if not already open
        if (sortButton.getAttribute("aria-expanded") !== "true") {
            sortButton.click();
            setTimeout(() => trySetSort(attempt + 1), delay);
            return;
        }

        // Dropdown is open: search new Ocado option structure
        const option = Array.from(document.querySelectorAll('[role="option"]'))
        .find(o => o.getAttribute('data-name') === TARGET_SORT_LABEL);

        if (option) {
            option.click();
            console.log("✅ Sort set to:", TARGET_SORT_LABEL);
            return;
        }
        if (attempt < maxAttempts) {
            setTimeout(() => trySetSort(attempt + 1), delay);
        } else {
            console.warn("❌ Could not set sort after max attempts");
        }
    }

    // SPA navigation detection
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => trySetSort(0), 1000);
        }
    }, 500);

    // Initial trigger
    setTimeout(() => trySetSort(0), 1000);
})();
