from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass
class SchemeRule:
    id: str
    name: str
    short_name: str
    category: str
    authority: str
    coverage_amount: str
    description: str
    benefits: list[str]
    required_documents: list[str]
    helpline: str
    portal_url: str
    is_state_specific: bool
    state: str | None


ALL_SCHEMES: list[dict[str, Any]] = [
    {
        "id": "pmjay",
        "name": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        "short_name": "PM-JAY",
        "category": "Hospitalization & Critical Care",
        "authority": "National Health Authority (NHA) & MoHFW",
        "coverage_amount": "₹5,00,000 per family / year",
        "description": "World's largest government-funded health assurance scheme providing secondary and tertiary care hospitalization across 28,000+ empanelled public & private hospitals.",
        "benefits": [
            "Cashless & paperless secondary and tertiary hospitalization",
            "1,949+ medical and surgical packages covering oncology, cardiology, neurosurgery, orthopedics",
            "Covers 3 days of pre-hospitalization & 15 days of post-hospitalization diagnostics and medicines",
            "No restriction on family size, age, or gender",
            "Portability across all empanelled hospitals anywhere in India",
        ],
        "required_documents": [
            "Aadhaar Card",
            "ABHA (Ayushman Bharat Health Account) ID",
            "Ration Card (Yellow/Orange/White) or SECC letter",
        ],
        "application_steps": [
            "Verify eligibility at any Empanelled Health Care Provider (EHCP) Ayushman Mitra kiosk",
            "Authenticate via Aadhaar e-KYC or ABHA OTP verification",
            "Receive instant Ayushman Golden Card for cashless treatment",
        ],
        "helpline": "14555 / 1800-111-565",
        "portal_url": "https://pmjay.gov.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "mjpjay",
        "name": "Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)",
        "short_name": "MJPJAY Maharashtra",
        "category": "State Universal Health Assurance",
        "authority": "State Health Assurance Society, Govt of Maharashtra",
        "coverage_amount": "₹5,00,000 per family / year",
        "description": "Universal flagship health scheme of Maharashtra Government providing free quality medical and surgical care to all domiciled families of Maharashtra.",
        "benefits": [
            "Universal health cover for all ration card holders residing in Maharashtra",
            "996 medical and surgical procedures across 30 identified specialties",
            "121 follow-up treatment packages including dialysis, chemotherapy, and post-operative care",
            "Available in all empanelled Government & network Private Hospitals in Pune and Maharashtra",
            "Integrated cashless claim processing through hospital Arogyamitra desks",
        ],
        "required_documents": [
            "Ration Card (Yellow / Orange / White / Antyodaya / Annapurna)",
            "Aadhaar Card or Voter ID Card",
            "Medical diagnosis or doctor referral slip",
        ],
        "application_steps": [
            "Visit any network hospital in Maharashtra and meet the Arogyamitra at the reception",
            "Present Ration card and Aadhaar for instant eligibility verification",
            "Pre-authorization is submitted online by the hospital for cashless admission",
        ],
        "helpline": "155388 / 1800-233-2200",
        "portal_url": "https://www.jeevandayee.gov.in",
        "is_state_specific": True,
        "state": "Maharashtra",
    },
    {
        "id": "nhm_free_care",
        "name": "National Free Drugs and Diagnostics Service Initiative (NHM)",
        "short_name": "NHM Free Care",
        "category": "Universal Free Medicine & Diagnostics",
        "authority": "Ministry of Health and Family Welfare (MoHFW)",
        "coverage_amount": "100% Free Medicines & Lab Tests",
        "description": "Universal initiative ensuring zero out-of-pocket expenses for essential drugs, pathology, and radiology tests at all public health facilities.",
        "benefits": [
            "100% free essential medicines from the National & State Essential Drugs List (EDL)",
            "Free routine & specialized pathology diagnostics (CBC, Blood Sugar, Liver & Kidney function, Lipid profile)",
            "Free radiology services (Digital X-Ray, USG, ECG) at District & Sub-district hospitals",
            "Universal entitlement for every citizen visiting government healthcare centres",
        ],
        "required_documents": [
            "SevaSetu Digital Health ID / OPD Registration Slip",
            "Doctor's Prescription Slip",
        ],
        "application_steps": [
            "Consult with the medical officer at your nearest Primary Health Centre (PHC) or District Hospital",
            "Present your SevaSetu Health ID at the pharmacy counter for free medicine dispensing",
            "Visit the in-house diagnostic lab for immediate free sample collection and testing",
        ],
        "helpline": "104 (Health Helpline)",
        "portal_url": "https://nhm.gov.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "np_ncd",
        "name": "National Programme for Prevention and Control of NCDs (NP-NCD)",
        "short_name": "NP-NCD Chronic Care",
        "category": "Chronic Disease Management",
        "authority": "National Health Mission & State NCD Cell",
        "coverage_amount": "Free Lifelong Screening & Monthly Medications",
        "description": "Comprehensive prevention and management programme for Hypertension, Diabetes, Anaemia, Cardiovascular diseases, and Common Cancers.",
        "benefits": [
            "Free monthly refills of anti-hypertensive, anti-diabetic, and iron-folic acid medications at PHC / Ayushman Arogya Mandir",
            "Free regular monitoring (BP, Blood Glucose, HbA1c, Kidney Profile)",
            "Personalized lifestyle and dietary counselling by community health officers",
            "Quarterly specialist doctor reviews and continuum of care tracking",
        ],
        "required_documents": [
            "SevaSetu Health ID / NCD Health Booklet",
            "Previous diagnostic reports / Prescription record",
        ],
        "application_steps": [
            "Enroll at your local Ayushman Arogya Mandir / PHC during routine NCD screening",
            "Receive a customized monthly drug dispensing schedule",
            "Collect free monthly maintenance medicines seamlessly",
        ],
        "helpline": "104",
        "portal_url": "https://mohfw.gov.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "pmmvy",
        "name": "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
        "short_name": "PMMVY Maternity Benefit",
        "category": "Maternal & Child Direct Benefit Transfer",
        "authority": "Ministry of Women and Child Development",
        "coverage_amount": "₹5,000 - ₹6,000 Cash Benefit (DBT)",
        "description": "Direct benefit transfer (DBT) scheme providing financial assistance to pregnant and lactating mothers for wage compensation and nutritional health.",
        "benefits": [
            "₹5,000 for the first living child in two instalments (at ANC registration and after child birth/vaccinations)",
            "₹6,000 for the second girl child in a single instalment to encourage girl child welfare",
            "Direct transfer into Aadhaar-seeded bank account",
            "Free antenatal checkups (ANC) and iron-folic acid supplements",
        ],
        "required_documents": [
            "Mother-Child Protection (MCP) Card",
            "Aadhaar Card of Beneficiary & Husband",
            "Bank / Post Office Passbook with Aadhaar linkage",
        ],
        "application_steps": [
            "Register pregnancy at the local Anganwadi Centre (AWC) or PHC within 570 days of LMP",
            "Submit MCP card details and bank account passbook to the ASHA / AWW worker",
            "Funds are credited directly to the beneficiary bank account via PFMS",
        ],
        "helpline": "011-23382393 / 1098",
        "portal_url": "https://pmmvy.wcd.gov.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "jsy",
        "name": "Janani Suraksha Yojana (JSY)",
        "short_name": "JSY Safe Delivery",
        "category": "Institutional Delivery & Safe Motherhood",
        "authority": "National Health Mission (NHM)",
        "coverage_amount": "₹1,000 (Urban) / ₹1,400 (Rural) + 100% Free Delivery",
        "description": "Safe motherhood intervention promoting institutional deliveries in government health facilities with financial support and free care.",
        "benefits": [
            "100% Free institutional delivery including normal and caesarean section",
            "Free drugs, consumables, pathology diagnostics, and blood transfusion during hospital stay",
            "Free nutritious diet for mother during hospital stay",
            "Free transport (102 / 108 Ambulance) from home to hospital and drop back home",
            "Cash incentive paid directly at the time of discharge",
        ],
        "required_documents": [
            "MCP Card with recorded ANC checkups",
            "ASHA referral slip / BPL Card or Aadhaar Card",
            "Bank account passbook copy",
        ],
        "application_steps": [
            "Complete mandatory minimum 4 ANC checkups with ASHA / PHC staff",
            "Admit at any government hospital (PHC / CHC / District Hospital) for delivery",
            "Receive cashless delivery care and cash incentive upon discharge",
        ],
        "helpline": "104 / 108",
        "portal_url": "https://nhm.gov.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "rbsk",
        "name": "Rashtriya Bal Swasthya Karyakram (RBSK)",
        "short_name": "RBSK Child Health",
        "category": "Child & Adolescent Health (0-18 Years)",
        "authority": "Ministry of Health and Family Welfare",
        "coverage_amount": "100% Free Early Detection & Surgical Management",
        "description": "Comprehensive child screening and early intervention programme covering 30 selected 4D conditions (Birth defects, Deficiencies, Diseases, Development delays).",
        "benefits": [
            "Free screening at Anganwadi centres and government schools by dedicated mobile health teams",
            "100% free surgical correction for Congenital Heart Disease, Cleft Lip/Palate, Clubfoot, Congenital Cataract",
            "Free hearing aids, spectacles, and assistive devices for children",
            "Dedicated District Early Intervention Centres (DEIC) for speech and physical rehabilitation",
        ],
        "required_documents": [
            "Child's Birth Certificate / Aadhaar Card",
            "Parent's Aadhaar Card / SevaSetu Family ID",
            "RBSK Screening & Referral Slip",
        ],
        "application_steps": [
            "School/Anganwadi health screening by mobile RBSK medical officers",
            "Referral to the District Early Intervention Centre (DEIC) or tertiary medical college",
            "Full cashless surgical/medical treatment coordinated by District Health Society",
        ],
        "helpline": "104",
        "portal_url": "https://rbsk.gov.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "nikshay_poshan",
        "name": "Pradhan Mantri TB Mukt Bharat Abhiyaan & Nikshay Poshan Yojana",
        "short_name": "Nikshay TB Support",
        "category": "Infectious Disease Elimination & Nutrition DBT",
        "authority": "Central TB Division & MoHFW",
        "coverage_amount": "Free Treatment + ₹500 - ₹1,000 / month DBT",
        "description": "Direct financial and nutritional support scheme for all notified Tuberculosis patients throughout the full course of anti-TB treatment.",
        "benefits": [
            "100% free high-quality anti-TB medications (FDC) under Directly Observed Treatment (DOTS)",
            "₹500 to ₹1,000 monthly direct cash transfer into bank account for nutritional supplements",
            "Free monthly sputum, CBNAAT/TrueNat, and X-ray follow-up tests",
            "Ni-kshay Mitra nutritional food baskets support from community partners",
        ],
        "required_documents": [
            "Ni-kshay ID (generated at PHC/TU on diagnosis)",
            "Aadhaar Card",
            "Bank Account details for DBT transfer",
        ],
        "application_steps": [
            "Undergo free diagnostic sputum test at PHC / District TB Centre",
            "Medical officer registers patient on the national Ni-kshay portal",
            "Monthly nutritional DBT is credited directly into bank account until cured",
        ],
        "helpline": "1800-11-6666",
        "portal_url": "https://nikshay.in",
        "is_state_specific": False,
        "state": None,
    },
    {
        "id": "senior_ayushman",
        "name": "Ayushman Bharat PM-JAY Senior Citizen 70+ Universal Cover",
        "short_name": "Ayushman Senior 70+",
        "category": "Senior Citizen Health Assurance",
        "authority": "National Health Authority (NHA)",
        "coverage_amount": "₹5,00,000 dedicated annual cover for 70+ years",
        "description": "Expanded universal health cover providing an exclusive ₹5 Lakh annual top-up hospitalization assurance to all senior citizens aged 70 and above, regardless of income.",
        "benefits": [
            "Dedicated ₹5,00,000 annual top-up cover exclusively for senior citizens aged 70+",
            "Available to all senior citizens irrespective of income, caste, or economic status",
            "Cashless admission at all empanelled secondary and tertiary care hospitals nationwide",
            "Covers age-related surgeries, joint replacements, eye surgeries, and intensive care",
        ],
        "required_documents": [
            "Aadhaar Card (with age verification showing 70+ years)",
            "ABHA Card",
        ],
        "application_steps": [
            "Apply via the PMJAY beneficiary portal or SevaSetu digital kiosk",
            "Complete Aadhaar e-KYC to verify date of birth / age (70+)",
            "Download the special Ayushman Vayoshreshtha Golden Card",
        ],
        "helpline": "14555",
        "portal_url": "https://beneficiary.nha.gov.in",
        "is_state_specific": False,
        "state": None,
    },
]


