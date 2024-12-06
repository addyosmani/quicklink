/**
 * Portions copyright 2018 Google Inc.
 * Inspired by Gatsby's prefetching logic, with those portions
 * remaining MIT. Additions include support for Fetch API,
 * XHR switching, SaveData and Effective Connection Type checking.
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

/**
 * Checks if a feature on `link` is natively supported.
 * Examples of features include `prefetch` and `preload`.
 * @param {Object} link - Link object.
 * @return {Boolean} whether the feature is supported
 */
function hasPrefetch(link) {
  link = document.createElement('link');
  return link.relList && link.relList.supports && link.relList.supports('prefetch');
}

/**
 * Fetches a given URL using `<link rel=prefetch>`
 * @param {string} url - the URL to fetch
 * @param {Boolean} hasCrossorigin - true to set crossorigin="anonymous"
 * @return {Object} a Promise
 */
function viaDOM(url, hasCrossorigin) {
  return new Promise((resolve, reject, link) => {
    link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    if (hasCrossorigin) {
      link.setAttribute('crossorigin', 'anonymous');
    }

    link.onload = resolve;
    link.onerror = reject;

    document.head.appendChild(link);
  });
}

/**
 * Fetches a given URL using XMLHttpRequest
 * @param {string} url - the URL to fetch
 * @param {Boolean} hasCredentials - true to set withCredentials:true
 * @return {Object} a Promise
 */
function viaXHR(url, hasCredentials) {
  return new Promise((resolve, reject, request) => {
    request = new XMLHttpRequest();

    request.open('GET', url, request.withCredentials = hasCredentials);

    request.setRequestHeader('Accept', '*/*');

    request.onload = () => {
      if (request.status === 200) {
        resolve();
      } else {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject();
      }
    };

    request.send();
  });
}

/**
 * Fetches a given URL using the Fetch API. Falls back
 * to XMLHttpRequest if the API is not supported.
 * @param {string} url - the URL to fetch
 * @param {Boolean} hasModeCors - true to set mode:'cors'
 * @param {Boolean} hasCredentials - true to set credentials:'include'
 * @param {Boolean} isPriority - true to set priority:'high'
 * @return {Object} a Promise
 */
export function viaFetch(url, hasModeCors, hasCredentials, isPriority) {
  // TODO: Investigate using preload for high-priority
  // fetches. May have to sniff file-extension to provide
  // valid 'as' values. In the future, we may be able to
  // use Priority Hints here.
  //
  // As of 2018, fetch() is high-priority in Chrome
  // and medium-priority in Safari.
  const options = {headers: {accept: '*/*'}};
  if (!hasModeCors) options.mode = 'no-cors';
  if (hasCredentials) options.credentials = 'include';
  isPriority ? options.priority = 'high' : options.priority = 'low';
  return window.fetch ? fetch(url, options) : viaXHR(url, hasCredentials);
}

export const supported = hasPrefetch() ? viaDOM : viaFetch;
