import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { handleWebhook } from '../controllers/WhatsApp.Controller.js';
import User from '../models/User.Model.js';

const phoneArg = process.argv[2] || '6354088391';
const messageText = process.argv[3] || 'help';

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        console.log(`\nSimulating WhatsApp message:`);
        console.log(`From Phone : ${phoneArg}`);
        console.log(`Message    : "${messageText}"`);

        // Check if employee exists in DB
        const user = await User.findOne({
            phone: { $regex: new RegExp(phoneArg.slice(-10) + '$') },
            role: { $in: ['Employee', 'employee', 'Manager', 'Admin'] }
        });

        if (!user) {
            console.warn(`WARNING: No employee found with phone ending in ${phoneArg.slice(-10)}`);
        } else {
            console.log(`Found Employee: ${user.name} (Role: ${user.role}, ID: ${user.employeeId || user._id})`);
        }

        // Construct mock Meta webhook payload
        const mockReq = {
            body: {
                object: 'whatsapp_business_account',
                entry: [
                    {
                        id: process.env.WHATSAPP_PHONE_NUMBER_ID,
                        changes: [
                            {
                                field: 'messages',
                                value: {
                                    messaging_product: 'whatsapp',
                                    metadata: {
                                        display_phone_number: process.env.WHATSAPP_BOT_NUMBER || '917567794979',
                                        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
                                    },
                                    contacts: [
                                        {
                                            profile: { name: user?.name || 'Test User' },
                                            wa_id: phoneArg.startsWith('91') ? phoneArg : `91${phoneArg}`
                                        }
                                    ],
                                    messages: [
                                        {
                                            from: phoneArg.startsWith('91') ? phoneArg : `91${phoneArg}`,
                                            id: `wamid.test_${Date.now()}`,
                                            timestamp: Math.floor(Date.now() / 1000).toString(),
                                            type: 'text',
                                            text: { body: messageText }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        };

        const mockRes = {
            sendStatus: (code) => {
                console.log(`Meta Webhook ACK status: ${code}`);
            }
        };

        console.log('\nExecuting handleWebhook...');
        await handleWebhook(mockReq, mockRes);

        // Wait 2 seconds for any async sends to complete
        await new Promise(r => setTimeout(r, 2000));
        console.log('\nSimulation completed.');
        process.exit(0);
    } catch (err) {
        console.error('Simulation error:', err);
        process.exit(1);
    }
}

run();
