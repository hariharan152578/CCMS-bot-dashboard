async function simulateWebhook(phone, bodyText, type = 'text') {
    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    messages: [{
                        from: phone,
                        type: type,
                        id: `wamid.${Math.random().toString(36).substring(7)}`,
                        text: type === 'text' ? { body: bodyText } : undefined,
                        location: type === 'location' ? { latitude: 12.98, longitude: 80.20, address: "Velachery Main Rd" } : undefined,
                        timestamp: Math.floor(Date.now() / 1000)
                    }]
                },
                field: "messages"
            }]
        }]
    };

    console.log(`📡 Sending [${type}] "${bodyText || ''}" from ${phone}...`);
    const res = await fetch('http://localhost:3000/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    console.log(`✅ Response: ${res.status}`);
}

async function run() {
    const phone = "919999999999"; // Test number
    
    console.log("--- 🌀 STARTING FULL FLOW TEST ---");
    
    await simulateWebhook(phone, "hi");
    await simulateWebhook(phone, "1"); // English
    await simulateWebhook(phone, "Tester Bot"); // Name
    await simulateWebhook(phone, "Ward 42"); // Ward
    await simulateWebhook(phone, "Cloud Server, Google"); // Address
    await simulateWebhook(phone, "600001"); // Pincode -> Registers & Shows Main Menu
    
    await simulateWebhook(phone, "1"); // Choose Complaint
    await simulateWebhook(phone, "1"); // Choose Water Issue
    await simulateWebhook(phone, "Massive leak near the server rack!"); // Description
    await simulateWebhook(phone, null, 'location'); // Send Location
    await simulateWebhook(phone, "done"); // Finish uploads -> Shows Summary
    
    await simulateWebhook(phone, "1"); // Confirm & Submit
    
    console.log("\n--- ✅ TEST COMPLETE. Check Firebase /complaints for new CMP ID ---");
}

run();
