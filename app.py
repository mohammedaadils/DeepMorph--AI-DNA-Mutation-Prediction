import numpy as np
import json
import pickle
import tensorflow as tf
import os
import re
import uuid
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

# ── Load ML model and encoders ──
model_path = "deepmorph_top15_model.keras"
model = tf.keras.models.load_model(model_path)

with open("gene_encoder_top15.pkl", "rb") as f:
    gene_encoder = pickle.load(f)

with open("clinical_encoder_top15.pkl", "rb") as f:
    clinical_encoder = pickle.load(f)

with open("gene_disease_map_top15.json", "r") as f:
    gene_disease_map = json.load(f)

with open("disease_info_top15.json", "r") as f:
    disease_info = json.load(f)

# ── Reference sequence for hotspot detection ──
REFERENCE_SEQUENCE = "A" * 100


def get_disease_details(raw_disease, dinfo_dict):
    raw_clean = raw_disease.lower()
    raw_words = set(re.findall(r'\w+', raw_clean))

    best_key = None
    max_score = 0

    for k in dinfo_dict.keys():
        k_clean = k.lower()
        k_words = set(re.findall(r'\w+', k_clean))
        score = len(raw_words.intersection(k_words))
        if k_clean in raw_clean or raw_clean in k_clean:
            if len(raw_clean) > 4:
                score += 10
        if score > max_score:
            max_score = score
            best_key = k

    if max_score > 0 and best_key:
        return best_key, dinfo_dict[best_key]

    return raw_disease, {
        "description": "No detailed information available for this condition.",
        "symptoms": []
    }


# ── FastAPI app ──
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Templates and static
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Pydantic models ──
class SequenceInput(BaseModel):
    sequence: str
    patient_id: Optional[str] = None

class LoginInput(BaseModel):
    email: str
    password: str

