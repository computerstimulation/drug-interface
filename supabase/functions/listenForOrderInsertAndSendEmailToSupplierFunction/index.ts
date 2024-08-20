const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

console.log('Resend API Key:', RESEND_API_KEY);

const handler = async (request: Request): Promise<Response> => {
  const supabasePayload = await request.json();  // Parse the incoming webhook payload
  console.log('Supabase Payload:', supabasePayload);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'onboarding@llllll.dev',
      to: 'polymathhero@outlook.com',
      subject: 'order',
      html: '<strong>it works!</strong>',
    }),
  })

  const data = await res.json()

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(handler)
