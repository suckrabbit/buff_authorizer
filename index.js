const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const axios = require('axios');
const { cv, cvTranslateError } = require('opencv-wasm');
const Jimp = require('jimp');

function getBase64(url) {
  return axios
    .get(url, {
      responseType: 'arraybuffer',
    })
    .then((response) => Buffer.from(response.data, 'binary').toString('base64'));
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

  const [yidun_bg_img] = await loginFrame.$$eval('.yidun_bg-img', (el) => el.map((x) => x.getAttribute('src')));
  const [yidun_jigsaw] = await loginFrame.$$eval('.yidun_jigsaw', (el) => el.map((x) => x.getAttribute('src')));
  const captcha = await getBase64(yidun_bg_img);
  const jigsaw = await getBase64(yidun_jigsaw);
  await fs.writeFile('./captcha.png', captcha, 'base64');
  await fs.writeFile('./jigsaw.png', jigsaw, 'base64');
  try {
    const imageSource = await Jimp.read(Buffer.from(captcha, 'base64'));
    const imageTemplate = await Jimp.read(Buffer.from(jigsaw, 'base64'));
    const src = cv.matFromImageData(imageSource.bitmap);
    const templ = cv.matFromImageData(imageTemplate.bitmap);
    const processedImage = new cv.Mat();
    const mask = new cv.Mat();

    cv.matchTemplate(src, templ, processedImage, cv.TM_CCOEFF_NORMED, mask);
    cv.threshold(processedImage, processedImage, 0.999, 1, cv.THRESH_BINARY);
    processedImage.convertTo(processedImage, cv.CV_8UC1);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    cv.findContours(processedImage, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contours.size(); ++i) {
      const countour = contours.get(i).data32S; // Contains the points
      const x = countour[0];
      const y = countour[1];

      const color = new cv.Scalar(0, 255, 0, 255);
      const pointA = new cv.Point(x, y);
      const pointB = new cv.Point(x + templ.cols, y + templ.rows);
      cv.rectangle(src, pointA, pointB, color, 2, cv.LINE_8, 0);
    }

    new Jimp({
      width: src.cols,
      height: src.rows,
      data: Buffer.from(src.data),
    })
      .write(`${__dirname}/test-output/template-matching.png`);
  } catch (err) {
    // console.log(cvTranslateError(cv, err));
  }
  await page.screenshot({ path: 'example.png' });

  await browser.close();
})();
