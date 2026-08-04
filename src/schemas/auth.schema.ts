import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const patientRegisterStep0Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(6, 'Enter a valid phone number'),
})

export const patientRegisterStep1Schema = z.object({
  dob: z.string().min(1, 'Date of birth is required'),
  nationalId: z.string().min(5, 'Enter a valid national ID'),
})

export const patientRegisterStep2Schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
})

export const patientRegisterSchema = patientRegisterStep0Schema
  .merge(patientRegisterStep1Schema)
  .merge(patientRegisterStep2Schema)

/** Used for Google sign-ups: identity fields still required, no password to collect. */
export const patientRegisterGoogleSchema = patientRegisterStep0Schema.merge(patientRegisterStep1Schema)

export type PatientRegisterFormValues = z.infer<typeof patientRegisterSchema>

export const pinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must be numeric'),
})

export type PinFormValues = z.infer<typeof pinSchema>