class PatientInput(BaseModel):
    name: str
    age: int
    gender: str

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class ReportInput(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    mutation_status: str
    mutation_confidence: float
    mutation_hotspot: Optional[int] = None
    reference_base: Optional[str] = None
    observed_base: Optional[str] = None
    clinical_significance: str
    clinical_confidence: float
    risk_level: str
    gene: str
    gene_confidence: float
    disease: str
    disease_description: str
    symptoms: list[str]
    treatments: Optional[list[str]] = []
    surgery: Optional[list[str]] = []
    global_death_rate: Optional[str] = None
    yearly_deaths: Optional[str] = None
    timestamp: str


# ── In-memory data stores ──
history_db = []
patients_db = {}
valid_users = {"admin@deepmorph.com": "admin123"}
dashboard_stats = {
    "total_sequences": 0,
    "high_risk_count": 0
}


def encode_sequence(seq):
    mapping = {
        "A": [1, 0, 0, 0],
        "T": [0, 1, 0, 0],
        "G": [0, 0, 1, 0],
        "C": [0, 0, 0, 1]
    }
    return np.array([mapping.get(base.upper(), [0, 0, 0, 0]) for base in seq])


def compute_saliency_hotspot(sequence):
    """Compute mutation hotspot using gradient-based saliency map.
    Returns the position with highest mutation importance."""
    encoded_input = encode_sequence(sequence)
    input_tensor = tf.constant(
        np.expand_dims(encoded_input, axis=0).astype(np.float32)
    )

    gene_classes_count = len(gene_encoder.classes_)
    clinical_classes_count = len(clinical_encoder.classes_)

    with tf.GradientTape() as tape:
        tape.watch(input_tensor)
        outputs = model(input_tensor, training=False)

        if not isinstance(outputs, list):
            outputs_list = [outputs]
        else:
            outputs_list = outputs

        # Find the mutation prediction head
        mutation_output = None
        for out in outputs_list:
            if out.shape[1] != gene_classes_count and out.shape[1] != clinical_classes_count:
                mutation_output = out
                break

        if mutation_output is None:
            return {"mutation_hotspot": None, "reference_base": None, "observed_base": None}

        # Target: mutation probability
        if mutation_output.shape[1] == 1:
            target = mutation_output[0, 0]
        else:
            target = mutation_output[0, 1]  # index 1 = mutated class

    grads = tape.gradient(target, input_tensor)

    if grads is None:
        return {"mutation_hotspot": None, "reference_base": None, "observed_base": None}

    # Per-position importance: sum of absolute gradients across encoding dimension
    saliency = np.sum(np.abs(grads.numpy()[0]), axis=1)  # shape: (100,)
    hotspot_idx = int(np.argmax(saliency))

    return {
        "mutation_hotspot": hotspot_idx + 1,  # 1-indexed
        "reference_base": REFERENCE_SEQUENCE[hotspot_idx],
        "observed_base": sequence[hotspot_idx].upper()
    }


# ═══════════  PAGE ROUTES (serve HTML templates)  ═══════════

@app.get("/")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard")
def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/patients-page")
def patients_page(request: Request):
    return templates.TemplateResponse("patient_management.html", {"request": request})

@app.get("/submit")
def submit_page(request: Request):
    return templates.TemplateResponse("sequence_submission.html", {"request": request})

@app.get("/mutation")
def mutation_page(request: Request):
    return templates.TemplateResponse("mutation_analysis.html", {"request": request})

@app.get("/clinical")
def clinical_page(request: Request):
    return templates.TemplateResponse("clinical_significance.html", {"request": request})

@app.get("/diseases")
def diseases_page(request: Request):
    return templates.TemplateResponse("disease_knowledge.html", {"request": request})

@app.get("/report")
def report_page(request: Request):
    return templates.TemplateResponse("report_generation.html", {"request": request})

@app.get("/history-page")
def history_page(request: Request):
    return templates.TemplateResponse("assessment_history.html", {"request": request})


# ═══════════  API ENDPOINTS  ═══════════

@app.post("/login")
def login(data: LoginInput):
    if valid_users.get(data.email) == data.password:
        return {"status": "success", "email": data.email}
    return JSONResponse(status_code=401, content={"error": "Invalid email or password"})


# ── Patient Management ──
@app.get("/patients")
def list_patients():
    return {"patients": list(patients_db.values())}

@app.post("/patients")
def create_patient(data: PatientInput):
    pid = "P-" + str(uuid.uuid4())[:8].upper()
    patient = {
        "patient_id": pid,
        "name": data.name,
        "age": data.age,
        "gender": data.gender
    }
    patients_db[pid] = patient
    return {"status": "created", "patient": patient}

@app.put("/patients/{patient_id}")
def update_patient(patient_id: str, data: PatientUpdate):
    if patient_id not in patients_db:
        return JSONResponse(status_code=404, content={"error": "Patient not found"})
    p = patients_db[patient_id]
    if data.name is not None:
        p["name"] = data.name
    if data.age is not None:
        p["age"] = data.age
    if data.gender is not None:
        p["gender"] = data.gender
    return {"status": "updated", "patient": p}

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: str):
    if patient_id not in patients_db:
        return JSONResponse(status_code=404, content={"error": "Patient not found"})
    del patients_db[patient_id]
    return {"status": "deleted"}


# ── Disease Knowledge ──
@app.get("/disease-info")
def get_disease_info():
    return disease_info


