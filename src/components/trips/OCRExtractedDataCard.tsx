import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Edit, CheckCircle, Eye, Trash2 } from "lucide-react";
import { OCRFieldsTable } from "./OCRFieldsTable";

interface ExtractedTripData {
  fileName: string;
  imageUrl: string;
  busNumber: string;
  date: string;
  confidence: number;
  incomeFields: Record<string, number>;
  expenseFields: Record<string, number>;
  unmappedFields: Array<{
    field: string;
    value: number;
    section: 'income' | 'expense';
  }>;
}

interface OCRExtractedDataCardProps {
  data: ExtractedTripData;
  onApply: (data: ExtractedTripData) => void;
  onDiscard: () => void;
  onView: () => void;
}

export const OCRExtractedDataCard = ({ data, onApply, onDiscard, onView }: OCRExtractedDataCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default" className="bg-green-500">High: {confidence}%</Badge>;
    if (confidence >= 60) return <Badge variant="default" className="bg-yellow-500">Medium: {confidence}%</Badge>;
    return <Badge variant="destructive">Low: {confidence}%</Badge>;
  };

  const incomeTotal = Object.values(editedData.incomeFields).reduce((sum, val) => sum + val, 0);
  const expenseTotal = Object.values(editedData.expenseFields).reduce((sum, val) => sum + val, 0);
  const netIncome = incomeTotal - expenseTotal;

  const handleFieldChange = (section: 'income' | 'expense', fieldName: string, value: number) => {
    setEditedData(prev => ({
      ...prev,
      [section === 'income' ? 'incomeFields' : 'expenseFields']: {
        ...prev[section === 'income' ? 'incomeFields' : 'expenseFields'],
        [fieldName]: value
      }
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <img 
                src={data.imageUrl} 
                alt="Trip sheet preview" 
                className="w-16 h-16 object-cover rounded border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{data.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">🚌 {data.busNumber}</span>
                  {getConfidenceBadge(data.confidence)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {Object.keys(data.incomeFields).length} income • {Object.keys(data.expenseFields).length} expense fields
                  {data.unmappedFields.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {data.unmappedFields.length} unmapped
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Image Preview */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Original Image</h4>
                <img 
                  src={data.imageUrl} 
                  alt="Full trip sheet" 
                  className="w-full rounded border"
                />
              </div>

              {/* Right: Extracted Data */}
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">📋 Bus {data.busNumber} • {data.date}</p>
                </div>

                <OCRFieldsTable
                  title="INCOME (ආදායම)"
                  fields={editedData.incomeFields}
                  isEditing={isEditing}
                  onFieldChange={(field, value) => handleFieldChange('income', field, value)}
                />

                <OCRFieldsTable
                  title="EXPENSES (වියදම)"
                  fields={editedData.expenseFields}
                  isEditing={isEditing}
                  onFieldChange={(field, value) => handleFieldChange('expense', field, value)}
                />

                <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Income</p>
                      <p className="font-mono font-bold text-lg">{formatAmount(incomeTotal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Expenses</p>
                      <p className="font-mono font-bold text-lg">{formatAmount(expenseTotal)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Net Income</p>
                    <p className={`font-mono font-bold text-xl ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(netIncome)}
                    </p>
                  </div>
                </div>

                {data.unmappedFields.length > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold text-sm mb-2 text-yellow-800 dark:text-yellow-200">
                      ⚠️ Unmapped Fields
                    </h4>
                    {data.unmappedFields.map((field, idx) => (
                      <div key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                        "{field.field}" → {formatAmount(field.value)} ({field.section})
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} size="sm" className="flex-1">
                        Save Changes
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button onClick={() => onApply(editedData)} size="sm" className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Apply to Quick Entry
                      </Button>
                      <Button onClick={onView} variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button onClick={onDiscard} variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
  );
};
