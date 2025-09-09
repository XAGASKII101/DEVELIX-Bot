import { 
  type User, 
  type InsertUser,
  type WhatsappSession,
  type InsertWhatsappSession,
  type Lead,
  type InsertLead,
  type BotMessage,
  type InsertBotMessage
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // WhatsApp session methods
  createWhatsappSession(session: InsertWhatsappSession): Promise<WhatsappSession>;
  getWhatsappSession(phoneNumber: string): Promise<WhatsappSession | undefined>;
  updateWhatsappSession(phoneNumber: string, sessionData: any): Promise<WhatsappSession | undefined>;
  deactivateWhatsappSession(phoneNumber: string): Promise<void>;

  // Lead methods
  createLead(lead: InsertLead): Promise<Lead>;
  getLeads(): Promise<Lead[]>;
  getLeadsByPhoneNumber(phoneNumber: string): Promise<Lead[]>;
  updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined>;

  // Bot message methods
  createBotMessage(message: InsertBotMessage): Promise<BotMessage>;
  getBotMessages(phoneNumber: string, limit?: number): Promise<BotMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private whatsappSessions: Map<string, WhatsappSession>;
  private leads: Map<string, Lead>;
  private botMessages: Map<string, BotMessage>;

  constructor() {
    this.users = new Map();
    this.whatsappSessions = new Map();
    this.leads = new Map();
    this.botMessages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createWhatsappSession(insertSession: InsertWhatsappSession): Promise<WhatsappSession> {
    const id = randomUUID();
    const session: WhatsappSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.whatsappSessions.set(insertSession.phoneNumber, session);
    return session;
  }

  async getWhatsappSession(phoneNumber: string): Promise<WhatsappSession | undefined> {
    return this.whatsappSessions.get(phoneNumber);
  }

  async updateWhatsappSession(phoneNumber: string, sessionData: any): Promise<WhatsappSession | undefined> {
    const session = this.whatsappSessions.get(phoneNumber);
    if (session) {
      session.sessionData = sessionData;
      session.updatedAt = new Date();
      this.whatsappSessions.set(phoneNumber, session);
      return session;
    }
    return undefined;
  }

  async deactivateWhatsappSession(phoneNumber: string): Promise<void> {
    const session = this.whatsappSessions.get(phoneNumber);
    if (session) {
      session.isActive = 0;
      session.updatedAt = new Date();
      this.whatsappSessions.set(phoneNumber, session);
    }
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const lead: Lead = {
      ...insertLead,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.set(id, lead);
    return lead;
  }

  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLeadsByPhoneNumber(phoneNumber: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.phoneNumber === phoneNumber);
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (lead) {
      const updatedLead = { ...lead, ...updates, updatedAt: new Date() };
      this.leads.set(id, updatedLead);
      return updatedLead;
    }
    return undefined;
  }

  async createBotMessage(insertMessage: InsertBotMessage): Promise<BotMessage> {
    const id = randomUUID();
    const message: BotMessage = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.botMessages.set(id, message);
    return message;
  }

  async getBotMessages(phoneNumber: string, limit: number = 50): Promise<BotMessage[]> {
    return Array.from(this.botMessages.values())
      .filter(message => message.phoneNumber === phoneNumber)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
