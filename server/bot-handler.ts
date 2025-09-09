import { storage } from './storage';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface BotState {
  currentMenu: string;
  leadFormStep: number;
  leadData: any;
}

const userStates = new Map<string, BotState>();

export async function handleMessage(sock: any, message: any) {
  const phoneNumber = message.key.remoteJid;
  const messageText = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || '';
  
  if (!messageText) return;

  // Store the received message
  await storage.createBotMessage({
    phoneNumber,
    messageType: 'received',
    content: messageText,
    isBot: 0,
  });

  const userState = userStates.get(phoneNumber) || {
    currentMenu: 'main',
    leadFormStep: 0,
    leadData: {}
  };

  let responseMessage = '';

  // Handle different states and commands
  if (userState.currentMenu === 'lead_form') {
    responseMessage = await handleLeadForm(phoneNumber, messageText, userState);
  } else {
    responseMessage = await handleMainMenu(phoneNumber, messageText, userState);
  }

  // Update user state
  userStates.set(phoneNumber, userState);

  // Send response
  if (responseMessage) {
    await sock.sendMessage(phoneNumber, { text: responseMessage });
    
    // Store the sent message
    await storage.createBotMessage({
      phoneNumber,
      messageType: 'sent',
      content: responseMessage,
      isBot: 1,
    });
  }
}

async function handleMainMenu(phoneNumber: string, messageText: string, userState: BotState): Promise<string> {
  const input = messageText.trim().toLowerCase();

  // Handle numbered menu options
  switch (input) {
    case '1':
    case 'custom':
    case 'custom development':
    case 'development':
    case 'dev':
      return getCustomDevelopmentInfo(userState);
    case '2':
    case 'products':
    case 'product':
    case 'apps':
    case 'app':
      return getProductsInfo();
    case '3':
    case 'ai':
    case 'artificial intelligence':
    case 'ml':
    case 'machine learning':
      return getAIInfo();
    case '4':
    case 'web':
    case 'website':
    case 'web development':
    case 'web dev':
      return getWebDevInfo();
    case '5':
    case 'blockchain':
    case 'elixa':
    case 'crypto':
    case 'defi':
      return getBlockchainInfo();
    case '6':
    case 'vendra':
    case 'marketplace':
      return getVendraInfo();
    case '7':
    case 'portfolio':
    case 'showcase':
    case 'projects':
    case 'case studies':
      return getPortfolioInfo();
    case '8':
    case 'quote':
    case 'quotes':
    case 'qoute':
    case 'qotw':
    case 'consultation':
    case 'consult':
    case 'estimate':
      return getQuoteInfo(userState);
    case '9':
    case 'contact':
    case 'support':
    case 'help':
    case 'reach':
      return getContactInfo();
    case 'menu':
    case 'start':
    case 'main':
    case 'home':
      return getMainMenu();
    default:
      // Handle keyword matching for more flexibility
      if (input.includes('project') || input.includes('quote') || input.includes('qoute') || 
          input.includes('development') || input.includes('estimate') || input.includes('consult')) {
        return getQuoteInfo(userState);
      }
      if (input.includes('ai') || input.includes('artificial') || input.includes('machine')) {
        return getAIInfo();
      }
      if (input.includes('web') || input.includes('website')) {
        return getWebDevInfo();
      }
      if (input.includes('blockchain') || input.includes('crypto') || input.includes('elixa')) {
        return getBlockchainInfo();
      }
      if (input.includes('vendra') || input.includes('marketplace')) {
        return getVendraInfo();
      }
      if (input.includes('portfolio') || input.includes('showcase') || input.includes('case')) {
        return getPortfolioInfo();
      }
      if (input.includes('contact') || input.includes('support') || input.includes('reach')) {
        return getContactInfo();
      }
      if (input.includes('product') || input.includes('app')) {
        return getProductsInfo();
      }
      return getMainMenu();
  }
}

