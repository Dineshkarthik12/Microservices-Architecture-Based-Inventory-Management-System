const express = require('express');
const nodemailer = require('nodemailer');
const { z } = require('zod');

// Config
const SMTP_HOST = process.env.SMTP_HOST || 'mailhog';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);
const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.com';
const PORT = 8000;

// App setup
const app = express();
app.use(express.json());

// Transporter
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: SMTP_USERNAME && SMTP_PASSWORD ? {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD
    } : undefined
});

// Schemas
const sendEmailSchema = z.object({
    email: z.string().email(),
    subject: z.string(),
    message: z.string()
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/send-email', async (req, res) => {
    try {
        const payload = sendEmailSchema.parse(req.body);
        
        // Send asynchronously to mimic BackgroundTasks
        transporter.sendMail({
            from: SMTP_FROM,
            to: payload.email,
            subject: payload.subject,
            text: payload.message
        }).catch(err => console.error('Failed to send email:', err));

        res.json({ queued: true });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(422).json({ detail: e.errors });
        res.status(500).json({ detail: "Internal Server Error" });
    }
});

// Initialize
app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
