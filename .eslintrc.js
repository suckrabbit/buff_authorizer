const { resolve } = require('path');

module.exports = {
  extends: [
    'eslint:recommended',
    'airbnb-base',
  ],
  rules: {
    'no-underscore-dangle': 'off',
    'global-require': 'off',
    camelcase: 'off',
  },
};
