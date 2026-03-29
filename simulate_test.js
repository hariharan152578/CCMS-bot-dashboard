const fetch = require('node-fetch');

async function simulateWebhook(phone, text, type = 'text') {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "15550000000", phone_number_id: "123456789" },
              contacts: [{ profile: { name: "Test Citizen" }, wa_id: phone }],
              messages: [{
                from: phone,
                id: "wamid.HBgLOTE5ODc2NTQzMjEwFQIAEhgUM0EBQ0VGMTEzMTdBQ0M5OEVGQkEA",
                timestamp: Math.floor(Date.now() / 1000),
                type: type,
                text: type === 'text' ? { body: text } : undefined,
                location: type === 'location' ? { latitude: 12.9716, longitude: 77.5946, address: "Test Location, Bangalore" } : undefined
              }]
            },
            field: "messages"
          }
        ]
      }
    ]
  };

  console.log(`\n[Test] Sending "${text || type}" from ${phone}...`);
  const res = await fetch('http://localhost:3000/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`[Response] Status: ${res.status}`);
}

async function runTest() {
  const testPhone = "919876543210";
  
  // Step 1: Greeting
  await simulateWebhook(testPhone, "hi");
  
  // Step 2: Language Selection (English)
  await simulateWebhook(testPhone, "1");
  
  // Step 3: Registration Name
  await simulateWebhook(testPhone, "John Doe");
  
  // Step 4: Registration Address
  await simulateWebhook(testPhone, "123 Main St, Velachery");
  
  // Step 5: Pin Code
  await simulateWebhook(testPhone, "600042");

  // Step 6: Mode Selection (Complaint)
  await simulateWebhook(testPhone, "1");

  // Step 7: Category Selection (Water)
  await simulateWebhook(testPhone, "1");

  // Step 8: Description
  await simulateWebhook(testPhone, "There is a massive water leak in front of the post office.");

  // Step 9: Location (Simulating location message)
  await simulateWebhook(testPhone, null, 'location');

  // Step 10: File Upload (Typing "skip" to test the robust finalization)
  await simulateWebhook(testPhone, "skip");

  console.log("\n✅ Test sequence complete. Check the server logs for 🔥 SAVING COMPLAINT!");
}

runTest();
