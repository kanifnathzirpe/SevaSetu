import defaultRules from "./triage-rules.json" with { type: "json" };

export type TriageLevel = "EMERGENCY" | "URGENT" | "ROUTINE";

export interface TriageRulesConfig {
  version: string;
  protocol: string;
  vitals: {
    spo2: { emergency_max: number; urgent_min: number; urgent_max: number; normal_min: number; normal_max: number; unit: string; hint: string };
    temperature: { emergency_min: number; urgent_min: number; urgent_comorbidity_min: number; normal_min: number; normal_max: number; unit: string; hint: string };
    systolic_bp: { emergency_high: number; emergency_low: number; urgent_high: number; urgent_low: number; normal_min: number; normal_max: number; unit: string; hint: string };
    diastolic_bp: { emergency_high: number; emergency_low: number; urgent_high: number; normal_min: number; normal_max: number; unit: string; hint: string };
    pulse: { emergency_tachycardia: number; emergency_bradycardia: number; urgent_tachycardia: number; urgent_bradycardia: number; normal_min: number; normal_max: number; unit: string; hint: string };
    weight: { unit: string; hint: string };
  };
  emergency_symptoms: string[];
  urgent_symptoms: string[];
  symptom_catalog: {
    category: string;
    label: string;
    symptoms: { id: string; name: string; severity: "emergency" | "urgent" | "routine" }[];
  }[];
  comorbidities: string[];
  high_risk_age: {
    infant_max_months: number;
    child_max_years: number;
    elderly_min_years: number;
  };
}

export interface PatientContext {
  id?: number;
  name: string;
  healthId: string;
  abhaId?: string | null;
  age: number;
  gender: string;
  isPregnant: boolean;
  chronicConditions?: string;
  locality?: string;
}

export interface TriageVitals {
  temperature?: number | null; // °F
  systolicBp?: number | null; // mmHg
  diastolicBp?: number | null; // mmHg
  pulse?: number | null; // bpm
  spo2?: number | null; // %
  weight?: number | null; // kg
}

export interface TriageInput {
  patient: PatientContext;
  selectedSymptoms: string[]; // symptom IDs or full names
  freeTextSymptoms?: string;
  vitals: TriageVitals;
}

export interface TriageTrigger {
  category: "vitals" | "symptoms" | "maternal_child" | "comorbidity";
  level: TriageLevel;
  criterion: string;
  value?: string | number;
}

export interface TriageResult {
  level: TriageLevel;
  score: number; // 0 - 100 severity index
  colorTone: "danger" | "warning" | "success";
  triggers: TriageTrigger[];
  explanation: string;
  suggestedDepartment: string;
  recommendedActions: string[];
  branchType: "emergency_sos" | "urgent_priority" | "routine_booking";
  evaluatedAt: string;
}

export interface TriageSessionRecord {
  id: string; // unique UUID / timestamp ID
  patientId?: number;
  patientHealthId: string;
  patientName: string;
  input: TriageInput;
  result: TriageResult;
  createdAt: string;
  syncStatus: "synced" | "pending";
  appointmentId?: number | null;
  referralId?: number | null;
  sosId?: number | null;
  referralNote?: string;
}

