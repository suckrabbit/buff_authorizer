/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');

const captchaSolver = require('./captchaSolver');
const sms_activate = require('./sms_activate');

function getBuffer(url) {
  return axios
    .get(url, {
      responseType: 'arraybuffer',
    })
    .then((response) => Buffer.from(response.data, 'binary'));
}

module.exports = async () => {
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
        handle.x + (x >= 10 ? x : 100) + handle.width / 2.5,
        handle.y + handle.height / 2,
        { steps: 10 },
      );
      await page.mouse.up();
      await loginFrame.waitForSelector('.yidun--success', { timeout: 2000 });
    } catch (error) {
      await captchaBypass();
    }
  };
  await captchaBypass();
  const [err, number] = await sms_activate.getNumber();
  if (err) {
    await browser.close();
    return { error: err };
  }
  await loginFrame.click('.u-input .country');
  await loginFrame.waitForSelector('.flag-RU', { timeout: 2000 });
  await loginFrame.click('.u-input .flag-RU');

  await page.click('.login-cont [id="agree-checkbox"] i');
  await loginFrame.$eval('.u-input input', (el, value) => el.value = value, number.value.substring(1)); // number
  const getCode = async (refetch) => {
    if (refetch) return null;
    await loginFrame.click('.pcbtn.f-fl');
    await page.waitForTimeout(3000);
    await sms_activate.setStatus(number.id, 1);
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const sms = await sms_activate.getFullSms(number.id);
        if (sms) {
          // eslint-disable-next-line no-use-before-define
          clearInterval(timeout);
          clearInterval(interval);
          const re = /\d{3,6}/i;
          const code = sms.match(re);
          if (!code) {
            await getCode(true);
          }
          resolve(code[0]);
        }
      }, 5000);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        resolve(null);
      }, 60000);
    });
  };
  const code = await getCode();
  sms_activate.setStatus(number.id, 8);
  if (!code) {
    await browser.close();
    return { error: 'cant get sms code' };
  }
  await loginFrame.$eval('input[name="phonecode"]', (el, value) => el.value = value, code); // code
  await loginFrame.click('.f-cb.loginbox .u-loginbtn');
  await page.waitForTimeout(3000);
  try {
    await page.waitForSelector('.popup.popup_login .i_Btn.i_Btn_hollow', { timeout: 2000 });
    await page.click('.popup.popup_login .i_Btn.i_Btn_hollow');
  } catch (error) {
    console.log('the first block is missing');
  }
  await page.waitForSelector('.popup.popup_guide', { timeout: 2000 });
  await page.click('.popup.popup_guide a');
  await page.waitForTimeout(3000);
  const cookies = await page.cookies();
  await browser.close();
  return { cookies };
};
