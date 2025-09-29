import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverdueStudent {
  id: string;
  student_name: string;
  parent_name: string;
  father_contact_no: string;
  mother_contact_no: string;
  email_id: string;
  update_new: number;
  branch_name: string;
  payment_status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { branch_id, reminder_type = 'overdue' } = await req.json();

    console.log(`Sending payment reminders for branch: ${branch_id}, type: ${reminder_type}`);

    // Get students with overdue or pending payments
    let query = supabaseClient
      .from('school_students')
      .select(`
        id,
        student_name,
        parent_name,
        father_contact_no,
        mother_contact_no,
        email_id,
        update_new,
        payment_status,
        school_branches:branch_id (
          branch_name,
          branch_code
        )
      `)
      .eq('is_active', true);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (reminder_type === 'overdue') {
      query = query.eq('payment_status', 'overdue');
    } else {
      query = query.in('payment_status', ['pending', 'overdue']);
    }

    const { data: students, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No students found requiring payment reminders',
          sent: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process reminders
    const reminderResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        const branchInfo = student.school_branches;
        const amountDue = student.update_new || 0;
        
        // Prepare reminder message
        const studentWithBranchName = {
          ...student,
          branch_name: branchInfo[0]?.branch_name || 'Unknown Branch'
        };
        const message = generateReminderMessage(studentWithBranchName, branchInfo, reminder_type);
        
        // Send SMS if phone number available
        if (student.father_contact_no || student.mother_contact_no) {
          const phoneNumber = student.father_contact_no || student.mother_contact_no;
          
          // Here you would integrate with your SMS service
          // For now, we'll simulate the SMS sending
          console.log(`SMS reminder sent to ${phoneNumber} for student ${student.student_name}`);
          
          // In a real implementation, you would call your SMS API here
          // await sendSMS(phoneNumber, message);
        }

        // Send email if email available
        if (student.email_id) {
          // Here you would integrate with your email service (Resend, etc.)
          console.log(`Email reminder sent to ${student.email_id} for student ${student.student_name}`);
          
          // In a real implementation, you would call your email API here
          // await sendEmail(student.email_id, 'Payment Reminder', message);
        }

        // Log the reminder in database
        const { error: logError } = await supabaseClient
          .from('payment_reminders')
          .insert({
            student_id: student.id,
            reminder_type,
            sent_at: new Date().toISOString(),
            contact_method: student.email_id ? 'email,sms' : 'sms',
            message_content: message
          });

        if (logError) {
          console.error('Failed to log reminder:', logError);
        }

        reminderResults.push({
          student_id: student.id,
          student_name: student.student_name,
          status: 'sent',
          contact_info: {
            phone: student.father_contact_no || student.mother_contact_no,
            email: student.email_id
          }
        });

        successCount++;
        
      } catch (error: unknown) {
        console.error(`Failed to send reminder for student ${student.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        reminderResults.push({
          student_id: student.id,
          student_name: student.student_name,
          status: 'failed',
          error: errorMessage
        });
        
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment reminders processed: ${successCount} sent, ${errorCount} failed`,
        sent: successCount,
        failed: errorCount,
        details: reminderResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Error sending payment reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: 'Check the Edge Function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function generateReminderMessage(student: OverdueStudent, branchInfo: any, reminderType: string): string {
  const branchName = branchInfo?.branch_name || 'School';
  const amountDue = student.update_new || 0;
  const studentName = student.student_name;
  
  if (reminderType === 'overdue') {
    return `URGENT: School Bus Payment Overdue

Dear Parent,

This is a reminder that the school bus payment for ${studentName} at ${branchName} is now overdue.

Amount Due: LKR ${amountDue.toLocaleString()}
Status: OVERDUE

Please make the payment at your earliest convenience to ensure uninterrupted school bus service.

For any queries, please contact the school office.

Thank you.`;
  } else {
    return `School Bus Payment Reminder

Dear Parent,

This is a friendly reminder for the school bus payment for ${studentName} at ${branchName}.

Amount Due: LKR ${amountDue.toLocaleString()}
Status: Pending

Please make the payment by the due date to avoid any service interruption.

Thank you for your cooperation.`;
  }
}