export interface TriageDraft {
  patient: PatientContext;
  selectedSymptoms: string[];
  freeTextSymptoms: string;
  vitals: TriageVitals;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Pure Clinical Triage Scoring Function                             */
/* ------------------------------------------------------------------ */

export function evaluateTriage(
  input: TriageInput,
  customRules?: TriageRulesConfig
): TriageResult {
  const rules = (customRules || defaultRules) as TriageRulesConfig;
  const triggers: TriageTrigger[] = [];
  const { vitals, patient, selectedSymptoms, freeTextSymptoms = "" } = input;
  const freeTextLower = freeTextSymptoms.toLowerCase();

  // Normalize selected symptoms
  const allCatalogSymptoms = rules.symptom_catalog.flatMap((c) => c.symptoms);
  const selectedItems = allCatalogSymptoms.filter((s) =>
    selectedSymptoms.includes(s.id) || selectedSymptoms.includes(s.name)
  );

  /* ---------------- 1. EMERGENCY CHECKS (RED) ---------------- */

  // Vitals: SpO2 critical hypoxemia
  if (vitals.spo2 != null && vitals.spo2 > 0 && vitals.spo2 <= rules.vitals.spo2.emergency_max) {
    triggers.push({
      category: "vitals",
      level: "EMERGENCY",
      criterion: `Critical hypoxemia (SpO2 ${vitals.spo2}% <= ${rules.vitals.spo2.emergency_max}%)`,
      value: vitals.spo2,
    });
  }

  // Vitals: Systolic BP Hypertensive Crisis or Shock
  if (vitals.systolicBp != null && vitals.systolicBp > 0) {
    if (vitals.systolicBp >= rules.vitals.systolic_bp.emergency_high) {
      triggers.push({
        category: "vitals",
        level: "EMERGENCY",
        criterion: `Severe Hypertensive Crisis (Systolic BP ${vitals.systolicBp} >= ${rules.vitals.systolic_bp.emergency_high} mmHg)`,
        value: vitals.systolicBp,
      });
    } else if (vitals.systolicBp <= rules.vitals.systolic_bp.emergency_low) {
      triggers.push({
        category: "vitals",
        level: "EMERGENCY",
        criterion: `Hypotensive Shock Warning (Systolic BP ${vitals.systolicBp} <= ${rules.vitals.systolic_bp.emergency_low} mmHg)`,
        value: vitals.systolicBp,
      });
    }
  }

  // Vitals: Diastolic BP Severe
  if (vitals.diastolicBp != null && vitals.diastolicBp > 0) {
    if (vitals.diastolicBp >= rules.vitals.diastolic_bp.emergency_high) {
      triggers.push({
        category: "vitals",
        level: "EMERGENCY",
        criterion: `Severe Diastolic Hypertension (Diastolic BP ${vitals.diastolicBp} >= ${rules.vitals.diastolic_bp.emergency_high} mmHg)`,
        value: vitals.diastolicBp,
      });
    } else if (vitals.diastolicBp <= rules.vitals.diastolic_bp.emergency_low) {
      triggers.push({
        category: "vitals",
        level: "EMERGENCY",
        criterion: `Critically low Diastolic BP (${vitals.diastolicBp} <= ${rules.vitals.diastolic_bp.emergency_low} mmHg)`,
        value: vitals.diastolicBp,
      });
    }
  }

  // Vitals: Extreme Pulse (Tachycardia / Bradycardia)
  if (vitals.pulse != null && vitals.pulse > 0) {
    if (vitals.pulse >= rules.vitals.pulse.emergency_tachycardia) {
      triggers.push({
        category: "vitals",
        level: "EMERGENCY",
        criterion: `Severe Tachycardia (Pulse ${vitals.pulse} >= ${rules.vitals.pulse.emergency_tachycardia} bpm)`,
        value: vitals.pulse,
      });
    } else if (vitals.pulse <= rules.vitals.pulse.emergency_bradycardia) {
      triggers.push({
        category: "vitals",
        level: "EMERGENCY",
        criterion: `Severe Bradycardia (Pulse ${vitals.pulse} <= ${rules.vitals.pulse.emergency_bradycardia} bpm)`,
        value: vitals.pulse,
      });
    }
  }

  // Vitals: Hyperpyrexia
  if (vitals.temperature != null && vitals.temperature >= rules.vitals.temperature.emergency_min) {
    triggers.push({
      category: "vitals",
      level: "EMERGENCY",
      criterion: `Hyperpyrexia Fever (${vitals.temperature} >= ${rules.vitals.temperature.emergency_min} °F)`,
      value: vitals.temperature,
    });
  }

  // Symptoms: Emergency Catalog Items
  const emergencySelected = selectedItems.filter((s) => s.severity === "emergency");
  for (const s of emergencySelected) {
    triggers.push({
      category: s.id.startsWith("mat") || s.id.startsWith("ped") ? "maternal_child" : "symptoms",
      level: "EMERGENCY",
      criterion: s.name,
    });
  }

  // Symptoms: Free-text emergency keyword match
  const emergencyKeywords = [
    { text: "crushing chest pain", desc: "Severe crushing chest pain" },
    { text: "chest pain", desc: "Severe chest pain" },
    { text: "uncontrolled bleeding", desc: "Active uncontrolled bleeding" },
    { text: "vaginal bleeding", desc: "Vaginal bleeding" },
    { text: "fetal movement", desc: "Decreased fetal movement" },
    { text: "seizure", desc: "Convulsions or seizures" },
    { text: "convulsion", desc: "Convulsions or seizures" },
    { text: "stridor", desc: "Stridor / gasping" },
    { text: "coughing blood", desc: "Coughing up blood" },
    { text: "hemoptysis", desc: "Hemoptysis" },
    { text: "loss of consciousness", desc: "Loss of consciousness" },
    { text: "unconscious", desc: "Altered consciousness" },
  ];

  for (const kw of emergencyKeywords) {
    if (freeTextLower.includes(kw.text)) {
      const alreadyTriggered = triggers.some((t) => t.level === "EMERGENCY" && t.criterion.toLowerCase().includes(kw.text));
      if (!alreadyTriggered) {
        triggers.push({
          category: "symptoms",
          level: "EMERGENCY",
          criterion: `${kw.desc} mentioned in symptom description`,
        });
      }
    }
  }

  // Maternal & Child Special Emergency Rules
  if (patient.isPregnant && (freeTextLower.includes("bleeding") || freeTextLower.includes("fluid leak") || freeTextLower.includes("no movement"))) {
    triggers.push({
      category: "maternal_child",
      level: "EMERGENCY",
      criterion: "Critical obstetric danger sign detected in pregnancy",
    });
  }

  if (patient.age <= 1 && vitals.temperature != null && vitals.temperature >= 101.5) {
    triggers.push({
      category: "maternal_child",
      level: "EMERGENCY",
      criterion: `High fever (${vitals.temperature}°F) in infant under 12 months`,
      value: vitals.temperature,
    });
  }

  // If ANY Emergency trigger, return EMERGENCY immediately
  const emergencyTriggers = triggers.filter((t) => t.level === "EMERGENCY");
  if (emergencyTriggers.length > 0) {
    const reasons = emergencyTriggers.map((t) => t.criterion).slice(0, 3).join("; ");
    const department = getSuggestedDepartment(triggers, input);

    return {
      level: "EMERGENCY",
      score: Math.min(100, 85 + emergencyTriggers.length * 5),
      colorTone: "danger",
      triggers,
      explanation: `EMERGENCY ALERT: ${reasons}. Immediate medical stabilization required.`,
      suggestedDepartment: department,
      recommendedActions: [
        "Dispatch 108 Ambulance or mobilize nearest casualty center immediately.",
        "Ensure patient airway, breathing, and circulation (ABC) support.",
        "Auto-generate Emergency Referral Slip for receiving hospital.",
        "Notify emergency casualty team and nearest medical officer.",
      ],
      branchType: "emergency_sos",
      evaluatedAt: new Date().toISOString(),
    };
  }

  /* ---------------- 2. URGENT CHECKS (AMBER) ---------------- */

  // Vitals: SpO2 Urgent Range (90 - 94%)
  if (
    vitals.spo2 != null &&
    vitals.spo2 >= rules.vitals.spo2.urgent_min &&
    vitals.spo2 <= rules.vitals.spo2.urgent_max
  ) {
    triggers.push({
      category: "vitals",
      level: "URGENT",
      criterion: `Low oxygen saturation (SpO2 ${vitals.spo2}% is in 90–94% urgent range)`,
      value: vitals.spo2,
    });
  }

  // Vitals: Blood pressure Stage 2 or moderate elevation
  if (vitals.systolicBp != null && vitals.systolicBp >= rules.vitals.systolic_bp.urgent_high) {
    triggers.push({
      category: "vitals",
      level: "URGENT",
      criterion: `Elevated Systolic BP (${vitals.systolicBp} >= ${rules.vitals.systolic_bp.urgent_high} mmHg)`,
      value: vitals.systolicBp,
    });
  } else if (vitals.systolicBp != null && vitals.systolicBp > 0 && vitals.systolicBp <= rules.vitals.systolic_bp.urgent_low) {
    triggers.push({
      category: "vitals",
      level: "URGENT",
      criterion: `Borderline low Systolic BP (${vitals.systolicBp} <= ${rules.vitals.systolic_bp.urgent_low} mmHg)`,
      value: vitals.systolicBp,
    });
  }

  if (vitals.diastolicBp != null && vitals.diastolicBp >= rules.vitals.diastolic_bp.urgent_high) {
    triggers.push({
      category: "vitals",
      level: "URGENT",
      criterion: `Elevated Diastolic BP (${vitals.diastolicBp} >= ${rules.vitals.diastolic_bp.urgent_high} mmHg)`,
      value: vitals.diastolicBp,
    });
  }

  // Vitals: Elevated Pulse
  if (vitals.pulse != null) {
    if (vitals.pulse >= rules.vitals.pulse.urgent_tachycardia) {
      triggers.push({
        category: "vitals",
        level: "URGENT",
        criterion: `Moderate Tachycardia (Pulse ${vitals.pulse} bpm)`,
        value: vitals.pulse,
      });
    } else if (vitals.pulse > 0 && vitals.pulse <= rules.vitals.pulse.urgent_bradycardia) {
      triggers.push({
        category: "vitals",
        level: "URGENT",
        criterion: `Moderate Bradycardia (Pulse ${vitals.pulse} bpm)`,
        value: vitals.pulse,
      });
    }
  }

  // Vitals: Fever evaluation (with comorbidity escalation)
  const hasComorbidity = Boolean(
    patient.chronicConditions &&
    patient.chronicConditions.trim() !== "" &&
    patient.chronicConditions.toLowerCase() !== "none" &&
    patient.chronicConditions.toLowerCase() !== "none recorded"
  );
  const isHighRiskAge = patient.age >= rules.high_risk_age.elderly_min_years || patient.age <= rules.high_risk_age.child_max_years;

  if (vitals.temperature != null) {
    if (vitals.temperature >= rules.vitals.temperature.urgent_min) {
      triggers.push({
        category: "vitals",
        level: "URGENT",
        criterion: `High Fever (${vitals.temperature} >= ${rules.vitals.temperature.urgent_min} °F)`,
        value: vitals.temperature,
      });
    } else if (
      vitals.temperature >= rules.vitals.temperature.urgent_comorbidity_min &&
      (hasComorbidity || patient.isPregnant || isHighRiskAge)
    ) {
      const riskFactor = patient.isPregnant
        ? "Pregnancy"
        : hasComorbidity
        ? `Chronic Condition (${patient.chronicConditions})`
        : `Age Risk (${patient.age} yrs)`;
      triggers.push({
        category: "comorbidity",
        level: "URGENT",
        criterion: `Fever (${vitals.temperature} °F) with high-risk factor: ${riskFactor}`,
        value: vitals.temperature,
      });
    }
  }

  // Symptoms: Urgent Catalog Items
  const urgentSelected = selectedItems.filter((s) => s.severity === "urgent");
  for (const s of urgentSelected) {
    triggers.push({
      category: "symptoms",
      level: "URGENT",
      criterion: s.name,
    });
  }

  // Symptoms: Free-text urgent keyword matches
  const urgentKeywords = [
    { text: "shortness of breath", desc: "Shortness of breath" },
    { text: "difficulty breathing", desc: "Difficulty breathing" },
    { text: "persistent vomiting", desc: "Persistent vomiting" },
    { text: "dehydration", desc: "Dehydration signs" },
    { text: "severe abdominal", desc: "Severe abdominal pain" },
    { text: "severe stomach", desc: "Severe stomach pain" },
    { text: "high fever for", desc: "Prolonged high fever" },
    { text: "blurred vision", desc: "Blurred vision / dizziness" },
    { text: "ketoacidosis", desc: "Diabetic ketoacidosis signs" },
  ];

  for (const kw of urgentKeywords) {
    if (freeTextLower.includes(kw.text)) {
      const alreadyTriggered = triggers.some((t) => t.criterion.toLowerCase().includes(kw.text));
      if (!alreadyTriggered) {
        triggers.push({
          category: "symptoms",
          level: "URGENT",
          criterion: `${kw.desc} noted in symptoms`,
        });
      }
    }
  }

  const urgentTriggers = triggers.filter((t) => t.level === "URGENT");
  if (urgentTriggers.length > 0) {
    const reasons = urgentTriggers.map((t) => t.criterion).slice(0, 3).join("; ");
    const department = getSuggestedDepartment(triggers, input);

    return {
      level: "URGENT",
      score: Math.min(80, 50 + urgentTriggers.length * 8),
      colorTone: "warning",
      triggers,
      explanation: `URGENT CARE REQUIRED: ${reasons}. Clinical evaluation recommended within 2 to 4 hours.`,
      suggestedDepartment: department,
      recommendedActions: [
        "Priority Video Consultation auto-queued with available Medical Officer.",
        "Monitor vitals closely (repeat temperature and SpO2 in 30 minutes).",
        "Keep patient hydrated and resting; avoid strenuous movement.",
        "Escalate to Emergency SOS immediately if breathing difficulty worsens.",
      ],
      branchType: "urgent_priority",
      evaluatedAt: new Date().toISOString(),
    };
  }

  /* ---------------- 3. ROUTINE (GREEN) ---------------- */

  const routineItems = selectedItems.filter((s) => s.severity === "routine");
  const symptomSummary = routineItems.length > 0
    ? routineItems.map((s) => s.name).join(", ")
    : freeTextSymptoms.trim() || "Mild / non-urgent clinical presentation";

  triggers.push({
    category: "symptoms",
    level: "ROUTINE",
    criterion: `Stable vitals and manageable symptoms (${symptomSummary})`,
  });

  const department = getSuggestedDepartment(triggers, input);

  return {
    level: "ROUTINE",
    score: Math.max(10, 20 + routineItems.length * 5),
    colorTone: "success",
    triggers,
    explanation: `ROUTINE ASSESSMENT: Vitals are within normal ranges with mild symptoms (${symptomSummary}). Scheduled outpatient care or tele-consultation is appropriate.`,
    suggestedDepartment: department,
    recommendedActions: [
      "Schedule a standard consultation with your primary care provider.",
      "Stay well-hydrated, rest, and follow symptomatic home care advice.",
      "Re-take digital triage or contact 108 if symptoms suddenly escalate.",
    ],
    branchType: "routine_booking",
    evaluatedAt: new Date().toISOString(),
  };
}

function getSuggestedDepartment(triggers: TriageTrigger[], input: TriageInput): string {
  const criteriaText = triggers.map((t) => t.criterion.toLowerCase()).join(" ") + " " + (input.freeTextSymptoms || "").toLowerCase();

  if (input.patient.isPregnant || criteriaText.includes("obstetric") || criteriaText.includes("fetal") || criteriaText.includes("pregnancy")) {
    return "Obstetrics & Gynaecology";
  }
  if (input.patient.age <= 12 || criteriaText.includes("infant") || criteriaText.includes("pediatric")) {
    return "Paediatrics";
  }
  if (criteriaText.includes("chest pain") || criteriaText.includes("tachycardia") || criteriaText.includes("bradycardia") || criteriaText.includes("hypertensive")) {
    return "Cardiology";
  }
  if (criteriaText.includes("spo2") || criteriaText.includes("hypoxemia") || criteriaText.includes("respiratory") || criteriaText.includes("breath") || criteriaText.includes("stridor") || criteriaText.includes("hemoptysis")) {
    return "Pulmonology / Respiratory Medicine";
  }
  if (criteriaText.includes("abdominal") || criteriaText.includes("vomit") || criteriaText.includes("diarrhea") || criteriaText.includes("stool")) {
    return "Gastroenterology / General Medicine";
  }
  if (triggers.some((t) => t.level === "EMERGENCY")) {
    return "Emergency & Trauma";
  }
  return "General Medicine";
}

/* ------------------------------------------------------------------ */
/*  Local Storage & Offline-First Sync Management                     */
/* ------------------------------------------------------------------ */

const DRAFT_KEY = "sevasetu.triage_draft";
const HISTORY_KEY = "sevasetu.triage_history";
const QUEUE_KEY = "sevasetu.triage_sync_queue";

export function loadTriageDraft(): Partial<TriageDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTriageDraft(draft: Partial<TriageDraft>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch {
    // ignore quota errors
  }
}

export function clearTriageDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function getLocalTriageHistory(): TriageSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalTriageSession(record: TriageSessionRecord): void {
  if (typeof window === "undefined") return;
  try {
    const history = getLocalTriageHistory();
    const updated = [record, ...history.filter((r) => r.id !== record.id)];
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, 50)));

    // If pending sync, add to sync queue
    if (record.syncStatus === "pending") {
      const queueRaw = window.localStorage.getItem(QUEUE_KEY);
      const queue: TriageSessionRecord[] = queueRaw ? JSON.parse(queueRaw) : [];
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify([record, ...queue.filter((q) => q.id !== record.id)]));
    }
  } catch {
    // ignore
  }
}

export function markSessionSynced(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const history = getLocalTriageHistory();
    const updated = history.map((item) =>
      item.id === sessionId ? { ...item, syncStatus: "synced" as const } : item
    );
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

    // Remove from sync queue
    const queueRaw = window.localStorage.getItem(QUEUE_KEY);
    if (queueRaw) {
      const queue: TriageSessionRecord[] = JSON.parse(queueRaw);
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((q) => q.id !== sessionId)));
    }
  } catch {
    // ignore
  }
}
