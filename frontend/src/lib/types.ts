import type { Role } from "./api";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface Hospital {
  id: number;
  name: string;
  facility_type: string;
  address: string;
  locality: string;
  district: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  total_beds: number;
  available_beds: number;
  icu_beds: number;
  available_icu_beds: number;
  has_emergency: boolean;
  has_blood_bank: boolean;
  has_vaccination_center: boolean;
  open_24x7: boolean;
  rating: number;
  services: string;
  distance_km?: number | null;
}

export interface Doctor {
  id: number;
  full_name: string;
  specialization: string;
  qualification: string;
  registration_no: string;
  experience_years: number;
  consultation_fee: number;
  languages: string;
  available_from: string;
  available_to: string;
  is_available_online: boolean;
  rating: number;
  bio: string;
  hospital_id?: number | null;
  hospital_name?: string | null;
}

export interface Patient {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  health_id: string;
  date_of_birth: string;
  age: number;
  gender: string;
  blood_group: string;
  height_cm: number;
  weight_kg: number;
  address: string;
  locality: string;
  pincode: string;
  latitude: number;
  longitude: number;
  abha_number?: string | null;
  allergies: string;
  chronic_conditions: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  health_score: number;
  risk_level: RiskLevel;
  is_pregnant: boolean;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  hospital_id?: number | null;
  patient_name: string;
  doctor_name: string;
  hospital_name?: string | null;
  specialization: string;
  scheduled_at: string;
  appointment_type: "in_person" | "video" | "home_visit";
  status: "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled";
  reason: string;
  token_number: number;
  queue_position?: number | null;
  diagnosis: string;
  notes: string;
  video_room_id?: string | null;
}

export interface PrescriptionItem {
  id: number;
  medicine_name: string;
  dosage: string;
  duration_days: number;
  instructions: string;
}

export interface Prescription {
  id: number;
  patient_id: number;
  doctor_id: number;
  patient_name: string;
  doctor_name: string;
  issued_on: string;
  diagnosis: string;
  advice: string;
  follow_up_date?: string | null;
  items: PrescriptionItem[];
}

export interface Report {
  id: number;
  patient_id: number;
  patient_name: string;
  report_type: string;
  title: string;
  summary: string;
  result_json: string;
  file_url?: string | null;
  report_date: string;
  is_abnormal: boolean;
  doctor_name?: string | null;
  hospital_name?: string | null;
}

export interface Medicine {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  form: string;
  strength: string;
  unit_price: number;
  is_essential: boolean;
  description: string;
}

export interface MedicineReminder {
  id: number;
  medicine_name: string;
  dosage: string;
  times_of_day: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  adherence_percent: number;
}

export interface Vaccination {
  id: number;
  vaccine_name: string;
  dose_label: string;
  scheduled_date: string;
  administered_date?: string | null;
  status: "due" | "completed" | "overdue" | "skipped";
  center_name: string;
  patient_id?: number | null;
  child_id?: number | null;
  beneficiary_name: string;
}

export interface Child {
  id: number;
  name: string;
  date_of_birth: string;
  gender: string;
  birth_weight_kg: number;
  current_weight_kg: number;
  height_cm: number;
  nutrition_status: string;
  locality: string;
  age_months: number;
  vaccinations_due: number;
}

export interface Pregnancy {
  id: number;
  patient_id: number;
  patient_name: string;
  lmp_date: string;
  edd_date: string;
  gestation_weeks: number;
  gravida: number;
  parity: number;
  hemoglobin: number;
  bp_systolic: number;
  bp_diastolic: number;
  weight_kg: number;
  anc_visits_completed: number;
  risk_level: RiskLevel;
  notes: string;
  delivered: boolean;
}

export interface Household {
  id: number;
  household_code: string;
  head_name: string;
  phone: string;
  address: string;
  locality: string;
  members_count: number;
  latitude: number;
  longitude: number;
  has_toilet: boolean;
  water_source: string;
  risk_level: RiskLevel;
  last_visit_date?: string | null;
}

export interface Visit {
  id: number;
  household_id: number;
  household_name: string;
  locality: string;
  patient_id?: number | null;
  visit_date: string;
  purpose: string;
  status: "planned" | "completed" | "missed";
  notes: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  temperature_c?: number | null;
  weight_kg?: number | null;
  medicines_given: string;
  synced: boolean;
}

export interface Referral {
  id: number;
  patient_id: number;
  patient_name: string;
  from_facility: string;
  to_hospital_id?: number | null;
  to_hospital_name?: string | null;
  reason: string;
  urgency: RiskLevel;
  status: "open" | "accepted" | "closed";
  notes: string;
  created_at: string;
}

export interface Sos {
  id: number;
  patient_id?: number | null;
  patient_name: string;
  emergency_type: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  status: "requested" | "dispatched" | "en_route" | "arrived" | "completed" | "cancelled";
  eta_minutes?: number | null;
  ambulance_number?: string | null;
  ambulance_driver?: string | null;
  ambulance_phone?: string | null;
  hospital_name?: string | null;
  created_at: string;
}

export interface Ambulance {
  id: number;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  vehicle_type: string;
  status: string;
  latitude: number;
  longitude: number;
  current_location: string;
  has_oxygen: boolean;
  has_ventilator: boolean;
  hospital_name?: string | null;
  distance_km?: number | null;
}

