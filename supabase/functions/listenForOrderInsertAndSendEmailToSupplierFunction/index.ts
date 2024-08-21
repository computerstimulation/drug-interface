const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

console.log('Resend API Key:', RESEND_API_KEY);

const handler = async (request: Request): Promise<Response> => {

  //if request is post
  if (request.method === 'POST') {

    const webhookPayload = await request.json();  // Parse the incoming webhook payload
    console.log('webhook Payload:', JSON.stringify(webhookPayload, null, 2));

    //convert webhook.Payload.record.order_items_column to string
    // Assuming order_items_column is an array of objects
    const items = webhookPayload.record.order_items_column.map((item: any) => {

      // Format each item as a string, e.g., "Product Name: 2 x $10.00"
      return `Product: ${item.name}, Quantity: ${item.quantity}`;
    }).join('<br>');  // Join the items with line breaks for readability

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'pharmology@premedia.pro',
        to: 'khabirhadi9@gmail.com',
        subject: 'New Order',
        html: `
          <html>
            <body>
              <h1>New Order Received</h1>
              <p>Dear Supplier,</p>
              <p>We are pleased to inform you that you have received a new order. Please find the details of the order below:</p>
              <p><strong>Order Details:</strong></p>
              <div>${items}</div>
              <p>Thank you for your prompt attention to this order.</p>
              <p>Best regards,<br>Pharmology</p>
            </body>
          </html>
      `,
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
}

Deno.serve(handler)