async function handleLeadForm(phoneNumber: string, messageText: string, userState: BotState): Promise<string> {
  const input = messageText.trim();
  const lowerInput = input.toLowerCase();

  // Allow users to exit lead form and return to menu
  if (lowerInput === 'menu' || lowerInput === 'cancel' || lowerInput === 'exit' || lowerInput === 'back') {
    userState.currentMenu = 'main';
    userState.leadFormStep = 0;
    userState.leadData = {};
    return getMainMenu();
  }

  switch (userState.leadFormStep) {
    case 1: // Project type
      userState.leadData.projectType = input;
      userState.leadFormStep = 2;
      return "💰 What's your budget range?\n\n1. ₦100K - ₦500K\n2. ₦500K - ₦1M\n3. ₦1M - ₦3M\n4. ₦3M - ₦5M\n5. ₦5M+\n\nPlease type the number or your budget range:";
    
    case 2: // Budget
      const budgetOptions = {
        '1': '₦100K - ₦500K',
        '2': '₦500K - ₦1M',
        '3': '₦1M - ₦3M',
        '4': '₦3M - ₦5M',
        '5': '₦5M+'
      };
      userState.leadData.budget = budgetOptions[input as keyof typeof budgetOptions] || input;
      userState.leadFormStep = 3;
      return "⏰ What's your timeline?\n\n1. ASAP (Rush)\n2. 1-3 months\n3. 3-6 months\n4. 6+ months\n\nPlease type the number or your timeline:";
    
    case 3: // Timeline
      const timelineOptions = {
        '1': 'ASAP (Rush)',
        '2': '1-3 months',
        '3': '3-6 months',
        '4': '6+ months'
      };
      userState.leadData.timeline = timelineOptions[input as keyof typeof timelineOptions] || input;
      userState.leadFormStep = 4;
      return "📝 Please provide a brief description of your project and any specific requirements:";
    
    case 4: // Description
      userState.leadData.description = input;
      userState.leadFormStep = 5;
      return "👤 What's your name? (This helps us personalize our service)";
    
    case 5: // Name
      userState.leadData.name = input;
      
      // Save the lead
      await storage.createLead({
        phoneNumber,
        name: userState.leadData.name,
        projectType: userState.leadData.projectType,
        budget: userState.leadData.budget,
        timeline: userState.leadData.timeline,
        description: userState.leadData.description,
        status: 'new'
      });

      // Reset state
      userState.currentMenu = 'main';
      userState.leadFormStep = 0;
      userState.leadData = {};

      return `🎉 Thank you ${userState.leadData.name}! Your project inquiry has been submitted.\n\n📋 Summary:\n• Project: ${userState.leadData.projectType}\n• Budget: ${userState.leadData.budget}\n• Timeline: ${userState.leadData.timeline}\n\n✅ Our team will review your requirements and contact you within 24 hours with a detailed proposal.\n\n📞 For urgent matters, call us directly at +234 810 751 6059\n\nType 'menu' to return to the main menu.`;
    
    default:
      userState.currentMenu = 'main';
      userState.leadFormStep = 0;
      return getMainMenu();
  }
}

function getMainMenu(): string {
  return `👋 *Welcome to Develix!*

🚀 *Technology Without Barriers*
AI & Software solutions built in Nigeria, designed for the world.

Please select from the menu below:

1️⃣ *Custom Development* - Bring Your Ideas to Life
2️⃣ *Our Products & Apps* - Ready-to-use Solutions  
3️⃣ *AI Models & Solutions* - Machine Learning Services
4️⃣ *Website Development* - Modern Web Solutions
5️⃣ *Elixa Coin & Blockchain* - DeFi & Crypto Solutions
6️⃣ *Vendra Marketplace* - AI-Powered Business Tools
7️⃣ *Project Showcase* - Case Studies & Portfolio
8️⃣ *Get Quote/Consultation* - Free Project Assessment
9️⃣ *Contact & Support* - Get in Touch

💡 *How to use:*
• Type a number (1-9)
• Use keywords like "quote", "ai", "web", "vendra"
• Type "menu" anytime to return here`;
}

function getCustomDevelopmentInfo(userState: BotState): string {
  return `🛠️ *Custom Development Services*

We build custom software solutions tailored to your specific needs:

💻 *Our Services:*
• *Mobile Apps:* React Native, Flutter (₦500K - ₦2M)
• *Web Applications:* React, Next.js, Node.js (₦300K - ₦1.5M)  
• *AI/ML Solutions:* Custom models, API integration (₦800K - ₦3M)
• *Enterprise Systems:* CRM, ERP, Dashboard (₦1M - ₦5M)

⭐ *Recent Success:* FirstBank Nigeria - 300% transaction speed improvement

📊 *Our Track Record:*
• 98% client satisfaction rate
• 150+ projects delivered
• $50M+ client ROI generated

Would you like to discuss your project? Reply with 'quote' to start!`;
}

function getProductsInfo(): string {
  return `📱 *Our Ready-to-Use Products*

Explore our collection of innovative apps and solutions:

🏪 *Vendra* - AI-Powered SME Platform
• ₂2.5M total supply
• Multilingual marketplace for African SMEs
• AI customer engagement tools

🪙 *Elixa Coin* - Blockchain & DeFi  
• ₦850 current price
• 15K+ token holders, 99.9% uptime
• Africa's gateway to decentralized finance

🛡️ *Anti-Fraud Detector* - AI Security System
• Real-time fraud detection with 95% accuracy
• Used by major banks across Nigeria

🤖 *WhatsApp Bot* - This bot you're using!
• Automated customer service
• Smart lead generation
• 24/7 availability

Type the product name for more details or 'menu' for main menu.`;
}

function getAIInfo(): string {
  return `🤖 *AI Models & Machine Learning*

Advanced AI solutions powered by cutting-edge technology:

🗣️ *Natural Language Processing*
• Multilingual support: English, Hausa, Yoruba, Igbo, Swahili
• Sentiment analysis and text classification
• Chatbot development

👁️ *Computer Vision*  
• Medical imaging analysis
• Document processing and OCR
• Object detection and recognition

📊 *Predictive Analytics*
• Financial forecasting and risk assessment  
• Market analysis and customer insights
• Business intelligence dashboards

🏆 *Success Stories:*
• Kuda Bank: 95% fraud reduction with our ML model
• LUTH: 60% faster patient diagnosis with AI
• 15+ enterprises using our AI solutions

Ready to explore AI for your business? Type '8' for consultation!`;
}

