import { createClient } from 'jsr:@supabase/supabase-js@2'

//initialize the supabase client
const supabaseUrl = 'https://oncciddxmwsqeafrugzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY2NpZGR4bXdzcWVhZnJ1Z3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMyNzgwMDcsImV4cCI6MjAzODg1NDAwN30.Q3wPkVsca--mLplPPL7dnL1qZh_pSyuYxuuLBUQ-R44';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

//console.log('Resend API Key:', RESEND_API_KEY);

const handler = async (request: Request): Promise<Response> => {

  //get the webhook payload
  const webhookPayload = await request.json();  // Parse the incoming webhook payload
  console.log('webhook Payload:', JSON.stringify(webhookPayload, null, 2));

  //get the shipping address of the order
  //query the database to get the user's address
  let { data: pharmology_user_address_table, error: pharmology_user_address_tableError } = await supabaseClient
    .from('pharmology_user_address_table')
    .select('*')
    .eq('id', webhookPayload.record.user_id_column)
    .single();

  console.log(`user address: ${JSON.stringify(pharmology_user_address_table, null, 2)}`);

  //if request is post
  if (request.method === 'POST') {

    //create suppliers object
    let suppliers = {};

    //use a for of loop to iterative over
    for (let item of webhookPayload.record.order_items_column) {
      console.log(`item: ${webhookPayload.record.order_items_column}`);

      //query the database to get the product supplier name
      let { data: pharmology_product_table, error } = await supabaseClient
        .from('pharmology_product_table')
        .select('product_supplier_column')
        .eq('id', item.id)
        .single();

      //query the database to get the supplier email address
      let { data: pharmology_supplier_profile_table, error: pharmology_supplier_profile_tableError } = await supabaseClient
        .from('pharmology_supplier_profile_table')
        .select('supplier_email_address_column')
        .eq('supplier_name_column', pharmology_product_table.product_supplier_column)
        .single();

      console.log(`product (${item.name}) supplier retrieved from database: ${JSON.stringify(pharmology_product_table, null, 2)}`);
      console.log(`supplier ${pharmology_product_table.product_supplier_column} email retrieved from database: ${JSON.stringify(pharmology_supplier_profile_table, null, 2)}`);

      //assign the email to an object in the array in the suppliers object
      item.email = pharmology_supplier_profile_table.supplier_email_address_column;
      console.log(`product email: ${item.email}`);

      //if suppliers does not have a key with the supplier name
      if (!suppliers[pharmology_product_table.product_supplier_column]) {

        //create a key in the suppliers object and assign it an empty array
        suppliers[pharmology_product_table.product_supplier_column] = [];
      }

      //push the item to the relevant supplier key in the suppliers object
      suppliers[pharmology_product_table.product_supplier_column].push(item);


      console.log('Suppliers:', suppliers);
    }

    // Prepare the batch email payload
    const emailBatch = Object.keys(suppliers).map(supplier => {
      const orderDetails = suppliers[supplier].map(item => `
            <p>Product: ${item.name}<br>
            Quantity: ${item.quantity}</p>
          `).join('');

      return {
        from: 'pharmology@premedia.pro',
        to: `${suppliers[supplier][0].email}`,
        subject: 'New Order',
        html: `
              <html>
                <body>
                  <h1>New Order Received</h1>
                  <p>Dear ${supplier},</p>
                  <p>We are pleased to inform you that you have received a new order. Please find the details of the order below:</p>
                  ${orderDetails}
                  <p>Shipping Address:<br>
                  ${pharmology_user_address_table.user_address_person_name_column}<br>
                  ${pharmology_user_address_table.user_address_business_name_column}<br>
                  ${pharmology_user_address_table.user_address_description_column}<br>
                  ${pharmology_user_address_table.user_address_city_column}<br>
                  ${pharmology_user_address_table.user_address_governorate_column}<br>
                  ${pharmology_user_address_table.user_phone_number_column.phone}</p>
                  <p>Thank you for your prompt attention to this order.</p>
                  <p>Best regards,<br>Pharmology</p>
                </body>
              </html>
            `,
      };
    });

    //for every key in the suppliers object
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBatch),
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
