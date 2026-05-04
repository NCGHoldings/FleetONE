const url = 'https://wwjpdszkmtnzshbulkon.supabase.co/rest/v1/buses?select=id,bus_no&bus_no=ilike.*NE*2521*';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4';

fetch(url, {
  headers: {
    'apikey': anonKey,
    'Authorization': 'Bearer ' + anonKey
  }
}).then(res => res.json()).then(data => console.log('Buses:', data));
