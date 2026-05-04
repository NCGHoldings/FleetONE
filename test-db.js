const url = process.env.DATABASE_URL || "postgresql://postgres:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const parsed = new URL(url);
console.log("Protocol:", parsed.protocol);
console.log("Username:", parsed.username);
console.log("Host:", parsed.host);
console.log("Port:", parsed.port);
console.log("Path:", parsed.pathname);
