/**
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

import throttle from 'throttles';
import {priority, supported} from './prefetch.mjs';
import {requestIdleCallback} from './request-idle-callback.mjs';
import {addSpeculationRules, hasSpecRulesSupport} from './prerender.mjs';

// Cache of URLs we've prefetched
// Its `size` is compared against `opts.limit` value.
const toPrefetch = new Set();

// Cache of URLs we've prerendered
const toPrerender = new Set();
// global var to keep prerenderAndPrefer option
let shouldPrerenderAndPrefetch = false;

/**
 * Determine if the anchor tag should be prefetched.
 * A filter can be a RegExp, Function, or Array of both.
 *   - Function receives `node.href, node` arguments
 *   - RegExp receives `node.href` only (the full URL)
 * @param  {Element}  node    The anchor (<a>) tag.
 * @param  {Mixed}    filter  The custom filter(s)
 * @return {Boolean}          If true, then it should be ignored
 */
function isIgnored(node, filter) {
  return Array.isArray(filter) ?
    filter.some(x => isIgnored(node, x)) :
    (filter.test || filter).call(filter, node.href, node);
}

/**
 * Checks network conditions
 * @param  {NetworkInformation}  conn    The connection information to be checked
 * @return {Boolean|Object}  Error Object if the constrainsts are met or boolean otherwise
 */
function checkConnection(conn) {
  if (conn) {
    // Don't pre* if using 2G or if Save-Data is enabled.
    if (conn.saveData) {
      return new Error('Save-Data is enabled');
    }

    if (/2g/.test(conn.effectiveType)) {
      return new Error('network conditions are poor');
    }
  }

  return true;
}

/**
 * Prefetch an array of URLs if the user's effective
 * connection type and data-saver preferences suggests
 * it would be useful. By default, looks at in-viewport
 * links for `document`. Can also work off a supplied
 * DOM element or static array of URLs.
 * @param {Object} options - Configuration options for quicklink
 * @param {Object|Array} [options.el] - DOM element(s) to prefetch in-viewport links of
 * @param {Boolean} [options.priority] - Attempt higher priority fetch (low or high)
 * @param {Array} [options.origins] - Allowed origins to prefetch (empty allows all)
 * @param {Array|RegExp|Function} [options.ignores] - Custom filter(s) that run after origin checks
 * @param {Number} [options.timeout] - Timeout after which prefetching will occur
 * @param {Number} [options.throttle] - The concurrency limit for prefetching
 * @param {Number} [options.threshold] - The area percentage of each link that must have entered the viewport to be fetched
 * @param {Number} [options.limit] - The total number of prefetches to allow
 * @param {Number} [options.delay] - Time each link needs to stay inside viewport before prefetching (milliseconds)
 * @param {Function} [options.timeoutFn] - Custom timeout function
 * @param {Function} [options.onError] - Error handler for failed `prefetch` requests
 * @param {Function} [options.hrefFn] - Function to use to build the URL to prefetch.
 *                                             If it's not a valid function, then it will use the entry href.
 * @param {Boolean} [options.prerender] - Option to switch from prefetching and use prerendering only
 * @param {Boolean} [options.prerenderAndPrefetch] - Option to use both prerendering and prefetching
 * @return {Function}
 */
