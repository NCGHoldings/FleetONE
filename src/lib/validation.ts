import { z } from 'zod';

// ============================================
// PUBLIC FORM VALIDATION SCHEMAS
// ============================================

// Complaint Form Validation
export const publicComplaintSchema = z.object({
  title: z.string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: z.string()
    .min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high']),
  customerName: z.string()
    .trim()
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  customerPhone: z.string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  routeNumber: z.string()
    .trim()
    .max(50, 'Route number must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  busNumber: z.string()
    .trim()
    .max(50, 'Bus number must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  incidentDate: z.string()
    .min(1, 'Incident date is required'),
  incidentTime: z.string()
    .min(1, 'Incident time is required'),
  location: z.string()
    .trim()
    .max(500, 'Location must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  driverName: z.string()
    .trim()
    .max(100, 'Driver name must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  customerEmail: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal(''))
});

// Special Hire Form Validation
export const publicSpecialHireSchema = z.object({
  companyName: z.string()
    .trim()
    .max(200, 'Company name must be less than 200 characters')
    .optional(),
  customerName: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  customerPhone: z.string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format (10-15 digits)'),
  customerEmail: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  specialRequest: z.string()
    .trim()
    .max(1000, 'Special request must be less than 1000 characters')
    .optional(),
  hireType: z.string()
    .min(1, 'Hire type is required'),
  busTypeId: z.string()
    .min(1, 'Bus type is required'),
  numberOfBuses: z.number()
    .int()
    .min(1, 'At least 1 bus is required')
    .max(50, 'Maximum 50 buses allowed'),
  pickupLocation: z.string()
    .trim()
    .min(3, 'Pickup location must be at least 3 characters')
    .max(500, 'Pickup location must be less than 500 characters'),
  dropLocation: z.string()
    .trim()
    .min(3, 'Drop location must be at least 3 characters')
    .max(500, 'Drop location must be less than 500 characters'),
  intermediatePlaces: z.array(z.string().max(500)).max(20, 'Maximum 20 intermediate places'),
  numberOfPassengers: z.number()
    .int()
    .min(1, 'At least 1 passenger is required')
    .max(1000, 'Maximum 1000 passengers allowed'),
  pickupDateTime: z.date({
    required_error: 'Pickup date and time is required'
  }),
  dropDateTime: z.date({
    required_error: 'Drop date and time is required'
  })
}).refine(data => data.dropDateTime > data.pickupDateTime, {
  message: 'Drop date/time must be after pickup date/time',
  path: ['dropDateTime']
});

// Receipt Upload Validation
export const publicReceiptUploadSchema = z.object({
  admissionNo: z.string()
    .trim()
    .min(3, 'Admission number must be at least 3 characters')
    .max(20, 'Admission number must be less than 20 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Admission number can only contain letters, numbers, and hyphens'),
  paymentAmount: z.number()
    .positive('Payment amount must be greater than 0')
    .max(1000000, 'Payment amount must be less than 1,000,000')
});
