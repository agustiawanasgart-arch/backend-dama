import bcrypt from 'bcryptjs';

(async () => {
  const password = '123456';
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(hash);
})();