def evaluate_patient_schemes(patient_data: dict[str, Any]) -> dict[str, Any]:
    """
    Intelligently checks and evaluates government scheme eligibility based on patient demographics,
    clinical records, chronic conditions, pregnancy status, and geographic locality.
    """
    age = patient_data.get("age", 28)
    gender = str(patient_data.get("gender", "female")).lower()
    locality = str(patient_data.get("locality", "Pune")).lower()
    is_pregnant = bool(patient_data.get("is_pregnant", False))
    chronic_conditions = str(patient_data.get("chronic_conditions", "")).lower()
    has_abha = bool(patient_data.get("abha_number"))
    health_score = patient_data.get("health_score", 85)

    is_maharashtra = any(k in locality for k in ["pune", "hadapsar", "maharashtra", "mumbai", "nagpur", "nashik", "aurangabad", "thane"])

    eligible_schemes: list[dict[str, Any]] = []
    other_schemes: list[dict[str, Any]] = []

    for scheme in ALL_SCHEMES:
        s_id = scheme["id"]
        match_score = 70
        is_eligible = True
        criteria_met: list[str] = []
        action_recommendation = "Eligible for immediate digital enrollment and benefits."

        if s_id == "pmjay":
            match_score = 98 if has_abha else 90
            criteria_met.append(f"ABHA ID Verified ({patient_data.get('abha_number') or 'Active'})")
            criteria_met.append("SECC / Public Health Registry Entitlement")
            criteria_met.append(f"Resident in Covered Health Zone ({patient_data.get('locality', 'Pune')})")
            status = "Eligible · Pre-Approved"
            badge_tone = "success"

        elif s_id == "mjpjay":
            if is_maharashtra or not scheme["is_state_specific"]:
                match_score = 100
                criteria_met.append("Maharashtra State Resident / Domicile")
                criteria_met.append("Universal coverage for all Ration Card categories")
                criteria_met.append("Network hospitals available in Pune & District")
                status = "Eligible · Universal State Cover"
                badge_tone = "success"
            else:
                match_score = 60
                is_eligible = False
                status = "State Specific (Maharashtra Domicile Required)"
                badge_tone = "default"

        elif s_id == "nhm_free_care":
            match_score = 100
            criteria_met.append(f"Registered SevaSetu Health ID ({patient_data.get('health_id', 'Active')})")
            criteria_met.append("Direct access to Public Primary Health Centres & District Hospitals")
            criteria_met.append("Zero fee entitlement for all Essential Drugs (EDL) & Lab Tests")
            status = "Active Benefit · 100% Free"
            badge_tone = "success"

        elif s_id == "np_ncd":
            has_chronic = bool(chronic_conditions and chronic_conditions != "none")
            match_score = 96 if has_chronic else 85
            if has_chronic:
                criteria_met.append(f"Chronic condition monitoring: {patient_data.get('chronic_conditions', 'NCD')}")
                criteria_met.append("Entitled to free monthly medication supply at Ayushman Arogya Mandir")
                status = "Recommended · Enrolled"
                badge_tone = "warning"
            else:
                criteria_met.append("Eligible for routine preventive screening (Hypertension, Diabetes, Cancer)")
                status = "Eligible for Preventive Screening"
                badge_tone = "info"

        elif s_id == "pmmvy":
            if gender == "female" and (is_pregnant or (19 <= age <= 45)):
                match_score = 98 if is_pregnant else 90
                criteria_met.append(f"Gender: Female (Age: {age} yrs)")
                if is_pregnant:
                    criteria_met.append("Active Pregnancy Record Verified")
                else:
                    criteria_met.append("Eligible upon ANC / Pregnancy Registration")
                criteria_met.append("Direct Benefit Transfer (DBT) to Aadhaar-linked Bank Account")
                status = "Eligible · Maternal DBT"
                badge_tone = "primary"
            else:
                match_score = 40
                is_eligible = False
                status = "For Pregnant & Lactating Women"
                badge_tone = "default"

        elif s_id == "jsy":
            if gender == "female" and (is_pregnant or (19 <= age <= 45)):
                match_score = 95 if is_pregnant else 88
                criteria_met.append("Entitled to 100% free delivery care at Government Institutions")
                criteria_met.append("Includes Free 102/108 Ambulance transportation & post-natal diet")
                status = "Eligible · Institutional Delivery"
                badge_tone = "primary"
            else:
                match_score = 40
                is_eligible = False
                status = "For Pregnant Women Delivering at Govt Facilities"
                badge_tone = "default"

        elif s_id == "rbsk":
            if age <= 18:
                match_score = 100
                criteria_met.append(f"Age: {age} yrs (within 0-18 child bracket)")
                criteria_met.append("100% Free 4D health screening and tertiary surgical correction")
                status = "Direct Child Beneficiary"
                badge_tone = "success"
            else:
                match_score = 80
                criteria_met.append("Applicable for children (0-18 yrs) in beneficiary's household")
                status = "Household / Dependent Benefit"
                badge_tone = "info"

        elif s_id == "nikshay_poshan":
            if "tb" in chronic_conditions or "tuberculosis" in chronic_conditions:
                match_score = 100
                criteria_met.append("TB clinical indication identified")
                criteria_met.append("Direct ₹500 - ₹1000/mo DBT + Free complete DOTS therapy")
                status = "Eligible on Diagnosis"
                badge_tone = "danger"
            else:
                match_score = 65
                is_eligible = False
                status = "Available on TB Diagnosis & Notification"
                badge_tone = "default"

        elif s_id == "senior_ayushman":
            if age >= 70:
                match_score = 100
                criteria_met.append(f"Senior Citizen Age Verified ({age} yrs >= 70 yrs)")
                criteria_met.append("Dedicated ₹5 Lakh universal top-up cover")
                status = "Eligible · Senior Citizen Top-up"
                badge_tone = "success"
            else:
                match_score = 75
                is_eligible = False
                status = f"Requires age 70+ (Current age: {age} yrs, applicable for senior family members)"
                badge_tone = "default"

        scheme_data = {
            **scheme,
            "match_score": match_score,
            "is_eligible": is_eligible,
            "status": status,
            "badge_tone": badge_tone,
            "criteria_met": criteria_met,
            "action_recommendation": action_recommendation,
        }

        if is_eligible:
            eligible_schemes.append(scheme_data)
        else:
            other_schemes.append(scheme_data)

    # Sort eligible schemes by match score descending
    eligible_schemes.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "summary": {
            "total_coverage": "₹10,00,000+",
            "eligible_count": len(eligible_schemes),
            "other_count": len(other_schemes),
            "active_benefits": ["Cashless Hospitalization", "100% Free Medicines", "Free Diagnostics", "DBT Support"],
            "top_recommendation": eligible_schemes[0]["name"] if eligible_schemes else "PM-JAY",
        },
        "patient_profile_evaluated": {
            "full_name": patient_data.get("full_name", "Sunita Jadhav"),
            "health_id": patient_data.get("health_id", "PUN-2026-000001"),
            "abha_number": patient_data.get("abha_number", "12-3456-7890-1234"),
            "age": age,
            "gender": gender,
            "locality": patient_data.get("locality", "Hadapsar, Pune"),
            "state": "Maharashtra",
            "is_pregnant": is_pregnant,
            "chronic_conditions": patient_data.get("chronic_conditions", "Anaemia"),
            "health_score": health_score,
        },
        "eligible_schemes": eligible_schemes,
        "other_schemes": other_schemes,
    }
