import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whatsappBot } from "./whatsapp-bot";
import { insertLeadSchema, insertBotMessageSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";

// Rate limiting for WhatsApp endpoints
const whatsappLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure express trust proxy for deployment
  app.set('trust proxy', true);
  
  // Initialize WhatsApp bot
  try {
    await whatsappBot.start();
  } catch (error) {
    console.error("Failed to start WhatsApp bot:", error);
  }

  // WhatsApp bot status endpoint
  app.get("/api/whatsapp/status", (req, res) => {
    try {
      const status = whatsappBot.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get WhatsApp bot status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate pairing code
  app.post("/api/whatsapp/pair-code", whatsappLimiter, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const pairingCode = await whatsappBot.generatePairingCode(phoneNumber);
      res.json({ pairingCode, phoneNumber });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to generate pairing code",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send manual message (for admin use)
  app.post("/api/whatsapp/send-message", whatsappLimiter, async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }

      await whatsappBot.sendMessage(phoneNumber, message);
      
      // Store the sent message
      await storage.createBotMessage({
        phoneNumber,
        messageType: 'sent',
        content: message,
        isBot: 0, // Manual message, not bot
      });

      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all leads
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to fetch leads",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get leads by phone number
  app.get("/api/leads/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const leads = await storage.getLeadsByPhoneNumber(phoneNumber);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to fetch leads",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update lead status
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const lead = await storage.updateLead(id, updates);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to update lead",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get bot messages for a phone number
  app.get("/api/messages/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getBotMessages(phoneNumber, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to fetch messages",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get WhatsApp sessions
  app.get("/api/whatsapp/sessions", async (req, res) => {
    try {
      // For demo purposes, return active sessions count
      // In production, you might want to implement proper session management
      res.json({ 
        message: "Sessions endpoint - implement based on your needs",
        connected: whatsappBot.getConnectionStatus().connected
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to fetch sessions",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Webhook for external integrations (optional)
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      // Handle webhooks from external services
      console.log("Webhook received:", req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const status = whatsappBot.getConnectionStatus();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      whatsapp: {
        connected: status.connected,
        phoneNumber: status.phoneNumber
      }
    });
  });

  const httpServer = createServer(app);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await whatsappBot.stop();
    httpServer.close(() => {
      console.log('Process terminated');
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await whatsappBot.stop();
    httpServer.close(() => {
      console.log('Process terminated');
    });
  });

  return httpServer;
}
