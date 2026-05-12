(async () => {
  try {
    const projectRef = process.env.SUPABASE_PROJECT_REF || "wwjpdszkmtnzshbulkon";
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/pgbouncer`, {
      headers: { "Authorization": `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP Error ${res.status}: ${errorText}`);
    }
    const data = await res.json();
    console.log("Pooler Config:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
