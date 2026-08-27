const [, , rawEmail, password, rawRole = "admin"] = process.argv;
const email = rawEmail?.trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = password && password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !emailPattern.test(email)) {
  console.error("Provide a valid email address.");
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
  body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: rawRole } }),
});

if (!response.ok) {
  console.error("Unable to create the Supabase Auth user.");
  process.exit(1);
}

console.log(`Demo account created for ${email}.`);
