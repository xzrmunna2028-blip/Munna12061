export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || phone.trim() === '') return '017123*****';
  let clean = phone.trim();
  if (clean.startsWith('+88')) {
    clean = clean.slice(3);
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length <= 6) {
    return digits.padEnd(11, '*');
  }
  const visible = digits.slice(0, 6);
  const asterisks = '*'.repeat(Math.max(5, digits.length - 6));
  return `${visible}${asterisks}`;
}

export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return 'xzrm***@gmail.com';
  const [name, domain] = email.split('@');
  if (name.length <= 3) {
    return `${name.slice(0, 2)}***@${domain}`;
  }
  const visibleLen = Math.min(4, Math.max(3, Math.floor(name.length / 2)));
  return `${name.slice(0, visibleLen)}***@${domain}`;
}
