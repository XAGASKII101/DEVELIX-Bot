import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, 
  Users, 
  Phone, 
  Send, 
  QrCode, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  TrendingUp,
  Clock,
  User
} from "lucide-react";

interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string;
}

interface Lead {
  id: string;
  phoneNumber: string;
  name?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  description?: string;
  status?: string;
  createdAt?: string;
}

interface BotMessage {
  id: string;
  phoneNumber: string;
  messageType: 'sent' | 'received';
  content: string;
  timestamp?: string;
  isBot?: number;
}

export default function Dashboard() {
  const [pairingPhone, setPairingPhone] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [selectedPhoneForMessages, setSelectedPhoneForMessages] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch WhatsApp status
  const { data: whatsappStatus, isLoading: statusLoading } = useQuery<WhatsAppStatus>({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch leads
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch messages for selected phone
  const { data: messages } = useQuery<BotMessage[]>({
    queryKey: ['/api/messages', selectedPhoneForMessages],
    enabled: !!selectedPhoneForMessages,
  });

  // Generate pairing code mutation
  const pairingMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("POST", "/api/whatsapp/pair-code", { phoneNumber });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pairing Code Generated",
        description: `Your pairing code is: ${data.pairingCode}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send manual message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
      const response = await apiRequest("POST", "/api/whatsapp/send-message", { phoneNumber, message });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setManualMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lead status mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/leads/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Updated",
        description: "Lead status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGeneratePairingCode = () => {
    if (!pairingPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    pairingMutation.mutate(pairingPhone);
  };

  const handleSendMessage = () => {
    if (!manualPhone.trim() || !manualMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter both phone number and message",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate({ phoneNumber: manualPhone, message: manualMessage });
  };

  const getStatusBadge = (connected: boolean) => {
    return connected ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Disconnected
      </Badge>
    );
  };

  const getLeadStatusBadge = (status?: string) => {
    const statusColors = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      qualified: "bg-green-500",
      closed: "bg-purple-500",
      rejected: "bg-red-500"
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-500"}>
        {status || "new"}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString();
  };

  const uniquePhoneNumbers = leads?.map(lead => lead.phoneNumber).filter((value, index, self) => self.indexOf(value) === index) || [];

  return (
    <div className="min-h-screen bg-whatsapp-bg">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Develix WhatsApp Bot Dashboard</h1>
          <p className="text-gray-600">Manage your WhatsApp bot, leads, and customer interactions</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-whatsapp-status">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp Status</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {statusLoading ? (
                  <Badge variant="outline">Loading...</Badge>
                ) : (
                  getStatusBadge(whatsappStatus?.connected || false)
                )}
              </div>
              {whatsappStatus?.phoneNumber && (
                <p className="text-xs text-muted-foreground mt-1">
                  {whatsappStatus.phoneNumber}
                </p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-total-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                New leads from WhatsApp bot
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-active-conversations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniquePhoneNumbers.length}</div>
              <p className="text-xs text-muted-foreground">
                Unique phone numbers
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bot-setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bot-setup" data-testid="tab-bot-setup">Bot Setup</TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
            <TabsTrigger value="manual-send" data-testid="tab-manual-send">Send Message</TabsTrigger>
          </TabsList>

          <TabsContent value="bot-setup">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-pairing-code">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="w-5 h-5 mr-2" />
                    Generate Pairing Code
                  </CardTitle>
                  <CardDescription>
                    Generate a pairing code to connect WhatsApp to this bot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pairing-phone">Phone Number</Label>
                    <Input
                      id="pairing-phone"
                      data-testid="input-pairing-phone"
                      placeholder="e.g., 2348107516059"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter phone number without + or spaces
                    </p>
                  </div>
                  <Button 
                    onClick={handleGeneratePairingCode}
                    disabled={pairingMutation.isPending}
                    data-testid="button-generate-pairing-code"
                  >
                    {pairingMutation.isPending ? "Generating..." : "Generate Pairing Code"}
                  </Button>
                </CardContent>
              </Card>

              <Card data-testid="card-bot-info">
                <CardHeader>
                  <CardTitle>Bot Information</CardTitle>
                  <CardDescription>
                    Current bot configuration and features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Available Commands:</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span>1. Custom Development</span>
                      <span>2. Products & Apps</span>
                      <span>3. AI Solutions</span>
                      <span>4. Web Development</span>
                      <span>5. Blockchain</span>
                      <span>6. Vendra</span>
                      <span>7. Portfolio</span>
                      <span>8. Get Quote</span>
                      <span>9. Contact</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Features:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Automated lead generation</li>
                      <li>• Multi-step form collection</li>
                      <li>• Product showcase</li>
                      <li>• Quote generation</li>
                      <li>• Portfolio display</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads">
            <Card data-testid="card-leads-list">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Lead Management
                </CardTitle>
                <CardDescription>
                  View and manage leads generated by the WhatsApp bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div>Loading leads...</div>
                ) : leads && leads.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {leads.map((lead) => (
                        <Card key={lead.id} className="p-4" data-testid={`lead-card-${lead.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span className="font-medium">{lead.name || "Unknown"}</span>
                                {getLeadStatusBadge(lead.status)}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><Phone className="w-3 h-3 inline mr-1" />{lead.phoneNumber}</p>
                                {lead.projectType && <p><strong>Project:</strong> {lead.projectType}</p>}
                                {lead.budget && <p><strong>Budget:</strong> {lead.budget}</p>}
                                {lead.timeline && <p><strong>Timeline:</strong> {lead.timeline}</p>}
                                {lead.description && <p><strong>Description:</strong> {lead.description}</p>}
                                <p><Clock className="w-3 h-3 inline mr-1" />{formatTimestamp(lead.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "contacted" })}
                                disabled={updateLeadMutation.isPending}
                                data-testid={`button-contact-lead-${lead.id}`}
                              >
                                Mark Contacted
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "qualified" })}
                                disabled={updateLeadMutation.isPending}
                                data-testid={`button-qualify-lead-${lead.id}`}
                              >
                                Qualify
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads generated yet. Start the WhatsApp bot to begin collecting leads.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card data-testid="card-phone-list">
                <CardHeader>
                  <CardTitle>Conversations</CardTitle>
                  <CardDescription>Select a phone number to view messages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {uniquePhoneNumbers.map((phoneNumber) => (
                        <Button
                          key={phoneNumber}
                          variant={selectedPhoneForMessages === phoneNumber ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedPhoneForMessages(phoneNumber)}
                          data-testid={`button-phone-${phoneNumber}`}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          {phoneNumber}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2" data-testid="card-messages-chat">
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>
                    {selectedPhoneForMessages ? `Conversation with ${selectedPhoneForMessages}` : "Select a phone number to view messages"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedPhoneForMessages ? (
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {messages && messages.length > 0 ? (
                          messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.messageType === 'sent' ? 'justify-end' : 'justify-start'}`}
                              data-testid={`message-${message.id}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.messageType === 'sent'
                                    ? 'message-sent text-gray-800'
                                    : 'message-received text-gray-800'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-60 mt-1">
                                  {formatTimestamp(message.timestamp)}
                                  {message.isBot ? ' (Bot)' : ''}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground">
                            No messages found for this phone number.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      Select a conversation to view messages
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="manual-send">
            <Card data-testid="card-manual-message">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Send Manual Message
                </CardTitle>
                <CardDescription>
                  Send a custom message to any phone number through the bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="manual-phone">Phone Number</Label>
                  <Input
                    id="manual-phone"
                    data-testid="input-manual-phone"
                    placeholder="e.g., 2348107516059"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="manual-message">Message</Label>
                  <Textarea
                    id="manual-message"
                    data-testid="textarea-manual-message"
                    placeholder="Type your message here..."
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !whatsappStatus?.connected}
                  data-testid="button-send-manual-message"
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
                {!whatsappStatus?.connected && (
                  <p className="text-sm text-destructive">
                    WhatsApp bot must be connected to send messages
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
