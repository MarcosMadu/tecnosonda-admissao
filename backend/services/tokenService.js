const { customAlphabet } = require('nanoid');

// Alfabeto sem caracteres ambíguos (sem 0, O, I, l, 1)
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const nanoid = customAlphabet(alphabet, 8);

const generateAccessToken = () => nanoid();

module.exports = { generateAccessToken };
