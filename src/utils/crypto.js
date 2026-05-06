import CryptoJS from 'crypto-js';

// Use a secret key - in production, this should be from environment variables
const SECRET_KEY = import.meta.env.VITE_CRYPTO_KEY || 'default-secret-key-change-in-prod';

export const encrypt = (text) => {
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

export const decrypt = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};