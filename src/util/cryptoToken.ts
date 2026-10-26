import crypto from 'crypto';

const cryptoToken = (limit: number=32) => {
  return crypto.randomBytes(limit).toString('hex');
};

export default cryptoToken;
