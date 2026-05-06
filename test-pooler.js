(async () => {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/wwjpdszkmtnzshbulkon/pgbouncer`, {
      headers: { "Authorization": `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` }
    });
    const data = await res.json();
    console.log("Pooler Config:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
})();
