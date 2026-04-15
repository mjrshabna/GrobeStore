import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmail, emailTemplates } from "./src/services/server/emailService.ts";
import { uploadToDrive } from "./src/services/server/backupService.ts";
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp as initializeAdminApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import Razorpay from "razorpay";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the Firebase configuration
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Client SDK for server-side reads
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Admin SDK for deletions (bypasses rules)
let adminDb: any;
try {
  const adminApp = !getApps().length 
    ? initializeAdminApp({ projectId: firebaseConfig.projectId })
    : getApp();
  adminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  console.log('DEBUG - Admin SDK initialized for deletions');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

const logEvent = async (event: string, details: any) => {
  if (adminDb) {
    try {
      await adminDb.collection('system_logs').add({
        event,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Logging failed", e);
    }
  }
};

async function getServerSettings() {
  try {
    // Use Client SDK for settings as it works with the API Key and public rules
    // Admin SDK is hitting permission issues in this environment for named databases
    const docRef = doc(clientDb, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.use("/api/razorpay", (req, res, next) => {
    console.log(`Razorpay API Request: ${req.method} ${req.url}`);
    next();
  });

  // Test Email Route (Optional, for verification)
  app.post(["/api/test-email", "/api/test-email/"], async (req, res) => {
    try {
      const { to, type, data } = req.body;
      let html = "";
      let subject = "";

      switch (type) {
        case "abandoned":
          html = emailTemplates.abandonedCart(data.userName, data.items);
          subject = "You left something in your cart!";
          break;
        case "order":
          html = emailTemplates.orderConfirmation(data.userName, data.orderId, data.items, {
            totalMrp: data.totalMrp || data.total,
            totalDiscount: data.totalDiscount || 0,
            platformFee: data.platformFee || 0,
            shippingCharge: data.shippingCharge || 0,
            total: data.total
          });
          subject = `Order Confirmation #${data.orderId}`;
          break;
        case "status":
          html = emailTemplates.statusUpdate(data.userName, data.orderId, data.status || 'Shipped', data.paymentStatus || 'Paid');
          subject = `Update for Order #${data.orderId}`;
          break;
        case "test":
          html = emailTemplates.test(data.userName || 'User');
          subject = "Test Email from Grobe";
          break;
        default:
          return res.status(400).json({ error: "Invalid email type" });
      }

      // Fetch settings from Firestore
      const settings = await getServerSettings() as any;
      console.log('DEBUG - Raw Settings from Firestore:', settings ? 'Found' : 'Not Found');
      if (settings) {
        console.log('DEBUG - Settings keys:', Object.keys(settings));
        console.log('DEBUG - Zoho Email:', settings.zohoEmail);
        console.log('DEBUG - Zoho Pass exists:', !!settings.zohoPassword);
      }
      
      if (!settings) {
        console.warn('No admin settings found in Firestore.');
      }

      const emailConfig = settings?.zohoEmail && settings?.zohoPassword ? {
        user: settings.zohoEmail,
        pass: settings.zohoPassword
      } : undefined;

      if (!emailConfig && !process.env.SMTP_USER) {
        console.warn('Email credentials missing. Skipping email send.');
        return res.json({ success: true, warning: 'Email credentials not configured. Email skipped.' });
      }

      console.log('Email Route - To:', to);
      console.log('Email Route - Subject:', subject);
      console.log('Email Route - HTML Length:', html.length);
      console.log('Email Route - Config User:', emailConfig?.user || 'Using Env Var');
      console.log('Email Route - Config Pass exists:', !!(emailConfig?.pass || process.env.SMTP_PASS));

      await sendEmail(to, subject, html, emailConfig);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Email Route Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/emails/status-update", async (req, res) => {
    try {
      const { to, userName, orderId, status, paymentStatus } = req.body;
      
      if (!to || !orderId || !status || !paymentStatus) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const html = emailTemplates.statusUpdate(userName || 'User', orderId, status, paymentStatus);
      const subject = `Update for Order #${orderId}`;

      // Fetch settings from Firestore
      const settings = await getServerSettings() as any;
      console.log('DEBUG - Raw Settings for Status Update:', settings ? 'Found' : 'Not Found');
      
      if (!settings) {
        console.warn('No admin settings found in Firestore for status update.');
      }

      const emailConfig = settings?.zohoEmail && settings?.zohoPassword ? {
        user: settings.zohoEmail,
        pass: settings.zohoPassword
      } : undefined;

      if (!emailConfig && !process.env.SMTP_USER) {
        console.warn('Email credentials missing. Skipping status update email send.');
        return res.json({ success: true, warning: 'Email credentials not configured. Email skipped.' });
      }

      console.log('Status Update Email - To:', to);
      console.log('Status Update Email - Config User:', emailConfig?.user || 'Using Env Var');

      await sendEmail(to, subject, html, emailConfig);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Status Update Email Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/emails/notify-waitlist", async (req, res) => {
    try {
      const { productId, productName, waitlist } = req.body;
      
      if (!productId || !productName || !waitlist || !Array.isArray(waitlist)) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Fetch settings from Firestore
      const settings = await getServerSettings() as any;
      const emailConfig = settings?.zohoEmail && settings?.zohoPassword ? {
        user: settings.zohoEmail,
        pass: settings.zohoPassword
      } : undefined;

      if (!emailConfig && !process.env.SMTP_USER) {
        console.warn("Email credentials missing. Cannot send waitlist notifications.");
        return res.json({ success: true, warning: 'Email credentials not configured. Email skipped.' });
      }

      const results = [];
      for (const entry of waitlist) {
        try {
          const html = emailTemplates.restockNotification(entry.email, productName, productId);
          const subject = `Great news! ${productName} is back in stock!`;
          await sendEmail(entry.email, subject, html, emailConfig);
          
          // Delete waitlist entry from database after successful email
          if (adminDb) {
            try {
              await adminDb.collection('waitlists').doc(entry.id).delete();
              console.log(`DEBUG - Deleted waitlist entry ${entry.id} for ${entry.email}`);
            } catch (deleteError) {
              console.error(`Error deleting waitlist entry ${entry.id}:`, deleteError);
              // Fallback to client SDK if admin fails (might still fail due to rules)
              try {
                await deleteDoc(doc(clientDb, 'waitlists', entry.id));
              } catch (clientDeleteError) {
                console.error(`Client fallback delete failed for ${entry.id}:`, clientDeleteError);
              }
            }
          } else {
            // Fallback to client SDK
            await deleteDoc(doc(clientDb, 'waitlists', entry.id));
          }
          
          results.push({ email: entry.email, success: true });
        } catch (error) {
          console.error(`Failed to notify ${entry.email}:`, error);
          results.push({ email: entry.email, success: false, error });
        }
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error('Notify Waitlist Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const handleCreateOrder = async (req: any, res: any) => {
    console.log(`[RAZORPAY] Create Order Request: ${req.method} ${req.url}`);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method Not Allowed. Expected POST.", received: req.method });
    }
    try {
      const { amount, currency = "INR", receipt } = req.body;
      
      if (!amount) {
        console.error("Missing amount in create-order request body");
        return res.status(400).json({ error: "Amount is required" });
      }

      const settings = await getServerSettings() as any;
      const keyId = (settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '').trim();
      const keySecret = (settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();

      if (!keyId || !keySecret) {
        console.error("Razorpay credentials not configured on server");
        return res.status(400).json({ error: "Razorpay credentials not configured" });
      }

      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const options = {
        amount: Math.round(amount * 100), // amount in the smallest currency unit
        currency,
        receipt,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay Order Creation Error:", error);
      res.status(500).json({ error: error.message });
    }
  };

  app.all("/api/razorpay/create-order", handleCreateOrder);
  app.all("/api/razorpay/create-order/", handleCreateOrder);

  const handleVerifyPayment = async (req: any, res: any) => {
    console.log(`[RAZORPAY] Verify Payment Request: ${req.method} ${req.url}`);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method Not Allowed. Expected POST.", received: req.method });
    }
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        console.error("Missing Razorpay verification fields in request body:", req.body);
        return res.status(400).json({ verified: false, error: "Missing required verification fields" });
      }

      const settings = await getServerSettings() as any;
      const keyId = (settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '').trim();
      const keySecret = (settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();

      if (!keySecret) {
        console.error("Razorpay secret not configured on server");
        return res.status(400).json({ error: "Razorpay secret not configured" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        res.json({ verified: true });
      } else {
        res.status(400).json({ verified: false, error: "Invalid signature" });
      }
    } catch (error: any) {
      console.error("Razorpay Verification Error:", error);
      res.status(500).json({ error: error.message });
    }
  };

  app.all("/api/razorpay/verify-payment", handleVerifyPayment);
  app.all("/api/razorpay/verify-payment/", handleVerifyPayment);

  app.all("/api/razorpay/*", (req, res) => {
    console.warn(`[RAZORPAY] Unhandled route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Razorpay API route not found: ${req.method} ${req.url}` });
  });

  // 404 handler for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Abandoned Cart Checker
  const checkAbandonedCarts = async () => {
    try {
      console.log('Checking for abandoned carts...');
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const q = query(collection(clientDb, 'cart_reservations'), where('timestamp', '<', twentyFourHoursAgo));
      const snapshot = await getDocs(q);
      
      const userReservations = new Map();
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.email) {
          if (!userReservations.has(data.email)) {
            userReservations.set(data.email, { userId: data.userId, items: [] });
          }
          userReservations.get(data.email).items.push({
            productId: data.productId,
            quantity: data.quantity
          });
        }
        
        // Release stock (using adminDb if available to bypass rules, or clientDb)
        try {
          const productRef = doc(clientDb, 'products', data.productId);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const productData = productDoc.data();
            const currentStock = productData.stock || 0;
            
            if (data.email && userReservations.has(data.email)) {
              const userRes = userReservations.get(data.email);
              const itemIndex = userRes.items.findIndex((i: any) => i.productId === data.productId);
              if (itemIndex !== -1) {
                userRes.items[itemIndex] = {
                  ...userRes.items[itemIndex],
                  name: productData.name,
                  price: productData.price,
                  image: productData.images?.[0] || ''
                };
              }
            }

            if (adminDb) {
              await adminDb.collection('products').doc(data.productId).update({ stock: currentStock + data.quantity });
              await adminDb.collection('cart_reservations').doc(docSnap.id).delete();
            } else {
              // Fallback (might fail due to rules)
              console.warn('Admin DB not available for stock release');
            }
          }
        } catch (err) {
          console.error(`Failed to release stock for ${docSnap.id}:`, err);
        }
      }
      
      // Send emails
      const settings = await getServerSettings() as any;
      const emailConfig = settings?.zohoEmail && settings?.zohoPassword ? {
        user: settings.zohoEmail,
        pass: settings.zohoPassword
      } : undefined;

      if (emailConfig || process.env.SMTP_USER) {
        for (const [email, data] of userReservations.entries()) {
          try {
            const html = emailTemplates.abandonedCart('Customer', data.items);
            const subject = "You left something in your cart!";
            await sendEmail(email, subject, html, emailConfig);
            console.log(`Sent abandoned cart email to ${email}`);
          } catch (err) {
            console.error(`Failed to send abandoned cart email to ${email}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('Error checking abandoned carts:', error);
    }
  };

  // Run every hour
  setInterval(checkAbandonedCarts, 60 * 60 * 1000);
  // Run once on startup after a delay
  setTimeout(checkAbandonedCarts, 10000);

  // Automated Backup Job
  const runAutomatedBackup = async () => {
    try {
      const settings = await getServerSettings() as any;
      if (!settings?.googleDriveConfig?.enabled) return;

      console.log('Running automated backup...');
      
      // 1. Fetch all collections
      const collections = ['products', 'orders', 'blogs', 'coupons', 'policies', 'users', 'waitlists', 'cart_reservations'];
      const backupData: any = {};
      
      for (const col of collections) {
        const snapshot = await adminDb.collection(col).get();
        backupData[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // 2. Upload to Drive
      const fileName = `backup_${new Date().toISOString()}.json`;
      const fileId = await uploadToDrive(backupData, fileName, settings.googleDriveConfig);
      
      // 3. Log the result
      await logEvent('AUTOMATED_BACKUP', { fileId, fileName, status: 'success' });
      console.log('Backup completed successfully.');
      
    } catch (error) {
      console.error('Automated backup failed:', error);
      await logEvent('AUTOMATED_BACKUP', { error: String(error), status: 'failed' });
    }
  };

  // API endpoint for client-side logging
  app.post("/api/log", express.json(), async (req, res) => {
    try {
      const { event, details } = req.body;
      await logEvent(event, details);
      res.json({ success: true });
    } catch (error) {
      console.error('Logging API failed:', error);
      res.status(500).json({ error: 'Failed to log event' });
    }
  });

  // Check for backups every hour (the actual frequency logic would be checked inside)
  setInterval(runAutomatedBackup, 60 * 60 * 1000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
