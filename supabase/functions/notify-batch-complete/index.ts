
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@nali.org'

serve(async (req) => {
    try {
        const { record, old_record, type } = await req.json()

        // We only care about updates where pending_review_count hits 0 from something higher
        if (type !== 'UPDATE') return new Response('Not an update', { status: 200 })

        const newCount = record.pending_review_count
        const oldCount = old_record.pending_review_count

        if (newCount === 0 && oldCount > 0) {
            console.log(`🎯 Batch completed for user: ${record.id}`)

            // Fetch user email from auth.users (requires service role / admin access)
            // Note: Edge functions have access to the service role key usually
            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            const supabase = createClient(supabaseUrl, supabaseServiceKey)

            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(record.id)

            if (userError || !userData.user?.email) {
                throw new Error(`Could not find email for user ${record.id}`)
            }

            const contributorEmail = userData.user.email

            // Send Emails via Resend
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'Nali Studio <notifications@nali.org>',
                    to: [ADMIN_EMAIL, contributorEmail],
                    subject: '🎉 Batch Completed!',
                    html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: #4e3629;">Batch Completed!</h1>
              <p>Hi there,</p>
              <p>The contributor <strong>${contributorEmail}</strong> has just finished reviewing all their assigned names in the Studio.</p>
              <p>Total pending names is now <strong>0</strong>.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #888;">Nali African Names Project - Automated Notification</p>
            </div>
          `,
                }),
            })

            const resData = await res.json()
            console.log('Resend Response:', resData)

            return new Response(JSON.stringify({ message: 'Notifications sent' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response('No notification needed', { status: 200 })
    } catch (error) {
        console.error('Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
