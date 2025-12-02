import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import webPush, { SendResult } from 'web-push';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '../.env' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure web-push
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  throw new Error('VAPID keys are not defined in environment variables');
}

webPush.setVapidDetails(
  'mailto:your-email@example.com',
  publicVapidKey,
  privateVapidKey
);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// API Endpoint to send push notifications
app.post('/notifications/send', async (req: Request, res: Response) => {
  try {
    const { subscription, title, body, data = {} } = req.body;

    if (!subscription || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data,
    });

    await webPush.sendNotification(subscription, payload);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    const webPushError = error as webPush.WebPushError;
    if (webPushError.statusCode === 404 || webPushError.statusCode === 410) {
      // Remove invalid subscription from database
      if (webPushError.endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription->>endpoint', webPushError.endpoint);
      }
    }
    
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
