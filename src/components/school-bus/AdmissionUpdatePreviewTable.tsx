import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, CheckCircle, AlertCircle, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AdmissionUpdatePreviewTableProps {
  students: any[];
  loading: boolean;
  onUpdate: (updates: any[]) => void;
  onManualUpdate: (studentId: string, newNumber: string) => void;
  validationResults: any[];
}

export function AdmissionUpdatePreviewTable({
  students,
  loading,
  onUpdate,
  onManualUpdate,
  validationResults,
}: AdmissionUpdatePreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editedNumbers, setEditedNumbers] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [validationStates, setValidationStates] = useState<Record<string, { valid: boolean; message: string }>>({});

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.grade.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleInputChange = (studentId: string, value: string) => {
    setEditedNumbers(prev => ({ ...prev, [studentId]: value }));

    // Real-time validation
    if (value.trim() === '') {
      setValidationStates(prev => ({
        ...prev,
        [studentId]: { valid: false, message: 'Empty' }
      }));
      return;
    }

    if (!/^[A-Za-z0-9-_]{1,20}$/.test(value)) {
      setValidationStates(prev => ({
        ...prev,
        [studentId]: { valid: false, message: 'Invalid format' }
      }));
      return;
    }

    setValidationStates(prev => ({
      ...prev,
      [studentId]: { valid: true, message: 'Valid' }
    }));
  };

  const handleSingleUpdate = async (studentId: string) => {
    const newNumber = editedNumbers[studentId];
    if (!newNumber) {
      toast.error('Please enter a new admission number');
      return;
    }

    await onManualUpdate(studentId, newNumber);
    
    // Clear edited state
    setEditedNumbers(prev => {
      const updated = { ...prev };
      delete updated[studentId];
      return updated;
    });
    setValidationStates(prev => {
      const updated = { ...prev };
      delete updated[studentId];
      return updated;
    });
  };

  const handleBulkUpdate = () => {
    const updates = Array.from(selectedStudents)
      .map(studentId => {
        const student = students.find(s => s.id === studentId);
        const newNumber = editedNumbers[studentId];
        if (!student || !newNumber) return null;
        
        return {
          studentId,
          tnNumber: student.admission_no,
          newNumber,
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      toast.error('Please select students and enter new admission numbers');
      return;
    }

    onUpdate(updates);
    
    // Clear selections
    setSelectedStudents(new Set());
    setEditedNumbers({});
    setValidationStates({});
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const updated = new Set(prev);
      if (updated.has(studentId)) {
        updated.delete(studentId);
      } else {
        updated.add(studentId);
      }
      return updated;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const getStatusIcon = (studentId: string) => {
    const validation = validationStates[studentId];
    if (!validation) return null;

    if (validation.valid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search TN number, name, or grade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedStudents.size} selected
          </span>
          <Button
            onClick={handleBulkUpdate}
            disabled={selectedStudents.size === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Save className="h-4 w-4 mr-2" />
            Update Selected
          </Button>
        </div>
      </div>

      {/* Alert for pending students */}
      {filteredStudents.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {filteredStudents.length} students with TN numbers. Enter new admission numbers and click Save to update.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">TN Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">New Admission Number</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedStudents.has(student.id)}
                      onCheckedChange={() => toggleStudentSelection(student.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                      {student.admission_no}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{student.student_name}</td>
                  <td className="px-4 py-3 text-sm">{student.grade}</td>
                  <td className="px-4 py-3">
                    <Input
                      placeholder="Enter new number"
                      value={editedNumbers[student.id] || ''}
                      onChange={(e) => handleInputChange(student.id, e.target.value)}
                      className={`
                        font-mono text-sm
                        ${validationStates[student.id]?.valid ? 'border-green-500' : ''}
                        ${validationStates[student.id] && !validationStates[student.id].valid ? 'border-destructive' : ''}
                      `}
                    />
                    {validationStates[student.id] && !validationStates[student.id].valid && (
                      <p className="text-xs text-destructive mt-1">
                        {validationStates[student.id].message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusIcon(student.id)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSingleUpdate(student.id)}
                      disabled={!editedNumbers[student.id] || !validationStates[student.id]?.valid}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No TN students found
        </div>
      )}
    </div>
  );
}
