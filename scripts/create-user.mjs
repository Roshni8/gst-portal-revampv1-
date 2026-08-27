const [, , rawUsername, password, rawRole = "admin"] = process.argv;
const username = rawUsername?.trim().toLowerCase();
const usernamePattern = /^[a-z0-9._-]{3,32}$/;
const strongPassword = password && password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!username || !usernamePattern.test(username)) {
  console.error("Username must be 3-32 lowercase letters, digits, dots, underscores, or hyphens.");
  process.exit(1);
}
if (!strongPassword) {
  console.error("Password must be at least 12 characters with uppercase, lowercase, a number, and a special character.");
  process.exit(1);
}
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email: `${username}@gstprototype.test`, password, email_confirm: true, user_metadata: { role: rawRole, username } }),
});

if (!response.ok) {
  console.error("Unable to create the Supabase Auth user.");
  process.exit(1);
}

console.log(`Demo account created for ${username}.`);
