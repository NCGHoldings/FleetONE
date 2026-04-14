// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Shield, Bell, Headphones, MessageSquare, Calendar, Clock, Star, AlertTriangle } from 'lucide-react';
import { useSinotrukAfterSalesManagement } from '@/hooks/useSinotrukAfterSalesManagement';
import { format } from 'date-fns';

interface SinotrukAfterSalesManagementProps {
  onRefresh: () => void;
}

export function SinotrukAfterSalesManagement({ onRefresh }: SinotrukAfterSalesManagementProps) {
  const {
    isLoading,
    getWarranties,
    getServiceReminders,
    getSupportTickets,
    getCustomerFeedback,
    createWarranty,
    createServiceReminder,
    createSupportTicket,
    createCustomerFeedback,
  } = useSinotrukAfterSalesManagement();

  const [warranties, setWarranties] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('warranties');

  const loadAfterSalesData = async () => {
    try {
      const [warrantiesData, remindersData, ticketsData, feedbackData] = await Promise.all([
        getWarranties(),
        getServiceReminders(),
        getSupportTickets(),
        getCustomerFeedback(),
      ]);
      
      setWarranties(warrantiesData || []);
      setReminders(remindersData || []);
      setTickets(ticketsData || []);
      setFeedback(feedbackData || []);
    } catch (error) {
      console.error('Error loading after-sales data:', error);
    }
  };

  useEffect(() => {
    loadAfterSalesData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'open':
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
      case 'pending_customer':
        return 'bg-blue-500';
      case 'expired':
      case 'overdue':
        return 'bg-red-500';
      case 'claimed':
      case 'resolved':
        return 'bg-yellow-500';
      case 'void':
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const WarrantyCard = ({ warranty }: { warranty: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{warranty.warranty_number}</CardTitle>
          <Badge className={`${getStatusColor(warranty.status)} text-white`}>
            {warranty.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>{warranty.warranty_type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Expires: {format(new Date(warranty.end_date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{warranty.duration_months} months</span>
          </div>
          {warranty.mileage_limit_km && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span>{warranty.mileage_limit_km.toLocaleString()} km limit</span>
            </div>
          )}
        </div>
        {warranty.coverage_details && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">{warranty.coverage_details}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ReminderCard = ({ reminder }: { reminder: any }) => (
    <Card className="mb-4 border-l-4 border-l-yellow-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{reminder.reminder_type.replace('_', ' ')}</CardTitle>
          <Badge variant={reminder.reminder_sent ? 'default' : 'secondary'}>
            {reminder.reminder_sent ? 'Sent' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Due: {format(new Date(reminder.due_date), 'MMM dd, yyyy')}</span>
          </div>
          {reminder.due_mileage_km && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span>Due at: {reminder.due_mileage_km.toLocaleString()} km</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span>Customer contacted: {reminder.customer_contacted ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Service booked: {reminder.service_booked ? 'Yes' : 'No'}</span>
          </div>
        </div>
        {reminder.service_description && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">{reminder.service_description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TicketCard = ({ ticket }: { ticket: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{ticket.ticket_number}</CardTitle>
          <div className="flex gap-2">
            <Badge className={`${getPriorityColor(ticket.priority)} text-white`}>
              {ticket.priority}
            </Badge>
            <Badge className={`${getStatusColor(ticket.status)} text-white`}>
              {ticket.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h4 className="font-medium">{ticket.subject}</h4>
          <p className="text-sm text-muted-foreground">{ticket.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>Category: {ticket.category}</span>
            </div>
            {ticket.assigned_to_name && (
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-muted-foreground" />
                <span>Assigned to: {ticket.assigned_to_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created: {format(new Date(ticket.created_at), 'MMM dd, yyyy')}</span>
            </div>
            {ticket.customer_satisfaction_rating && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {getRatingStars(ticket.customer_satisfaction_rating)}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FeedbackCard = ({ feedbackItem }: { feedbackItem: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{feedbackItem.feedback_type} Feedback</CardTitle>
          <div className="flex items-center gap-2">
            {getRatingStars(parseInt(feedbackItem.overall_rating))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {feedbackItem.comments && (
            <div>
              <h5 className="font-medium text-sm">Comments:</h5>
              <p className="text-sm text-muted-foreground">{feedbackItem.comments}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {feedbackItem.product_quality_rating && (
              <div>
                <span className="font-medium">Product Quality: </span>
                <div className="flex items-center gap-1">
                  {getRatingStars(parseInt(feedbackItem.product_quality_rating))}
                </div>
              </div>
            )}
            {feedbackItem.delivery_experience_rating && (
              <div>
                <span className="font-medium">Delivery Experience: </span>
                <div className="flex items-center gap-1">
                  {getRatingStars(parseInt(feedbackItem.delivery_experience_rating))}
                </div>
              </div>
            )}
            {feedbackItem.customer_service_rating && (
              <div>
                <span className="font-medium">Customer Service: </span>
                <div className="flex items-center gap-1">
                  {getRatingStars(parseInt(feedbackItem.customer_service_rating))}
                </div>
              </div>
            )}
            {feedbackItem.likelihood_to_recommend && (
              <div>
                <span className="font-medium">Recommend (1-10): </span>
                <span>{feedbackItem.likelihood_to_recommend}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t text-xs text-muted-foreground">
            <span>Submitted: {format(new Date(feedbackItem.created_at), 'MMM dd, yyyy')}</span>
            {feedbackItem.responded_to && (
              <span className="ml-4">Responded: {format(new Date(feedbackItem.response_date), 'MMM dd, yyyy')}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          After-Sales Service Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="warranties">Warranties</TabsTrigger>
            <TabsTrigger value="reminders">Service Reminders</TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="feedback">Customer Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="warranties" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Warranty Management & Tracking</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Shield className="h-4 w-4 mr-2" />
                    Create Warranty
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Warranty</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warranty-type">Warranty Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select warranty type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comprehensive">Comprehensive</SelectItem>
                            <SelectItem value="engine">Engine</SelectItem>
                            <SelectItem value="transmission">Transmission</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (Months)</Label>
                        <Input id="duration" type="number" placeholder="24" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input id="start-date" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="mileage-limit">Mileage Limit (km)</Label>
                        <Input id="mileage-limit" type="number" placeholder="100000" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="coverage">Coverage Details</Label>
                      <Textarea id="coverage" placeholder="Enter coverage details..." />
                    </div>
                    <Button className="w-full">Create Warranty</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {warranties.length > 0 ? (
                warranties.map((warranty) => (
                  <WarrantyCard key={warranty.id} warranty={warranty} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No warranties found
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Service Reminder Automation</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Bell className="h-4 w-4 mr-2" />
                    Create Reminder
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Service Reminder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="reminder-type">Reminder Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reminder type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first_service">First Service</SelectItem>
                            <SelectItem value="periodic_service">Periodic Service</SelectItem>
                            <SelectItem value="warranty_expiry">Warranty Expiry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="due-date">Due Date</Label>
                        <Input id="due-date" type="date" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="service-description">Service Description</Label>
                      <Textarea id="service-description" placeholder="Enter service description..." />
                    </div>
                    <Button className="w-full">Create Reminder</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {reminders.length > 0 ? (
                reminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No service reminders found
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Technical Support Ticketing</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Headphones className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="warranty">Warranty</SelectItem>
                            <SelectItem value="parts">Parts</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="Enter ticket subject" />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Enter detailed description..." />
                    </div>
                    <Button className="w-full">Create Ticket</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No support tickets found
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Customer Feedback Management</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Record Feedback
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Record Customer Feedback</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="feedback-type">Feedback Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select feedback type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="overall-rating">Overall Rating</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                            <SelectItem value="4">⭐⭐⭐⭐ Good</SelectItem>
                            <SelectItem value="3">⭐⭐⭐ Average</SelectItem>
                            <SelectItem value="2">⭐⭐ Poor</SelectItem>
                            <SelectItem value="1">⭐ Very Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="comments">Comments</Label>
                      <Textarea id="comments" placeholder="Enter customer comments..." />
                    </div>
                    <Button className="w-full">Record Feedback</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {feedback.length > 0 ? (
                feedback.map((feedbackItem) => (
                  <FeedbackCard key={feedbackItem.id} feedbackItem={feedbackItem} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No customer feedback found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}