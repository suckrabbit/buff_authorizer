require('dotenv').config();
const axios = require('axios');

const api_key = process.env.API_KEY;

const base_url = 'https://sms-activate.ru/stubs/handler_api.php';

function getBalance() {
  return axios.get(`${base_url}?api_key=${api_key}&action=getBalance`)
    .then(({ data }) => data);
}

function getPrices() {
  return axios.get(`${base_url}?api_key=${api_key}&action=getPrices&service=ot&country=0`)
    .then(({ data }) => data);
}

const getNumber = async () => {
  try {
    const res = await axios.get(`${base_url}?api_key=${api_key}&action=getNumber&service=ot&country=0`)
      .then(({ data }) => data);
    const [key, id, value] = res.split(':');
    if (key === 'ACCESS_NUMBER') {
      return [null, { value, id }];
    }
    return [res];
  } catch (error) {
    return [error];
  }
};

const getFullSms = (id) => axios.get(`${base_url}?api_key=${api_key}&action=getFullSms&id=${id}`)
  .then(({ data }) => {
    console.log('sms:', data);
    const [key, value] = data.split(':');
    if (key === 'FULL_SMS') {
      return value;
    }
    return null;
  });

const setStatus = (id, status) => axios.get(`${base_url}?api_key=${api_key}&action=setStatus&status=${status}&id=${id}`)
  .then(({ data }) => data);

// (async () => {
//   try {
//     const res = await setStatus();
//     console.log(res);
//   } catch (error) {
//     console.log(error);
//   }
// })();

module.exports = {
  getBalance,
  getFullSms,
  getNumber,
  getPrices,
  setStatus,
};
