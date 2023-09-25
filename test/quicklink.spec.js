'use strict';

const puppeteer = require('puppeteer');
const {suite} = require('uvu');
const assert = require('uvu/assert');

const host = 'http://127.0.0.1:8080';
const server = `${host}/test/fixtures`;
const mainSuite = suite('quicklink tests');

// Default 1000 ms
const sleep = (ms = 1000) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

const puppeteerOptions = {
  headless: true,
  slowMo: 100,
  timeout: 20000,
};

mainSuite.before(async context => {
  context.browser = await puppeteer.launch(puppeteerOptions);
  context.page = await context.browser.newPage();
});

mainSuite.after(async context => {
  await context.page.close();
  context.browser.close();
});

mainSuite('should prefetch in-viewport links correctly (UMD)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-basic-usage.html`);
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/1.html`));
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes(`${server}/3.html`));
  assert.ok(!responseURLs.includes(`${server}/4.html`));
});

mainSuite('should prefetch in-viewport links correctly (ES Modules)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-es-modules.html`);
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/1.html`));
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes(`${server}/3.html`));
  assert.ok(!responseURLs.includes(`${server}/4.html`));
});

mainSuite('should prefetch in-viewport links that scroll into view correctly (UMD)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-basic-usage.html`);
  await context.page.setViewport({
    width: 1200,
    height: 800,
  });
  await context.page.evaluate(_ => {
    window.scrollBy(0, window.innerHeight);
  });
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/1.html`));
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes(`${server}/3.html`));
  assert.ok(responseURLs.includes(`${server}/4.html`));
});

mainSuite('should prefetch in-viewport links from a custom DOM source', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-custom-dom-source.html`);
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/main.css`));
});

mainSuite('should prefetch in-viewport links from NodeList', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-node-list.html`);
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes(`${server}/3.html`));
});

mainSuite('should only prefetch links if allowed in origins list', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-allow-origin.html`);
  await sleep(1000);
  assert.instance(responseURLs, Array);

  // => origins: ['github.githubassets.com']
  assert.not.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes('https://example.com/1.html'));
  assert.ok(responseURLs.includes('https://github.githubassets.com/images/spinners/octocat-spinner-32.gif'));
});

mainSuite('should prefetch all links when allowing all origins', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-allow-origin-all.html`);
  await sleep();
  assert.instance(responseURLs, Array);

  // => origins: true
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes('https://google.com/'));
  assert.ok(responseURLs.includes('https://example.com/1.html'));
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes('https://github.githubassets.com/images/spinners/octocat-spinner-32.gif'));
});

mainSuite('should only prefetch links of same origin (default)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-same-origin.html`);
  await sleep();
  assert.instance(responseURLs, Array);

  // => origins: [location.hostname] (default)
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.not.ok(responseURLs.includes('https://example.com/1.html'));
  assert.not.ok(responseURLs.includes('https://github.githubassets.com/images/spinners/octocat-spinner-32.gif'));
});

mainSuite('should only prefetch links after ignore patterns allowed it', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-ignore-basic.html`);
  await sleep();
  assert.instance(responseURLs, Array);

  // => origins: [location.hostname] (default)
  // => ignores: /2.html/
  // via ignores
  assert.not.ok(responseURLs.includes(`${server}/2.html`));
  // via same origin
  assert.not.ok(responseURLs.includes('https://example.com/1.html'));
  // via same origin
  assert.not.ok(responseURLs.includes('https://github.githubassets.com/images/spinners/octocat-spinner-32.gif'));
});

mainSuite('should only prefetch links after ignore patterns allowed it (multiple)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-ignore-multiple.html`);
  await sleep();
  assert.instance(responseURLs, Array);

  // => origins: true (all)
  // => ignores: [...]
  assert.ok(responseURLs.includes(`${server}/2.html`));
  // /example/
  assert.not.ok(responseURLs.includes('https://example.com/1.html'));
  // (uri) => uri.includes('foobar')
  assert.not.ok(responseURLs.includes('https://foobar.com/3.html'));
  // (uri, elem) => elem.textContent.includes('Spinner')
  assert.not.ok(responseURLs.includes('https://github.githubassets.com/images/spinners/octocat-spinner-32.gif'));
});

mainSuite('should accept a single URL to prefetch()', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-prefetch-single.html`);
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/2.html`));
});

