import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import {
    Eye,
    DollarSign,
    Truck,
    Package,
    Shield,
    Cog,
    FileCheck,
    MapPin,
    Wrench,
    FileText,
    MessageSquare,
    Calendar,
    User
} from 'lucide-react';
import { SinotrukOrder } from '@/hooks/useSinotrukOrderManagement';
import { SinotruckPaymentTracking } from './SinotruckPaymentTracking';

interface EnhancedSinotrukOrderDetailsModalProps {
    order: SinotrukOrder | null;
    open: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export function EnhancedSinotrukOrderDetailsModal({
    order,
    open,
    onClose,
    onRefresh
}: EnhancedSinotrukOrderDetailsModalProps) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Order Management - {order.order_no}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="journey" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">Journey</span>
                        </TabsTrigger>
                        <TabsTrigger value="financial" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="hidden sm:inline">Financial</span>
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Documents</span>
                        </TabsTrigger>
                        <TabsTrigger value="operations" className="flex items-center gap-2">
                            <Cog className="h-4 w-4" />
                            <span className="hidden sm:inline">Operations</span>
                        </TabsTrigger>
                        <TabsTrigger value="communication" className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">Messages</span>
                        </TabsTrigger>
                        <TabsTrigger value="customer" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">Customer</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Order Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Order Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Order Number</label>
                                            <p className="font-mono text-base">{order.order_no}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                                            <p>{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Truck Model</label>
                                            <p className="font-medium">{order.truck_model}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                                            <p className="text-lg font-bold">{order.quantity}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Status */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Current Phase</label>
                                        <div className="mt-2">
                                            <Badge className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                                                {order.current_phase.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Overall Progress</label>
                                        <div className="mt-2 space-y-2">
                                            <Progress value={order.progress_percentage || 0} className="w-full h-3" />
                                            <p className="text-base font-semibold">{Math.round(order.progress_percentage || 0)}% Complete</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Specifications */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Vehicle Specifications</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Payment Mode</label>
                                        <p className="font-medium capitalize">{order.payment_mode}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                                        <p className="font-medium">LKR {order.total_amount?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Paid Amount</label>
                                        <p className="font-medium">LKR {order.total_paid?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Balance Due</label>
                                        <p className="font-medium">LKR {order.balance_due?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Placeholders for other tabs */}
                    <TabsContent value="journey" className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-muted-foreground text-center">Order Journey tracking coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-6">
                        <SinotruckPaymentTracking 
                            orderId={order.id} 
                            onRefresh={onRefresh} 
                        />
                    </TabsContent>

                    <TabsContent value="operations" className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-muted-foreground text-center">Operations management coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-muted-foreground text-center">Document management coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="communication" className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-muted-foreground text-center">Communication logs coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="customer" className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-muted-foreground text-center">Customer details coming soon...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
