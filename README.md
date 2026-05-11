DeepMorph AI Genomic Analysis Platform

DeepMorph is an AI-powered genomic analysis platform developed for DNA mutation prediction and clinical interpretation using deep learning techniques. The system utilizes a hybrid CNN–LSTM architecture to analyze fixed-length DNA sequences and generate predictions related to mutation status, associated genes, and clinical significance.

The platform is designed as a hospital-style genomic intelligence system with an interactive web interface, patient management workflow, mutation hotspot visualization, disease knowledge integration, and clinical report generation.

⸻

Features

* DNA mutation prediction using deep learning
* Gene classification and clinical significance prediction
* Hybrid CNN–LSTM sequence learning architecture
* Mutation hotspot detection and visualization
* Disease intelligence module with symptoms and treatments
* Clinical PDF report generation
* Patient management system
* Assessment history tracking
* FastAPI backend with REST API integration
* Interactive frontend using HTML, CSS, and JavaScript

⸻

Technology Stack

Frontend

* HTML
* CSS
* JavaScript

Backend

* FastAPI

Machine Learning

* TensorFlow / Keras
* CNN–LSTM Hybrid Model

Data Storage

* JSON-based structured storage

Report Generation

* ReportLab (PDF generation)

⸻

Model Architecture

The DeepMorph model uses a hybrid deep learning architecture:

Convolutional Neural Network (CNN)

Extracts local nucleotide sequence patterns and mutation-related features from DNA sequences.

Long Short-Term Memory (LSTM)

Captures sequential dependencies and long-range relationships within genomic sequences.

Multi-Output Prediction Heads

The model simultaneously predicts:

* Mutation classification
* Gene prediction
* Clinical significance prediction

⸻

Data Preprocessing

Input DNA sequences are validated to ensure:

* Exactly 100 base pairs
* Only A, T, G, C nucleotides

The sequences are transformed using one-hot encoding:

* A → [1,0,0,0]
* T → [0,1,0,0]
* G → [0,0,1,0]
* C → [0,0,0,1]

Final input shape:

(100, 4)

⸻

Evaluation Metrics

The model is evaluated using:

* Accuracy
* Precision
* Recall
* F1 Score
* Precision–Recall Curve
* F1–Confidence Curve
* Recall–Confidence Curve
* Confusion Matrix

Current Performance

Metric	Value
Accuracy	84%
Precision	83%
Recall	84%
F1 Score	83%

⸻

System Workflow

DNA Sequence Input
        ↓
Sequence Validation
        ↓
One-Hot Encoding
        ↓
CNN–LSTM Model
        ↓
Prediction Outputs
 ├ Mutation Status
 ├ Gene Prediction
 └ Clinical Significance
        ↓
Disease Knowledge Retrieval
        ↓
Mutation Hotspot Visualization
        ↓
Clinical PDF Report Generation

⸻

Modules

* Authentication Module
* Dashboard Module
* Patient Management Module
* DNA Sequence Submission Module
* Mutation Prediction Module
* Clinical Significance Module
* Disease Knowledge Module
* Mutation Hotspot Visualization
* Assessment History Module
* Clinical Report Generation Module

⸻

Installation and Setup

Clone Repository

git clone https://github.com/mohammedaadils/DeepMorph--AI-DNA-Mutation-Prediction.git

⸻

Navigate to Project Folder

cd DeepMorph--AI-DNA-Mutation-Prediction

⸻

Install Required Dependencies

pip install fastapi uvicorn tensorflow numpy pandas scikit-learn matplotlib seaborn reportlab python-multipart jinja2

⸻

Run the FastAPI Server

uvicorn app:app --reload

⸻

Open in Browser

Visit:

http://127.0.0.1:8000

⸻

Project Structure

DeepMorph_Project
│
├── app.py
├── deepmorph_top15_model.keras
├── gene_encoder_top15.pkl
├── clinical_encoder_top15.pkl
├── gene_disease_map_top15.json
├── disease_info_top15.json
│
├── static
│     ├── style.css
│     ├── script.js
│
├── templates
│     ├── login.html
│     ├── dashboard.html
│     ├── patient_management.html
│     ├── sequence_submission.html
│     ├── mutation_analysis.html
│     ├── clinical_significance.html
│     ├── disease_knowledge.html
│     ├── report_generation.html
│     └── assessment_history.html
│
└── reports

⸻

Disclaimer

This project is developed for academic and research purposes only and is not intended to replace professional medical diagnosis or clinical decision-making.

⸻

Authors

Developed as a Final Year B.Tech Computer Science Project.

Project Title:

DeepMorph: AI-Based DNA Mutation Prediction Using Sequence Learning
