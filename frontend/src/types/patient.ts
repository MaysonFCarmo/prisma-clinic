export type Patient = {
  id: string
  clinic_id: string
  full_name: string
  preferred_name: string | null
  birth_date: string | null
  email: string | null
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_relationship: string | null
  administrative_notes: string | null
  active: boolean
  updated_at: string
}