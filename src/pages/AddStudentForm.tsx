import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function AddStudentForm() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_name: "",
    admission_no: "",
    grade: "",
    parent_name: "",
    father_contact_no: "",
    mother_contact_no: "",
    email_id: "",
    address: "",
    route: "",
    bus_reg_no: "",
    service_type: "",
    pickup_point: "",
    dropoff_point: "",
    payment_amount: "",
    payment_status: "pending",
    care_taker_name: "",
    care_taker_contact_no: "",
    driver_name: "",
    driver_contact_no: "",
    school_location: "",
    emergency_contact_name: "",
    emergency_contact_number: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("school_students")
        .insert({
          ...formData,
          branch_id: branchId,
          payment_amount: formData.payment_amount ? Number(formData.payment_amount) : null,
          created_by: user.id,
          updated_by: user.id,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student added successfully",
      });

      navigate(`/school-bus/branch/${branchId}/students`);
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/school-bus/branch/${branchId}/students`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
          <p className="text-muted-foreground">
            Enter student information and enrollment details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="student_name">Student Name *</Label>
                <Input
                  id="student_name"
                  value={formData.student_name}
                  onChange={(e) => handleInputChange("student_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admission_no">Admission Number *</Label>
                <Input
                  id="admission_no"
                  value={formData.admission_no}
                  onChange={(e) => handleInputChange("admission_no", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="grade">Grade</Label>
                <Select value={formData.grade} onValueChange={(value) => handleInputChange("grade", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grade 1">Grade 1</SelectItem>
                    <SelectItem value="Grade 2">Grade 2</SelectItem>
                    <SelectItem value="Grade 3">Grade 3</SelectItem>
                    <SelectItem value="Grade 4">Grade 4</SelectItem>
                    <SelectItem value="Grade 5">Grade 5</SelectItem>
                    <SelectItem value="Grade 6">Grade 6</SelectItem>
                    <SelectItem value="Grade 7">Grade 7</SelectItem>
                    <SelectItem value="Grade 8">Grade 8</SelectItem>
                    <SelectItem value="Grade 9">Grade 9</SelectItem>
                    <SelectItem value="Grade 10">Grade 10</SelectItem>
                    <SelectItem value="Grade 11">Grade 11</SelectItem>
                    <SelectItem value="Grade 12">Grade 12</SelectItem>
                    <SelectItem value="Grade 13">Grade 13</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="school_location">School Location</Label>
                <Input
                  id="school_location"
                  value={formData.school_location}
                  onChange={(e) => handleInputChange("school_location", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle>Parent Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="parent_name">Parent Name</Label>
                <Input
                  id="parent_name"
                  value={formData.parent_name}
                  onChange={(e) => handleInputChange("parent_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="father_contact_no">Father's Contact</Label>
                <Input
                  id="father_contact_no"
                  value={formData.father_contact_no}
                  onChange={(e) => handleInputChange("father_contact_no", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mother_contact_no">Mother's Contact</Label>
                <Input
                  id="mother_contact_no"
                  value={formData.mother_contact_no}
                  onChange={(e) => handleInputChange("mother_contact_no", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email_id">Email Address</Label>
                <Input
                  id="email_id"
                  type="email"
                  value={formData.email_id}
                  onChange={(e) => handleInputChange("email_id", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transport Information */}
          <Card>
            <CardHeader>
              <CardTitle>Transport Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="service_type">Service Type</Label>
                <Select value={formData.service_type} onValueChange={(value) => handleInputChange("service_type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BothWay">Both Way</SelectItem>
                    <SelectItem value="OneWay">One Way</SelectItem>
                    <SelectItem value="PickupOnly">Pickup Only</SelectItem>
                    <SelectItem value="DropoffOnly">Drop-off Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  value={formData.route}
                  onChange={(e) => handleInputChange("route", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pickup_point">Pickup Point</Label>
                <Input
                  id="pickup_point"
                  value={formData.pickup_point}
                  onChange={(e) => handleInputChange("pickup_point", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dropoff_point">Drop-off Point</Label>
                <Input
                  id="dropoff_point"
                  value={formData.dropoff_point}
                  onChange={(e) => handleInputChange("dropoff_point", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bus_reg_no">Bus Registration No</Label>
                <Input
                  id="bus_reg_no"
                  value={formData.bus_reg_no}
                  onChange={(e) => handleInputChange("bus_reg_no", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment_amount">Payment Amount (LKR)</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  value={formData.payment_amount}
                  onChange={(e) => handleInputChange("payment_amount", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(value) => handleInputChange("payment_status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="care_taker_name">Care Taker Name</Label>
                <Input
                  id="care_taker_name"
                  value={formData.care_taker_name}
                  onChange={(e) => handleInputChange("care_taker_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="care_taker_contact_no">Care Taker Contact</Label>
                <Input
                  id="care_taker_contact_no"
                  value={formData.care_taker_contact_no}
                  onChange={(e) => handleInputChange("care_taker_contact_no", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                <Input
                  id="emergency_contact_number"
                  value={formData.emergency_contact_number}
                  onChange={(e) => handleInputChange("emergency_contact_number", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Student"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(`/school-bus/branch/${branchId}/students`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}