export function listen(options = {}) {
  if (!window.IntersectionObserver || !('isIntersecting' in IntersectionObserverEntry.prototype)) return;

  const [toAdd, isDone] = throttle(options.throttle || 1 / 0);
  const limit = options.limit || 1 / 0;
  const threshold = options.threshold || 0;

  const allowed = options.origins || [location.hostname];
  const ignores = options.ignores || [];
  const delay = options.delay || 0;
  const hrefsInViewport = [];

  const timeoutFn = options.timeoutFn || requestIdleCallback;
  const hrefFn = typeof options.hrefFn === 'function' && options.hrefFn;

  const shouldOnlyPrerender = options.prerender || false;
  shouldPrerenderAndPrefetch = options.prerenderAndPrefetch || false;

  const setTimeoutIfDelay = (callback, delay) => {
    if (!delay) {
      callback();
      return;
    }

    setTimeout(callback, delay);
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      // On enter
      if (entry.isIntersecting) {
        entry = entry.target;
        // Adding href to array of hrefsInViewport
        hrefsInViewport.push(entry.href);

        // Setting timeout
        setTimeoutIfDelay(() => {
          // Do not prefetch if not found in viewport
          if (!hrefsInViewport.includes(entry.href)) return;

          observer.unobserve(entry);

          // prerender, if..
          // either it's the prerender + prefetch mode or it's prerender *only* mode
          // Prerendering limit is following options.limit. UA may impose arbitraty numeric limit
          if ((shouldPrerenderAndPrefetch || shouldOnlyPrerender) && toPrerender.size < limit) {
            prerender(hrefFn ? hrefFn(entry) : entry.href).catch(error => {
              if (options.onError) {
                options.onError(error);
              } else {
                throw error;
              }
            });

            return;
          }

          // Do not prefetch if will match/exceed limit and user has not switched to shouldOnlyPrerender mode
          if (toPrefetch.size < limit && !shouldOnlyPrerender) {
            toAdd(() => {
              prefetch(hrefFn ? hrefFn(entry) : entry.href, options.priority)
                  .then(isDone)
                  .catch(error => {
                    isDone();
                    if (options.onError) options.onError(error);
                  });
            });
          }
        }, delay);
      // On exit
      } else {
        entry = entry.target;
        const index = hrefsInViewport.indexOf(entry.href);
        if (index > -1) {
          hrefsInViewport.splice(index);
        }
      }
    });
  }, {
    threshold,
  });

  timeoutFn(() => {
    // Find all links & Connect them to IO if allowed
    const elementsToListen = options.el &&
    options.el.length &&
    options.el.length > 0 &&
    options.el[0].nodeName === 'A' ?
      options.el :
      (options.el || document).querySelectorAll('a');

    elementsToListen.forEach(link => {
      // If the anchor matches a permitted origin
      // ~> A `[]` or `true` means everything is allowed
      if (!allowed.length || allowed.includes(link.hostname)) {
        // If there are any filters, the link must not match any of them
        if (!isIgnored(link, ignores)) observer.observe(link);
      }
    });
  }, {
    timeout: options.timeout || 2000,
  });

  return function () {
    // wipe url list
    toPrefetch.clear();
    // detach IO entries
    observer.disconnect();
  };
}

/**
* Prefetch a given URL with an optional preferred fetch priority
* @param {String} url - the URL to fetch
* @param {Boolean} [isPriority] - if is "high" priority
* @return {Object} a Promise
*/
export function prefetch(url, isPriority) {
  const chkConn = checkConnection(navigator.connection);
  if (chkConn instanceof Error) {
    return Promise.reject(new Error(`Cannot prefetch, ${chkConn.message}`));
  }

  if (toPrerender.size > 0 && !shouldPrerenderAndPrefetch) {
    console.warn('[Warning] You are using both prefetching and prerendering on the same document');
  }

  // Dev must supply own catch()
  return Promise.all(
      [].concat(url).map(str => {
        if (toPrefetch.has(str)) return [];

        // Add it now, regardless of its success
        // ~> so that we don't repeat broken links
        toPrefetch.add(str);

        return (isPriority ? priority : supported)(
            new URL(str, location.href).toString(),
        );
      }),
  );
}

/**
* Prerender a given URL
* @param {String} urls - the URL to fetch
* @return {Object} a Promise
*/
export function prerender(urls) {
  const chkConn = checkConnection(navigator.connection);
  if (chkConn instanceof Error) {
    return Promise.reject(new Error(`Cannot prerender, ${chkConn.message}`));
  }

  // prerendering preconditions:
  // 1) whether UA supports spec rules.. If not, fallback to prefetch
  // Note: Prerendering supports same-site cross origin with opt-in header
  if (!hasSpecRulesSupport()) {
    prefetch(urls);
    return Promise.reject(new Error('This browser does not support the speculation rules API. Falling back to prefetch.'));
  }

  for (const url of [].concat(urls)) {
    toPrerender.add(url);
  }

  // check if both prerender and prefetch exists.. throw a warning but still proceed
  if (toPrefetch.size > 0 && !shouldPrerenderAndPrefetch) {
    console.warn('[Warning] You are using both prefetching and prerendering on the same document');
  }

  const addSpecRules = addSpeculationRules(toPrerender);
  return addSpecRules === true ? Promise.resolve() : Promise.reject(addSpecRules);
}
