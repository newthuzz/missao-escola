const {chromium} = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const repo = path.resolve(__dirname, '../..'), root = path.join(repo, 'dist');
// Original geometry is the preservation contract, not a copy of the new implementation.
const baseline = execFileSync('git', ['show', 'c725abc:index.html'], {cwd:repo});

(async () => {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const file = path.join(root, url.replace(/^\/baseline/, '') === '/' ? 'index.html' : url.replace(/^\/baseline/, ''));
    try {
      res.setHeader('Content-Type', /\.(js|mjs)$/.test(file) ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(url === '/baseline/' ? baseline : fs.readFileSync(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const geometry = page => page.evaluate(() => ({
    land:document.querySelector('.world-ground').getAttribute('d'),
    road:document.querySelector('.world-road').getAttribute('d'),
    props:document.querySelectorAll('.world-prop').length,
    checkpoints:[...document.querySelectorAll('.map-checkpoint')].map(n => [n.getAttribute('transform'), n.getAttribute('data-checkpoint'), n.getAttribute('aria-label')]),
    name:document.getElementById('island-title').textContent,
    progress:JSON.stringify({progress, learner, routine})
  }));
  try {
    browser = await chromium.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
    const context = await browser.newContext({viewport:{width:1440,height:1100}, reducedMotion:'no-preference'});
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {get:() => 8});
      Object.defineProperty(navigator, 'deviceMemory', {get:() => 8});
    });
    const original = await context.newPage(), page = await context.newPage(), errors = [];
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await original.goto(origin + '/baseline/');
    await page.goto(origin + '/');
    await page.locator('#map-art').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'running');
    assert.equal(await page.locator('.journey-map').getAttribute('data-life-detail'), 'full');
    const kinds = ['garden','forest','crystal','moon','mountain','stars'], observations = [];
    fs.mkdirSync('/tmp/missao-islands', {recursive:true});

    for (let i = 0; i < kinds.length; i++) {
      await original.locator(`[data-island="${i}"]`).click();
      await page.locator(`[data-island="${i}"]`).click();
      await page.locator('#map-art').scrollIntoViewIfNeeded();
      assert.deepEqual(await geometry(page), await geometry(original));
      assert.equal(await page.locator('#map-art svg').getAttribute('data-life-kind'), kinds[i]);
      const info = await page.evaluate(() => {
        const svg = document.querySelector('#map-art svg'), island = svg.querySelector('.world-island');
        const moving = [...svg.querySelectorAll('*')].filter(n => getComputedStyle(n).animationName !== 'none');
        const descendants = [...island.querySelectorAll('.map-checkpoint,.world-props,.world-traveler,.world-ground,.world-road')];
        return {
          duration:getComputedStyle(island).animationDuration,
          delay:getComputedStyle(island).animationDelay,
          checkpoints:island.querySelectorAll('.map-checkpoint').length,
          animals:island.querySelectorAll('.life-animal').length,
          animated:moving.length,
          decorative:[...svg.querySelectorAll('.life-decoration')].every(n => n.getAttribute('aria-hidden') === 'true' && getComputedStyle(n).pointerEvents === 'none'),
          grouped:descendants.length >= 10 && descendants.every(n => n.closest('.world-island') === island)
        };
      });
      assert.equal(info.checkpoints, 7);
      assert.ok(info.animals <= 2 && info.animated <= 16, JSON.stringify(info));
      assert.ok(info.decorative && info.grouped);
      assert.ok(parseFloat(info.duration) >= 5 && parseFloat(info.duration) <= 9);
      observations.push(info);
      await page.locator('.map-motion-toggle').click();
      await page.locator('.journey-map').screenshot({path:`/tmp/missao-islands/${kinds[i]}-light.png`});
      await page.locator('.map-motion-toggle').click();
    }
    assert.equal(new Set(observations.map(x => x.delay)).size, 6);
    assert.equal(new Set(observations.map(x => x.duration)).size, 6);
    console.log('PASS all six island names, silhouettes, scenery, paths, checkpoints and educational state preserved');
    console.log('PASS individualized decoration, 5–9s floating cycles, distinct phases and bounded animation count', observations);

    // Freeze the shared float at two instants and compare actual screen movement.
    await page.locator('[data-island="0"]').click();
    const alignment = await page.evaluate(() => {
      const island = document.querySelector('.world-island');
      const animation = island.getAnimations()[0]; animation.pause();
      const nodes = [document.querySelector('.world-ground'), document.querySelector('.world-props'), document.querySelector('.map-checkpoint'), document.querySelector('.world-traveler')];
      const positions = () => nodes.map(n => n.getScreenCTM().f);
      animation.currentTime = 0; const start = positions();
      animation.currentTime = animation.effect.getTiming().duration / 2; const peak = positions();
      animation.play();
      return peak.map((v, i) => v - start[i]);
    });
    assert.ok(Math.abs(alignment[0]) > 1);
    assert.ok(alignment.every(y => Math.abs(y - alignment[0]) < .01));
    // Mouse hit testing on the moving checkpoint (no forced click) and keyboard activation.
    const box = await page.locator('.map-checkpoint').nth(3).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.locator('#info-dialog').waitFor({state:'visible'});
    assert.match(await page.locator('#dialog-content').innerText(), /150 XP/);
    await page.keyboard.press('Escape');
    await page.locator('.map-checkpoint').nth(2).focus(); await page.keyboard.press('Enter');
    assert.match(await page.locator('#dialog-content').innerText(), /100 XP/); await page.keyboard.press('Escape');
    await page.locator('.map-checkpoint').nth(1).focus(); await page.keyboard.press('Space');
    assert.match(await page.locator('#dialog-content').innerText(), /50 XP/); await page.keyboard.press('Escape');
    console.log('PASS shared screen displacement and moving hit targets; keyboard Enter/Space still open checkpoints');

    await page.locator('.map-motion-toggle').click();
    const animationsPaused = () => page.evaluate(() => [...document.querySelectorAll('#map-art *')].every(n => getComputedStyle(n).animationName === 'none' || getComputedStyle(n).animationPlayState === 'paused'));
    assert.ok(await animationsPaused());
    await page.reload();
    assert.equal(await page.locator('.journey-map').getAttribute('data-life-state'), 'paused');
    assert.ok(await animationsPaused());
    await page.locator('.map-motion-toggle').click();
    await page.locator('#map-art').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'running');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
    const sample = async () => {
      const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name,m.value]));
      const before = await read(); await page.waitForTimeout(2000); const after = await read();
      return Object.fromEntries(['TaskDuration','ScriptDuration','LayoutCount','RecalcStyleCount'].map(k => [k,after[k]-before[k]]));
    };
    // A controlled browser comparison, not a claim about real low-end hardware.
    const running = await sample();
    await page.locator('.map-motion-toggle').click();
    const pausedMetrics = await sample();
    await page.locator('.map-motion-toggle').click();
    await cdp.send('Emulation.setCPUThrottlingRate', {rate:1});
    fs.writeFileSync('/tmp/missao-islands/performance.json', JSON.stringify({windowSeconds:2,cpuThrottle:4,running,paused:pausedMetrics},null,2));
    assert.equal(running.LayoutCount, 0, 'Decorative animation must not recalculate layout');
    console.log('PASS no layout recalculation during animation; 4x CPU throttling measurements', {running,paused:pausedMetrics});
    await page.locator('.side-nav [data-page="aprendizagem"]').click();
    await page.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'hidden');
    assert.ok(await animationsPaused());
    await page.locator('.side-nav [data-page="inicio"]').click();
    await page.locator('#map-art').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'running');
    await page.setViewportSize({width:1440,height:500});
    await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight, behavior:'instant'}));
    await page.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'hidden');
    console.log('PASS pause persistence, stop on navigation and offscreen, resume on return');

    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'reduced');
    assert.ok(await page.locator('.map-motion-toggle').isDisabled());
    assert.equal(await page.evaluate(() => document.querySelector('#map-art').getAnimations({subtree:true}).length), 0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:390,height:844});
    await page.locator('#map-art').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.journey-map').getAttribute('data-life-detail'), 'compact');
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.life-secondary')].every(n => getComputedStyle(n).display === 'none')));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.journey-map').screenshot({path:'/tmp/missao-islands/garden-mobile.png'});
    await page.locator('#theme-toggle').click();
    await page.locator('#map-art').scrollIntoViewIfNeeded();
    await page.locator('.journey-map').screenshot({path:'/tmp/missao-islands/garden-dark-mobile.png'});
    console.log('PASS dynamic reduced motion disables all map animation; mobile simplifies scenery with no horizontal overflow');

    const low = await browser.newContext({viewport:{width:1440,height:1000}});
    await low.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {get:() => 2});
      Object.defineProperty(window, 'localStorage', {get(){throw new DOMException('Blocked', 'SecurityError');}});
    });
    const basic = await low.newPage(); await basic.goto(origin);
    assert.equal(await basic.locator('.journey-map').getAttribute('data-life-detail'), 'compact');
    await basic.locator('.map-motion-toggle').click();
    assert.equal(await basic.locator('.journey-map').getAttribute('data-life-state'), 'paused');
    console.log('PASS low CPU hint reduces effects; pause remains usable when storage is blocked');
    const fallback = await browser.newContext();
    await fallback.addInitScript(() => { delete window.IntersectionObserver; });
    const legacy = await fallback.newPage(); await legacy.goto(origin);
    await legacy.locator('.side-nav [data-page="aprendizagem"]').click();
    await legacy.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'hidden');
    await legacy.locator('.side-nav [data-page="inicio"]').click();
    await legacy.waitForFunction(() => document.querySelector('.journey-map').dataset.lifeState === 'running');
    console.log('PASS browsers without IntersectionObserver stop and resume on page navigation');
    assert.deepEqual(errors, []);
    console.log('PASS no uncaught browser errors. Screenshots: /tmp/missao-islands/');
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
