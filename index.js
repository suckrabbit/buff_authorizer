const puppeteer = require('puppeteer');
const axios = require('axios');

const captchaSolver = require('./captchaSolver');

function getBuffer(url) {
  return axios
    .get(url, {
      responseType: 'arraybuffer',
    })
    .then((response) => Buffer.from(response.data, 'binary'));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
  });
  const page = await browser.newPage();
  await page.goto('https://buff.163.com/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('[onclick="loginModule.showLogin()"]');
  await page.click('[onclick="loginModule.showLogin()"]');
  await page.waitForSelector('iframe', { timeout: 5000 });
  const loginHandle = await page.$('.login-frame iframe');
  const loginFrame = await loginHandle.contentFrame();
  await loginFrame.waitForSelector('.yidun_control');
  await loginFrame.hover('.yidun_control');
  await page.waitForTimeout(3000);
  await loginFrame.waitForSelector('.yidun_bg-img', { timeout: 5000 });
  await loginFrame.waitForSelector('.yidun_jigsaw', { timeout: 5000 });

  const captchaBypass = async () => {
    try {
      const [yidun_bg_img] = await loginFrame.$$eval('.yidun_bg-img', (el) => el.map((x) => x.getAttribute('src')));
      const [yidun_jigsaw] = await loginFrame.$$eval('.yidun_jigsaw', (el) => el.map((x) => x.getAttribute('src')));
      const captcha = await getBuffer(yidun_bg_img);
      const jigsaw = await getBuffer(yidun_jigsaw);
      const sliderHandle = await loginFrame.$('.yidun_control .yidun_slider');
      const handle = await sliderHandle.boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      const { x } = await captchaSolver(captcha, jigsaw);
      await page.mouse.move(
        handle.x + x + handle.width / 3,
        handle.y + handle.height / 2,
        { steps: 10 },
      );
      await page.mouse.up();
      await loginFrame.waitForSelector('.yidun--success', { timeout: 2000 });
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log('try again');
      await captchaBypass();
    }
  };
  await captchaBypass();
  await page.screenshot({ path: 'example.png' });

  await browser.close();
})();
