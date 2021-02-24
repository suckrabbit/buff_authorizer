const { cv, cvTranslateError } = require('opencv-wasm');
const Jimp = require('jimp');

module.exports = async (captcha, jigsaw) => {
  try {
    const imageSource = await Jimp.read(captcha);
    const imageTemplate = await Jimp.read(jigsaw);
    const src = cv.matFromImageData(imageSource.bitmap);
    const templ = cv.matFromImageData(imageTemplate.bitmap);
    const dst = new cv.Mat();
    const mask = new cv.Mat();
    cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF, mask);
    const result = cv.minMaxLoc(dst, mask);
    const maxPoint = result.maxLoc;
    return maxPoint;
  } catch (err) {
    return Promise.reject(cvTranslateError(cv, err));
  }
};
