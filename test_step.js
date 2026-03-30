async function testStep(phone, text) {
    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    messages: [{
                        from: phone,
                        type: "text",
                        text: { body: text },
                        timestamp: Math.floor(Date.now() / 1000)
                    }]
                },
                field: "messages"
            }]
        }]
    };

    console.log(`📡 Testing Step: "${text}" from ${phone}`);
    const res = await fetch('http://localhost:3000/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const respText = await res.text();
    console.log(`✅ Webhook Response: [${res.status}] ${respText}`);
}

testStep("918870295336", "1");
