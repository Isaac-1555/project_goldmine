import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackRequest {
  message: string
  category: string
  userEmail?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, category, userEmail }: FeedbackRequest = await req.json()

    // Validate input
    if (!message || !category) {
      return new Response(
        JSON.stringify({ error: 'Message and category are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Gmail credentials from environment/secrets
    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD')
    const feedbackEmail = Deno.env.get('FEEDBACK_EMAIL')

    if (!gmailUser || !gmailPassword || !feedbackEmail) {
      console.error('Missing email configuration')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    })

    // Prepare email content
    const timestamp = new Date().toISOString()
    const emailContent = `
Feedback Received
=================

Category: ${category}
User Email: ${userEmail || 'Not provided'}
Timestamp: ${timestamp}

Message:
--------
${message}

---
Sent from SummarEase Feedback System
    `.trim()

    // Send email
    await client.send({
      from: gmailUser,
      to: feedbackEmail,
      subject: `[SummarEase Feedback] ${category}`,
      content: emailContent,
    })

    await client.close()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Feedback sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending feedback:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send feedback', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