export interface ChatThread {
  id: number;
  subject: string;
  participant_a_id: number;
  participant_b_id: number;
  other_party_name: string;
  other_party_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  thread_id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  attachment_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ChatContact {
  id: number;
  full_name: string;
  role: Role;
  locality: string;
}

export interface VideoSession {
  id: number;
  room_id: string;
  appointment_id?: number | null;
  doctor_user_id: number;
  patient_user_id: number;
  status: string;
  doctor_name: string;
  patient_name: string;
  ice_servers: { urls: string }[];
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  category: string;
  severity: string;
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
}

export interface SymptomCheckResult {
  triage_level: RiskLevel;
  suggested_department: string;
  predicted_conditions: { condition: string; confidence: number; description: string }[];
  advice: string[];
  red_flags: string[];
  recommended_action: string;
  self_care: string[];
}

export interface PatientDashboard {
  patient: Patient;
  stats: {
    health_score: number;
    bmi: number;
    upcoming_appointments: number;
    active_reminders: number;
    pending_vaccinations: number;
    total_reports: number;
    prescriptions: number;
  };
  upcoming_appointments: Appointment[];
  recent_reports: Report[];
  medicine_reminders: MedicineReminder[];
  vaccinations_due: Vaccination[];
  vitals_trend: { date: string; systolic: number; diastolic: number; pulse: number; sugar: number }[];
}

export interface DoctorDashboard {
  doctor: Doctor;
  stats: {
    today_appointments: number;
    pending_today: number;
    completed_today: number;
    total_patients: number;
    prescriptions_issued: number;
    video_consultations: number;
  };
  weekly_trend: { day: string; appointments: number; completed: number }[];
  upcoming: Appointment[];
}

export interface DoctorQueue {
  date: string;
  now_serving: Appointment | null;
  waiting: Appointment[];
  completed: Appointment[];
  average_wait_minutes: number;
}

export interface AshaDashboard {
  asha: {
    id: number;
    name: string;
    asha_code: string;
    assigned_area: string;
    village_or_ward: string;
    supervisor_name: string;
    daily_visit_target: number;
  };
  stats: {
    households: number;
    assigned_patients: number;
    visits_today: number;
    completed_today: number;
    target_completion_percent: number;
    pregnancies_tracked: number;
    high_risk_cases: number;
    pending_sync: number;
    vaccinations_due: number;
  };
  weekly_trend: { day: string; planned: number; completed: number }[];
  today_visits: Visit[];
  high_risk: Pregnancy[];
}

export interface AdminDashboard {
  stats: {
    total_patients: number;
    total_doctors: number;
    total_asha_workers: number;
    total_hospitals: number;
    total_ambulances: number;
    appointments_today: number;
    active_sos: number;
    high_risk_pregnancies: number;
    immunisation_coverage_percent: number;
    bed_occupancy_percent: number;
    total_beds: number;
    available_beds: number;
    visits_this_month: number;
    open_referrals: number;
  };
  appointment_trend: { date: string; appointments: number; completed: number }[];
  facility_split: { facility_type: string; count: number }[];
  patients_by_locality: { locality: string; patients: number }[];
  top_specializations: { specialization: string; doctors: number }[];
}

export interface InventoryItem {
  id: number;
  hospital_id: number;
  hospital_name: string;
  medicine_id: number;
  medicine_name: string;
  category: string;
  strength: string;
  batch_no: string;
  quantity: number;
  reorder_level: number;
  expiry_date: string;
  expiring_soon: boolean;
  status: string;
}

export interface AshaWorkerRow {
  id: number;
  name: string;
  asha_code: string;
  phone: string;
  assigned_area: string;
  households: number;
  experience_years: number;
  visits_this_month: number;
}

export interface OutbreakForecast {
  locality: string;
  generated_on: string;
  forecasts: {
    disease: string;
    current_cases: number;
    projected_next_week: number;
    growth_percent: number;
    risk: RiskLevel;
  }[];
}

export interface HeatmapData {
  points: {
    disease: string;
    locality: string;
    lat: number;
    lng: number;
    cases: number;
    severity: RiskLevel;
    reported_on: string;
  }[];
  totals_by_disease: { disease: string; cases: number }[];
  totals_by_locality: { locality: string; cases: number }[];
  forecast: OutbreakForecast;
}

export interface VaccinationDashboard {
  overall_coverage_percent: number;
  due_this_week: number;
  overdue: number;
  by_vaccine: { vaccine: string; total: number; completed: number; coverage_percent: number }[];
  children_by_locality: { locality: string; children: number }[];
}

export interface EmergencyConsole {
  stats: {
    active_cases: number;
    ambulances_total: number;
    ambulances_available: number;
    ambulances_on_duty: number;
    critical_cases: number;
  };
  active_sos: Sos[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
}

export interface HealthCard {
  health_id: string;
  abha_number: string | null;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string;
  locality: string;
  district: string;
  state: string;
  emergency_contact: { name: string; phone: string };
  allergies: string[];
  chronic_conditions: string[];
  issued_on: string;
  qr_payload: string;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  short_name: string;
  category: string;
  authority: string;
  coverage_amount: string;
  description: string;
  benefits: string[];
  required_documents: string[];
  application_steps: string[];
  helpline: string;
  portal_url: string;
  is_state_specific: boolean;
  state?: string | null;
  match_score: number;
  is_eligible: boolean;
  status: string;
  badge_tone: "default" | "primary" | "success" | "warning" | "danger" | "info";
  criteria_met: string[];
  action_recommendation: string;
}

export interface SchemeEvaluationResult {
  summary: {
    total_coverage: string;
    eligible_count: number;
    other_count: number;
    active_benefits: string[];
    top_recommendation: string;
  };
  patient_profile_evaluated: {
    full_name: string;
    health_id: string;
    abha_number: string | null;
    age: number;
    gender: string;
    locality: string;
    state: string;
    is_pregnant: boolean;
    chronic_conditions: string;
    health_score: number;
  };
  eligible_schemes: GovernmentScheme[];
  other_schemes: GovernmentScheme[];
}