mainSuite('should accept multiple URLs to prefetch()', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-prefetch-multiple.html`);
  await sleep();

  // don't care about first 3 URLs (markup)
  const ours = responseURLs.slice(3);

  assert.is(ours.length, 3);
  assert.ok(ours.includes(`${server}/2.html`));
  assert.ok(ours.includes(`${server}/3.html`));
  assert.ok(ours.includes(`${server}/4.html`));
});

mainSuite('should not prefetch() the same URL repeatedly', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-prefetch-duplicate.html`);
  await sleep();

  // don't care about first 3 URLs (markup)
  const ours = responseURLs.slice(3);

  assert.is(ours.length, 1);
  assert.ok(ours.includes(`${server}/2.html`));
});

// TODO Fix and enable the test later
mainSuite.skip('should not call the same URL repeatedly (shared)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-prefetch-duplicate-shared.html`);
  await sleep();

  // count occurrences of our link
  const target = responseURLs.filter(x => x === `${server}/2.html`);
  assert.is(target.length, 1);
});

mainSuite('should not exceed the `limit` total', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-limit.html`);
  await sleep();

  // don't care about first 3 URLs (markup)
  const ours = responseURLs.slice(3);

  assert.is(ours.length, 1);
  assert.ok(ours.includes(`${server}/1.html`));
});

mainSuite('should respect the `throttle` concurrency', async context => {
  const URLs = []; // Note: Page makes 4 requests

  // Make HTML requests take a long time
  // ~> so that we can ensure throttling occurs
  await context.page.setRequestInterception(true);

  context.page.on('request', async req => {
    const url = req.url();
    if (/test\/fixtures\/\d+\.html$/i.test(url)) {
      await sleep(100);
      URLs.push(url);
      return req.respond({status: 200});
    }

    req.continue();
  });

  await context.page.goto(`${server}/test-throttle.html`);

  // Only 2 should be done by now
  // Note: Parallel requests, w/ 50ms buffer
  await sleep(150);
  assert.is(URLs.length, 2);

  // All should be done by now
  // Note: Parallel requests, w/ 50ms buffer
  await sleep(250);
  assert.is(URLs.length, 4);
});

mainSuite('should prefetch using a custom function to build the URL', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });

  await context.page.goto(`${server}/test-custom-href-function.html`);
  await sleep();

  // don't care about first 3 URLs (markup)
  const ours = responseURLs.slice(3);
  assert.ok(ours.includes(`https://example.com/?url=${server}/1.html`));
  assert.ok(ours.includes(`https://example.com/?url=${server}/2.html`));
  assert.ok(ours.includes(`https://example.com/?url=${server}/3.html`));
  assert.ok(ours.includes(`https://example.com/?url=${server}/4.html`));
});

mainSuite('should delay prefetch for in-viewport links correctly (UMD)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-delay.html`);
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/1.html`));
  assert.ok(responseURLs.includes(`${server}/2.html`));
  assert.ok(responseURLs.includes(`${server}/3.html`));
  // Scroll down and up
  await context.page.evaluate(_ => {
    window.scrollBy(0, window.innerHeight);
  });
  await sleep(100);
  await context.page.evaluate(_ => {
    window.scrollBy(0, -window.innerHeight);
  });
  assert.not.ok(responseURLs.includes(`${server}/4.html`));
  // Scroll down and test
  await context.page.evaluate(_ => {
    window.scrollBy(0, window.innerHeight);
  });
  await sleep(200);
  assert.ok(responseURLs.includes(`${server}/4.html`));
});

mainSuite('should consider threshold option before prefetching (UMD)', async context => {
  const responseURLs = [];
  context.page.on('response', resp => {
    responseURLs.push(resp.url());
  });
  await context.page.goto(`${server}/test-threshold.html`);
  await context.page.setViewport({
    width: 1000,
    height: 800,
  });
  await sleep();
  assert.instance(responseURLs, Array);
  assert.ok(responseURLs.includes(`${server}/1.html`));
  assert.ok(responseURLs.includes(`${server}/2.html`));
  await context.page.evaluate(_ => {
    window.scrollBy(0, window.innerHeight);
  });
  await sleep(400);
  assert.ok(responseURLs.includes(`${server}/3.html`));
  assert.ok(responseURLs.includes(`${server}/4.html`));
});

mainSuite.run();