# ── Prediction ──
@app.post("/predict")
def predict(data: SequenceInput):
    sequence = data.sequence.strip()

    if len(sequence) != 100:
        return JSONResponse(
            status_code=400,
            content={"error": "Sequence must be exactly 100 bases"}
        )

    if not re.fullmatch(r"[ATGCatgc]{100}", sequence):
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid DNA sequence"}
        )

    encoded = encode_sequence(sequence)
    encoded = np.expand_dims(encoded, axis=0)

    outputs = model.predict(encoded, verbose=0)

    if not isinstance(outputs, list):
        outputs = [outputs]

    mutation_pred = None
    gene_pred = None
    clinical_pred = None

    gene_classes_count = len(gene_encoder.classes_)
    clinical_classes_count = len(clinical_encoder.classes_)

    for out in outputs:
        if out.shape[1] == gene_classes_count:
            gene_pred = out
        elif out.shape[1] == clinical_classes_count:
            clinical_pred = out
        else:
            mutation_pred = out

    # ── Mutation Logic ──
    if mutation_pred.shape[1] == 1:
        mutation_prob = float(mutation_pred[0][0])
        mutation_status = "Mutated" if mutation_prob > 0.5 else "Non-Mutated"
        mutation_conf = mutation_prob * 100 if mutation_status == "Mutated" else (1 - mutation_prob) * 100
    else:
        mutation_index = int(np.argmax(mutation_pred))
        mutation_status = "Mutated" if mutation_index == 1 else "Non-Mutated"
        mutation_conf = float(np.max(mutation_pred) * 100)

    # ── Clinical Logic ──
    clinical_index = int(np.argmax(clinical_pred))
    clinical_conf = float(np.max(clinical_pred) * 100)
    clinical_significance = clinical_encoder.inverse_transform([clinical_index])[0]

    clin_lower = clinical_significance.strip().lower()
    if clin_lower == "pathogenic":
        risk_level = "High"
    elif clin_lower == "likely pathogenic":
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    # ── Gene Logic ──
    gene_index = int(np.argmax(gene_pred))
    gene_conf = float(np.max(gene_pred) * 100)
    predicted_gene = gene_encoder.inverse_transform([gene_index])[0]

    raw_predicted_disease = gene_disease_map.get(predicted_gene, "Unknown")
    display_disease_name, disease_details = get_disease_details(
        raw_predicted_disease,
        disease_info
    )

    predicted_disease = (
        display_disease_name
        if raw_predicted_disease != "not provided"
        else raw_predicted_disease
    )

    # ── Mutation Hotspot Detection (saliency-based, only for mutated) ──
    if mutation_status == "Mutated":
        hotspot_data = compute_saliency_hotspot(sequence)
    else:
        hotspot_data = {
            "mutation_hotspot": None,
            "reference_base": None,
            "observed_base": None
        }

    # For non-mutated: only override risk_level; gene prediction always preserved
    if mutation_status == "Non-Mutated":
        risk_level = "Low"

    res_data = {
        "sequence": sequence[:15] + "...",
        "mutation_status": mutation_status,
        "mutation_confidence": round(mutation_conf, 2),
        "clinical_significance": clinical_significance,
        "clinical_confidence": round(clinical_conf, 2),
        "risk_level": risk_level,
        "gene": predicted_gene,
        "gene_confidence": round(gene_conf, 2),
        "disease": predicted_disease,
        "disease_description": disease_details.get("description", ""),
        "symptoms": disease_details.get("symptoms", []),
        "treatments": disease_details.get("treatments", []),
        "surgery": disease_details.get("surgery", []),
        "global_death_rate": disease_details.get("global_death_rate", "N/A"),
        "yearly_deaths": disease_details.get("yearly_deaths", "N/A"),
        "mutation_hotspot": hotspot_data["mutation_hotspot"],
        "reference_base": hotspot_data["reference_base"],
        "observed_base": hotspot_data["observed_base"],
        "patient_id": data.patient_id or "N/A",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    # Update dashboard stats
    dashboard_stats["total_sequences"] += 1
    if risk_level == "High":
        dashboard_stats["high_risk_count"] += 1

    # Store in History DB
    history_db.insert(0, res_data)

    return res_data


# ── History ──
@app.get("/history")
def get_history():
    return {"history": history_db}


# ── Dashboard stats ──
@app.get("/dashboard-stats")
def get_dashboard_stats():
    return {
        "total_patients": len(patients_db),
        "total_sequences": dashboard_stats["total_sequences"],
        "high_risk_count": dashboard_stats["high_risk_count"],
        "recent": history_db[:5]
    }


# ── Report Generation ──
@app.post("/generate-report")
def generate_report(data: ReportInput):
    report_dir = "reports"
    os.makedirs(report_dir, exist_ok=True)
    filename = f"deepmorph_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(report_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=letter,
                            rightMargin=60, leftMargin=60,
                            topMargin=50, bottomMargin=40)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'],
                                  fontSize=22, textColor=HexColor('#0ea5e9'),
                                  spaceAfter=6, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                     fontSize=10, textColor=HexColor('#666666'),
                                     alignment=TA_CENTER, spaceAfter=20)
    heading_style = ParagraphStyle('SectionHead', parent=styles['Heading2'],
                                    fontSize=14, textColor=HexColor('#1e3a5f'),
                                    spaceBefore=16, spaceAfter=8,
                                    borderPadding=(0, 0, 4, 0))
    normal_style = styles['Normal']
    normal_style.fontSize = 10
    normal_style.leading = 14

    story = []

    # Title
    story.append(Paragraph("DeepMorph AI Genomic Analysis Report", title_style))
    story.append(Paragraph(f"Generated on {data.timestamp} | System Version: DeepMorph v2.0", subtitle_style))
    story.append(Spacer(1, 10))

    # SECTION: Patient Information
    story.append(Paragraph("<b>PATIENT INFORMATION</b>", heading_style))
    patient_data = [
        ["Patient ID", data.patient_id or "N/A"],
        ["Name", data.patient_name or "N/A"],
        ["Age", str(data.patient_age) if data.patient_age else "N/A"],
        ["Gender", data.patient_gender or "N/A"],
        ["Date of Analysis", data.timestamp],
    ]
    t = Table(patient_data, colWidths=[2*inch, 4*inch])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, HexColor('#cccccc')),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # SECTION: Mutation Analysis
    story.append(Paragraph("<b>MUTATION ANALYSIS</b>", heading_style))
    story.append(Paragraph(f"Mutation Status: <b>{data.mutation_status}</b>", normal_style))
    story.append(Paragraph(f"Confidence Score: {data.mutation_confidence}%", normal_style))
    if data.mutation_hotspot:
        story.append(Paragraph(f"Mutation Hotspot Location: Position {data.mutation_hotspot} "
                               f"({data.reference_base} → {data.observed_base})", normal_style))
    story.append(Spacer(1, 10))

    # SECTION: Clinical Interpretation
    story.append(Paragraph("<b>CLINICAL INTERPRETATION</b>", heading_style))
    story.append(Paragraph(f"Clinical Significance: <b>{data.clinical_significance}</b>", normal_style))
    story.append(Paragraph(f"Clinical Confidence: {data.clinical_confidence}%", normal_style))
    story.append(Paragraph(f"Risk Level: <b>{data.risk_level}</b>", normal_style))
    story.append(Spacer(1, 10))

    # SECTION: Genetic Prediction
    story.append(Paragraph("<b>GENETIC PREDICTION</b>", heading_style))
    story.append(Paragraph(f"Predicted Gene: <b>{data.gene}</b>", normal_style))
    story.append(Paragraph(f"Gene Confidence: {data.gene_confidence}%", normal_style))
    story.append(Spacer(1, 10))

    if data.mutation_status != "Non-Mutated":
        # SECTION: Disease Intelligence
        story.append(Paragraph("<b>DISEASE INTELLIGENCE</b>", heading_style))
        story.append(Paragraph(f"Disease Name: <b>{data.disease}</b>", normal_style))
        story.append(Paragraph(f"{data.disease_description}", normal_style))
        story.append(Spacer(1, 6))

        if data.symptoms:
            story.append(Paragraph("<b>Symptoms:</b>", normal_style))
            items = [ListItem(Paragraph(s, normal_style)) for s in data.symptoms]
            story.append(ListFlowable(items, bulletType='bullet'))
            story.append(Spacer(1, 6))

        if data.treatments:
            story.append(Paragraph("<b>Treatment Options:</b>", normal_style))
            items = [ListItem(Paragraph(t_item, normal_style)) for t_item in data.treatments]
            story.append(ListFlowable(items, bulletType='bullet'))
            story.append(Spacer(1, 6))

        if data.surgery:
            story.append(Paragraph("<b>Surgical Procedures:</b>", normal_style))
            items = [ListItem(Paragraph(s, normal_style)) for s in data.surgery]
            story.append(ListFlowable(items, bulletType='bullet'))
            story.append(Spacer(1, 6))

        if data.global_death_rate:
            story.append(Paragraph(f"Global Death Rate: {data.global_death_rate}", normal_style))
        if data.yearly_deaths:
            story.append(Paragraph(f"Annual Global Deaths: {data.yearly_deaths}", normal_style))

    doc.build(story)
    return FileResponse(path=filepath, filename="DeepMorph_Clinical_Report.pdf", media_type="application/pdf")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)