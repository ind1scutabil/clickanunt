import validator from 'validator';

const email = 'daniel.enoiu29@gmail.com';
console.log('Original:', email);
const normalized = validator.normalizeEmail(email);
console.log('Normalized:', normalized);
console.log('Are equal:', email === normalized);
