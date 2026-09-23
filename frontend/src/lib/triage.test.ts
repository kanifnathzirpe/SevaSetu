import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTriage, type TriageInput, type PatientContext, type TriageRulesConfig } from "./triage.ts";
import defaultRules from "./triage-rules.json" with { type: "json" };

const mockPatient: PatientContext = {
  id: 1,
  name: "Ramesh Patil",
  healthId: "MH-PUN-0001",
  abhaId: "14-1234-5678-9012",
  age: 45,
  gender: "male",
  isPregnant: false,
  chronicConditions: "None",
  locality: "Haveli, Pune",
};

test("Digital Triage Engine - Emergency Level Triggers", async (t) => {
  await t.test("triggers EMERGENCY when SpO2 is below 90% (critical hypoxemia)", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: ["gen_fever"],
      vitals: { spo2: 88, temperature: 99.2, systolicBp: 118, diastolicBp: 76, pulse: 84 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "EMERGENCY");
    assert.equal(result.colorTone, "danger");
    assert.equal(result.branchType, "emergency_sos");
    assert.ok(result.explanation.includes("Critical hypoxemia"));
    assert.ok(result.triggers.some((tr) => tr.category === "vitals" && tr.criterion.includes("SpO2 88%")));
  });

  await t.test("triggers EMERGENCY when severe crushing chest pain is selected", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: ["resp_chestpain"],
      vitals: { spo2: 97, temperature: 98.4, systolicBp: 124, diastolicBp: 80, pulse: 88 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "EMERGENCY");
    assert.equal(result.colorTone, "danger");
    assert.equal(result.suggestedDepartment, "Cardiology");
  });

  await t.test("triggers EMERGENCY when vaginal bleeding in pregnancy occurs", () => {
    const pregnantPatient: PatientContext = {
      ...mockPatient,
      name: "Sunita Shinde",
      gender: "female",
      age: 26,
      isPregnant: true,
    };

    const input: TriageInput = {
      patient: pregnantPatient,
      selectedSymptoms: ["mat_bleeding"],
      vitals: { spo2: 98, temperature: 98.6, systolicBp: 110, diastolicBp: 70, pulse: 78 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "EMERGENCY");
    assert.equal(result.suggestedDepartment, "Obstetrics & Gynaecology");
  });

  await t.test("triggers EMERGENCY when systolic BP >= 180 (hypertensive crisis)", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: [],
      freeTextSymptoms: "Severe pounding headache",
      vitals: { systolicBp: 190, diastolicBp: 115, pulse: 92, spo2: 98 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "EMERGENCY");
    assert.ok(result.explanation.includes("Hypertensive Crisis"));
  });

  await t.test("triggers EMERGENCY when infant has high fever", () => {
    const infantPatient: PatientContext = {
      ...mockPatient,
      name: "Baby Aarav",
      age: 0,
      gender: "male",
    };

    const input: TriageInput = {
      patient: infantPatient,
      selectedSymptoms: ["gen_fever"],
      vitals: { temperature: 102.5, spo2: 97, pulse: 120 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "EMERGENCY");
    assert.equal(result.suggestedDepartment, "Paediatrics");
  });
});

test("Digital Triage Engine - Urgent Level Triggers", async (t) => {
  await t.test("triggers URGENT when SpO2 is between 90% and 94%", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: ["resp_cough"],
      vitals: { spo2: 92, temperature: 99.0, systolicBp: 120, diastolicBp: 78, pulse: 82 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "URGENT");
    assert.equal(result.colorTone, "warning");
    assert.equal(result.branchType, "urgent_priority");
    assert.ok(result.explanation.includes("Low oxygen saturation"));
  });

  await t.test("triggers URGENT when patient has fever and known comorbidity (Diabetes/Hypertension)", () => {
    const diabeticPatient: PatientContext = {
      ...mockPatient,
      chronicConditions: "Type 2 Diabetes Mellitus, Hypertension",
    };

    const input: TriageInput = {
      patient: diabeticPatient,
      selectedSymptoms: ["gen_fever"],
      vitals: { temperature: 100.8, spo2: 97, systolicBp: 130, diastolicBp: 82, pulse: 86 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "URGENT");
    assert.equal(result.colorTone, "warning");
    assert.ok(result.triggers.some((tr) => tr.category === "comorbidity"));
  });

  await t.test("triggers URGENT when high fever >= 102°F even without comorbidity", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: ["gen_fever", "gen_bodyache"],
      vitals: { temperature: 102.4, spo2: 98, systolicBp: 118, diastolicBp: 76, pulse: 94 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "URGENT");
    assert.equal(result.colorTone, "warning");
  });

  await t.test("triggers URGENT when moderate shortness of breath is selected", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: ["resp_sob_mod"],
      vitals: { spo2: 96, temperature: 98.6, systolicBp: 122, diastolicBp: 80, pulse: 90 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "URGENT");
  });
});

test("Digital Triage Engine - Routine Level", async (t) => {
  await t.test("triggers ROUTINE for mild symptoms with normal vitals", () => {
    const input: TriageInput = {
      patient: mockPatient,
      selectedSymptoms: ["resp_sorethroat"],
      freeTextSymptoms: "Mild scratchy throat and slight runny nose since yesterday",
      vitals: { temperature: 98.4, systolicBp: 116, diastolicBp: 74, pulse: 72, spo2: 98, weight: 68 },
    };

    const result = evaluateTriage(input);
    assert.equal(result.level, "ROUTINE");
    assert.equal(result.colorTone, "success");
    assert.equal(result.branchType, "routine_booking");
    assert.ok(result.explanation.includes("ROUTINE ASSESSMENT"));
  });
});

test("Digital Triage Engine - Configurable Rules & Pure Function Behavior", () => {
  // Test with custom rules where SpO2 emergency threshold is altered
  const customRules: TriageRulesConfig = {
    ...defaultRules,
    vitals: {
      ...defaultRules.vitals,
      spo2: {
        ...defaultRules.vitals.spo2,
        emergency_max: 85, // lowered threshold
      },
    },
  } as TriageRulesConfig;

  const input: TriageInput = {
    patient: mockPatient,
    selectedSymptoms: [],
    vitals: { spo2: 87 }, // 87 is > 85, so with custom rules it should NOT trigger emergency by SpO2
  };

  const resultCustom = evaluateTriage(input, customRules);
  assert.notEqual(resultCustom.level, "EMERGENCY"); // Should be URGENT (87 is in 90-94 range or below 90)

  // With default rules (emergency_max: 89), 87 MUST trigger EMERGENCY
  const resultDefault = evaluateTriage(input);
  assert.equal(resultDefault.level, "EMERGENCY");
});
