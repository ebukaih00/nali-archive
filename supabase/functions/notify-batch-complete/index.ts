
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * Supabase Edge Function: notify-batch-complete
 * 
 * This function is triggered by a database webhook on the 'batch_completions' table.
 * It sends notification emails via Resend to the Admin and the Contributor.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev"

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log("Received Webhook Payload:", JSON.stringify(payload, null, 2))

        // Supabase Webhooks payload structure for INSERT:
        // { "type": "INSERT", "table": "batch_completions", "record": { ... }, "old_record": null }
        const record = payload.record || payload
        const contributorEmail = record.contributor_email

        if (!contributorEmail) {
            throw new Error("Missing contributor_email in payload")
        }

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set")
        }

        // 1. Notify Admin
        console.log(`📧 Sending notification to Admin [${ADMIN_EMAIL}]...`)
        const adminRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `Nali Studio <${FROM_EMAIL}>`,
                to: ADMIN_EMAIL,
                subject: `Batch Completed: ${contributorEmail}`,
                html: `
          <div style="font-family: sans-serif; color: #4e3629; line-height: 1.6;">
            <h2>Batch Completed 🎊</h2>
            <p>Contributor <strong>${contributorEmail}</strong> has just finished their assigned batch of names!</p>
            <p>You can now review their submissions in the Supabase Dashboard or the Contributor Studio.</p>
            <hr style="border: none; border-top: 1px solid #E9E4DE; margin: 20px 0;" />
            <p style="font-size: 0.8em; color: #8D6E63;">This is an automated notification from Nali Archive.</p>
          </div>
        `,
            }),
        })

        const adminData = await adminRes.json()
        console.log("Admin Email Result:", adminData)

        // 2. Notify Contributor
        console.log(`📧 Sending celebration to Contributor [${contributorEmail}]...`)
        const contributorRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `Nali Studio <${FROM_EMAIL}>`,
                to: contributorEmail,
                subject: "Batch Complete! 🎊🕺",
                html: `
          <div style="font-family: sans-serif; color: #4e3629; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E9E4DE; border-radius: 12px;">
            <h1 style="color: #4e3629; text-align: center;">Mission Accomplished! 🎊</h1>
            <p>Hello,</p>
            <p>You've successfully completed your assigned batch of names. Thank you for your incredible work and for helping us preserve African name pronunciations!</p>
            <p>Our team has been notified and we'll begin reviewing your contributions shortly. In the meantime, feel free to take a break or explore more names in the Archive.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://nali-archive.vercel.app/studio/library" style="background-color: #4e3629; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Return to Studio</a>
            </div>
            <hr style="border: none; border-top: 1px solid #E9E4DE; margin: 30px 0;" />
            <p style="font-size: 0.8em; color: #8D6E63; text-align: center;">With gratitude,<br/>The Nali Team</p>
          </div>
        `,
            }),
        })

        const contributorData = await contributorRes.json()
        console.log("Contributor Email Result:", contributorData)

        return new Response(JSON.stringify({
            success: true,
            admin_email_id: adminData.id,
            contributor_email_id: contributorData.id
        }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error: any) {
        console.error("Error in Edge Function:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
})
