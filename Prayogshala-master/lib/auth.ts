// Prototype-only credentials. No server, no database: sessions live in localStorage.
export const DEMO_ACCOUNTS = [
  {
    email: 'student@prayogshala.np',
    password: 'demo1234',
    name: 'Aarav Shrestha',
    role: 'student' as const,
    grade: 10,
    school: 'Shree Padma Secondary School, Kathmandu',
  },
  {
    email: 'teacher@prayogshala.np',
    password: 'demo1234',
    name: 'Sunita Karki',
    role: 'teacher' as const,
    grade: 12,
    school: 'Budhanilkantha School',
  },
];

export function authenticate(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find(a => a.email === normalized && a.password === password) ?? null;
}
