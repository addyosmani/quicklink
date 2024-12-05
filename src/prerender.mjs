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
 * Add a given set of urls to the speculation rules
 * @param {Set} urlsToPrerender - the URLs to add to speculation rules
 * @param {String} eagerness - prerender eagerness mode
 * @return {Boolean|Object}  boolean or Error Object
 */
export function addSpeculationRules(urlsToPrerender, eagerness) {
  const specScript = document.createElement('script');
  specScript.type = 'speculationrules';
  specScript.text = `{"prerender":[{"source": "list",
                      "urls": ["${Array.from(urlsToPrerender).join('","')}"],
                      "eagerness": "${eagerness}"}]}`;
  try {
    document.head.appendChild(specScript);
  } catch (error) {
    return error;
  }

  return true;
}

/**
 * Check whether UA supports Speculation Rules API
 * @return {Boolean} whether UA has support for Speculation Rules API
 */
export function hasSpecRulesSupport() {
  return HTMLScriptElement.supports('speculationrules');
}