function getWebDevInfo(): string {
  return `🌐 *Modern Website Development*

Professional websites that drive results:

📊 *Our Metrics:*
• 99.9% Uptime SLA
• 2-8 Week Delivery  
• Mobile-first approach

💰 *Pricing:*
• *Business Websites:* ₦150K - ₦500K
• *E-commerce Platforms:* ₦400K - ₦1.2M
• *Web Applications:* ₦600K - ₦2M
• *Enterprise Portals:* ₦1M - ₦5M

🛠️ *Technology Stack:*
React • Next.js • Node.js • AWS • Docker

✅ *What's Included:*
• Responsive design for all devices
• SEO optimization  
• Security implementation
• Performance optimization
• 6 months free maintenance

Ready to start your web project? Type '8' for a free quote!`;
}

function getBlockchainInfo(): string {
  return `⛓️ *Elixa Coin & Blockchain Solutions*

Africa's gateway to decentralized finance:

📈 *Live Metrics:*
• 2.5M Total Supply (Fixed)
• ₦850 Current Price
• 15K+ Token Holders  
• 99.9% Network Uptime

💰 *Key Benefits:*
• *Cross-Border Payments:* <1% fees vs 8-12% traditional
• *DeFi Savings:* Up to 12% APY staking rewards
• *Merchant Integration:* Instant crypto payments

🏗️ *Blockchain Services:*
• Smart Contract Development
• DeFi Protocol Creation  
• Cryptocurrency Integration
• NFT Marketplace Development

🔒 *Security & Compliance:*
• Audited by leading blockchain security firms
• Fully compliant with Nigerian SEC
• Built on Polygon for scalability

Get ELX tokens or learn more? Type 'elixa' for details!`;
}

function getVendraInfo(): string {
  return `🏪 *Vendra - AI-Powered SME Platform*

Empowering African small businesses with smart tools:

📊 *Live Marketplace Metrics:*
• ₦42.3M 24h Sales Volume (+22.1%)
• 2,314 Active Vendors
• 96% Order Fulfillment Rate
• 4.7★ Customer Rating

🚀 *Key Features:*
• *Multilingual AI:* English, Hausa, Yoruba, Igbo, Swahili, French
• *Mobile-First:* Works on 2G networks, offline processing  
• *Smart Analytics:* Sales forecasting, customer insights
• *Social Commerce:* WhatsApp/Instagram integration

💳 *Payment Options:*
• Mobile money (M-Pesa, Airtel Money)
• Bank transfers
• Cryptocurrency payments
• Instant settlement

🎯 *Perfect For:*
• Small retailers and vendors
• Service providers
• E-commerce businesses
• Social media sellers

Start your free trial? Type 'vendra' for access!`;
}

function getPortfolioInfo(): string {
  return `🏆 *Our Success Stories*

Proven track record of delivering exceptional results:

📊 *Company Metrics:*
• 150+ Projects Completed
• 98% Client Satisfaction
• $50M+ Client ROI Generated

🏦 *Featured Case Studies:*

*FirstBank Nigeria* - Digital Transformation
• 300% transaction speed improvement
• $12M operational savings
• 6-month implementation

*Kuda Bank* - AI Fraud Detection  
• 95% fraud reduction
• $25M losses prevented
• 4-month development

*LUTH Hospital* - Patient Management
• 60% faster diagnosis
• $2.5M cost savings
• AI-powered system

🎯 *Industries We Serve:*
• FinTech & Banking
• Healthcare
• E-commerce
• Government
• Education

View detailed case studies? Type 'portfolio' for full showcase!`;
}

function getQuoteInfo(userState: BotState): string {
  userState.currentMenu = 'lead_form';
  userState.leadFormStep = 1;
  
  return `💡 *Get Your Free Consultation*

Let's discuss your project and provide a detailed quote:

🎯 *What You'll Get:*
✅ Detailed project analysis & requirements
✅ Technology recommendations  
✅ Accurate timeline & budget estimate
✅ 30-minute strategy call with our founders

📝 *Quick Project Assessment:*

What type of project do you need?

1. Mobile App Development
2. Website Development  
3. AI/ML Solution
4. Blockchain Integration
5. Enterprise System
6. Other (please specify)

Please type the number or describe your project:`;
}

function getContactInfo(): string {
  return `📞 *Get in Touch*

Multiple ways to connect with our team:

📱 *WhatsApp Direct:* +234 810 751 6059
✉️ *Email:* hello@develix.com  
🌐 *Website:* www.develix.com

👨‍💻 *Meet Our Founders:*
• *Alexius Dubem (17)* - CEO & Co-Founder
• *Jerome Ebube (16)* - CTO & Co-Founder
🇳🇬 Built in Anambra State, Nigeria

🕒 *Business Hours:*
Monday - Friday: 9:00 AM - 6:00 PM (WAT)
Emergency support: 24/7 available

🎯 *Office Location:*
Anambra State, Nigeria

Ready to schedule a meeting? Type '8' for consultation booking!`;
}
