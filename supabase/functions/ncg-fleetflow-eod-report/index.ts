import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Configuration
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8421992601:AAHCjyGNrrdErAqTVoqO1h_8y1U33c2y7iY'
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID') || '-5012037081'

    const now = new Date()
    // Calculate 24h ago for filtering
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayIso = yesterday.toISOString()

    // 0. Financial Overview
    const { data: arInvoices } = await supabase
      .from('ar_invoices')
      .select('total_amount, balance')
      .gte('created_at', yesterdayIso)

    let invoicesRaisedToday = 0
    let totalInvoicedAmount = 0
    if (arInvoices) {
      invoicesRaisedToday = arInvoices.length
      arInvoices.forEach(inv => {
        totalInvoicedAmount += (inv.total_amount || 0)
      })
    }

    const { data: allUnpaidInvoices } = await supabase
      .from('ar_invoices')
      .select('balance')
      .gt('balance', 0)
      .neq('status', 'paid')

    let outstandingAr = 0
    if (allUnpaidInvoices) {
      allUnpaidInvoices.forEach(inv => {
        outstandingAr += (inv.balance || 0)
      })
    }

    const { data: arReceipts } = await supabase
      .from('ar_receipts')
      .select('amount')
      .gte('created_at', yesterdayIso)

    let totalCollectedAmount = 0
    let receiptsCollectedToday = 0
    if (arReceipts) {
      receiptsCollectedToday = arReceipts.length
      arReceipts.forEach(rec => {
        totalCollectedAmount += (rec.amount || 0)
      })
    }

    // 1. Business Performance (Today/Last 24h)
    const { data: magiyaReports } = await supabase
      .from('magiya_daily_reports')
      .select('total_passengers, total_revenue_lkr')
      .gte('report_date', yesterdayIso.split('T')[0])
    
    let totalPassengers = 0
    let ticketRevenue = 0
    if (magiyaReports) {
      magiyaReports.forEach(r => {
        totalPassengers += (r.total_passengers || 0)
        ticketRevenue += (r.total_revenue_lkr || 0)
      })
    }

    const { data: trips } = await supabase
      .from('completed_trips')
      .select('distance_km, fuel_consumed_liters, fuel_efficiency_kmpl, behavior_score')
      .gte('end_time', yesterdayIso)

    let totalDistance = 0
    let tripsCompleted = 0
    let totalBehaviorScore = 0
    let tripsWithScore = 0
    let totalTripFuel = 0
    let totalFuelEfficiency = 0
    let tripsWithEfficiency = 0

    if (trips) {
      tripsCompleted = trips.length
      trips.forEach(t => {
        totalDistance += (t.distance_km || 0)
        totalTripFuel += (t.fuel_consumed_liters || 0)
        
        if (t.behavior_score != null) {
          totalBehaviorScore += t.behavior_score
          tripsWithScore++
        }

        if (t.fuel_efficiency_kmpl != null) {
          totalFuelEfficiency += t.fuel_efficiency_kmpl
          tripsWithEfficiency++
        }
      })
    }

    // 2. Sustainability & Fuel
    const { data: fuelLogs } = await supabase
      .from('fuel_consumption_logs')
      .select('fuel_filled_liters, fuel_cost')
      .gte('log_date', yesterdayIso.split('T')[0])

    let totalFuelConsumed = totalTripFuel
    let totalFuelCost = 0
    if (fuelLogs) {
      fuelLogs.forEach(f => {
        totalFuelCost += (f.fuel_cost || 0)
        // If you want to use dispensed fuel instead of trip fuel:
        // totalFuelConsumed += (f.fuel_filled_liters || 0) 
      })
    }
    
    const avgFleetEfficiency = tripsWithEfficiency > 0 
      ? (totalFuelEfficiency / tripsWithEfficiency).toFixed(1) 
      : 'N/A'

    // 3. Safety & Operations
    const avgBehaviorScore = tripsWithScore > 0 
      ? Math.round(totalBehaviorScore / tripsWithScore) 
      : 'N/A'

    const { count: accidentsCount } = await supabase
      .from('accident_records')
      .select('id', { count: 'exact', head: true })
      .gte('accident_date', yesterdayIso.split('T')[0])

    const { count: busesInMaintenance } = await supabase
      .from('maintenance_records')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress'])
      .not('bus_id', 'is', null)

    // Format the message
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Colombo'
    }).format(now)

    const message = `🚌 NCG Fleetflow — End of Day Report
📅 ${formattedDate}

💰 Financial Overview
🧾 Invoices Raised (24h): ${invoicesRaisedToday} (LKR ${totalInvoicedAmount.toLocaleString()})
✅ Payments Collected (24h): ${receiptsCollectedToday} (LKR ${totalCollectedAmount.toLocaleString()})
🔴 Outstanding AR: LKR ${outstandingAr.toLocaleString()}

📈 Operations (Today)
🎫 Passengers Transported: ${totalPassengers.toLocaleString()}
💰 Daily Ticket Revenue: LKR ${ticketRevenue.toLocaleString()}
🛣️ Total Fleet Distance: ${totalDistance.toLocaleString()} km
🚌 Trips Completed: ${tripsCompleted}

🌱 Sustainability & Fuel (Today)
⛽ Total Fuel Consumed: ${Math.round(totalFuelConsumed).toLocaleString()} Liters
💵 Total Fuel Cost: LKR ${totalFuelCost.toLocaleString()}
📊 Fleet Efficiency: ${avgFleetEfficiency} km/l

🛡️ Safety & Fleet Health
🌟 Average Driver Behavior Score: ${avgBehaviorScore}/100
🚨 New Accidents/Incidents: ${accidentsCount || 0}
🔧 Buses Currently in Maintenance: ${busesInMaintenance || 0}`

    // Send to Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
    
    const tgResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
      }),
    })

    if (!tgResponse.ok) {
      const tgError = await tgResponse.text()
      console.error('Telegram API error:', tgError)
      throw new Error(`Failed to send Telegram message: ${tgError}`)
    }

    return new Response(JSON.stringify({ success: true, message: 'Report sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
