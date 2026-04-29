import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Student {
  id: string;
  student_name: string;
  admission_no?: string | null;
}

interface SearchableStudentSelectorProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  students: Student[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableStudentSelector({
  value,
  onValueChange,
  students,
  placeholder = "Select student...",
  disabled = false,
  className,
}: SearchableStudentSelectorProps) {
  const [open, setOpen] = useState(false);

  // Filter out students with empty ids
  const filteredStudents = useMemo(() => {
    return students.filter((student) => student.id && student.id.trim() !== "");
  }, [students]);

  const selectedStudent = useMemo(() => {
    return filteredStudents.find((student) => student.id === value);
  }, [filteredStudents, value]);

  const displayValue = selectedStudent
    ? `${selectedStudent.admission_no || 'N/A'} - ${selectedStudent.student_name}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-[250px] justify-between font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left flex-1">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 z-[100] bg-popover border shadow-lg"
        align="start"
        sideOffset={4}
      >
        <Command className="bg-popover" shouldFilter={true}>
          <div className="flex items-center border-b px-3">
            <CommandInput
              placeholder="Search by name or admission no..."
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              {filteredStudents.map((student) => (
                <CommandItem
                  key={student.id}
                  value={`${student.admission_no || ''} ${student.student_name}`}
                  onSelect={() => {
                    onValueChange(student.id === value ? null : student.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-accent"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0",
                      value === student.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-xs text-muted-foreground mr-2 flex-shrink-0">
                    {student.admission_no || 'N/A'}
                  </span>
                  <span className="truncate">{student.student_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
