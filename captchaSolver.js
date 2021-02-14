const { cv, cvTranslateError } = require('opencv-wasm');
const Jimp = require('jimp');

module.exports = async (captcha, jigsaw) => {
  try {
    const imageSource = await Jimp.read(Buffer.from(captcha, 'base64'));
    const imageTemplate = await Jimp.read(Buffer.from(jigsaw, 'base64'));
    const src = cv.matFromImageData(imageSource.bitmap);
    const templ = cv.matFromImageData(imageTemplate.bitmap);
    const dst = new cv.Mat();
    const mask = new cv.Mat();
    cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF, mask);
    const result = cv.minMaxLoc(dst, mask);
    const maxPoint = result.maxLoc;
    return maxPoint;
  } catch (err) {
    console.log(cvTranslateError(cv, err));
    return Promise.reject();
  }
};
