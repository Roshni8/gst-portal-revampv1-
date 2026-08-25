import bcrypt from "bcryptjs";

const [, , rawUsername, password] = process.argv;
const username = rawUsername?.trim().toLowerCase();
const usernamePattern = /^[a-z0-9._-]{3,32}$/;
const strongPassword = password && password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

if (!username || !usernamePattern.test(username)) {
  console.error("Username must be 3–32 lowercase letters, digits, dots, underscores, or hyphens.");
  process.exit(1);
}
if (!strongPassword) {
  console.error("Password must be at least 12 characters with uppercase, lowercase, a number, and a special character.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
const escapedUsername = username.replaceAll("'", "''");
const escapedHash = passwordHash.replaceAll("'", "''");
console.log(`insert into public.users (username, password_hash) values ('${escapedUsername}', '${escapedHash}');`);
