import numpy as np
import tensorflow as tf
import pickle
import json

print("Loading DeepMorph v2 model...")

# Load model
model = tf.keras.models.load_model("deepmorph_top15_model.keras")

# Load encoders
gene_encoder = pickle.load(open("gene_encoder_top15.pkl", "rb"))
clinical_encoder = pickle.load(open("clinical_encoder_top15.pkl", "rb"))

# Load gene-disease mapping
with open("gene_disease_map_top15.json", "r") as f:
    gene_disease_map = json.load(f)

# DNA encoding
mapping = {
    "A": [1,0,0,0],
    "T": [0,1,0,0],
    "G": [0,0,1,0],
    "C": [0,0,0,1],
    "N": [0,0,0,0]
}

def encode_sequence(seq):
    seq = seq.upper()
    if len(seq) != 100:
        raise ValueError("Sequence must be exactly 100 bases")
    return np.array([mapping.get(base, [0,0,0,0]) for base in seq])

# ✅ Updated Risk Mapping
risk_map = {
    "Pathogenic": "High",
    "Likely pathogenic": "Moderate",   # Changed
    "Uncertain significance": "Moderate",
    "Likely benign": "Low",
    "Benign": "Low"
}

# Input
sequence = input("\nEnter DNA sequence (100 bases): ")

X = encode_sequence(sequence)
X = np.expand_dims(X, axis=0)

# Predict
gene_pred, clinical_pred, mutation_pred = model.predict(X, verbose=0)

# Decode gene
gene_index = np.argmax(gene_pred)
gene = gene_encoder.inverse_transform([gene_index])[0]
gene_conf = np.max(gene_pred)

# Decode clinical
clinical_index = np.argmax(clinical_pred)
clinical = clinical_encoder.inverse_transform([clinical_index])[0]
clinical_conf = np.max(clinical_pred)

# Mutation decision
mutation_prob = mutation_pred[0][0]
mutation_status = "Mutated" if mutation_prob > 0.5 else "Non-Mutated"

# Get disease
disease = gene_disease_map.get(gene, "Unknown")

# Risk level
risk = risk_map.get(clinical, "Low")

print("\n===== DeepMorph v2 Prediction =====")
print(f"Mutation Status: {mutation_status}")
print(f"Mutation Confidence: {mutation_prob*100:.2f}%")

# ✅ Always show clinical & risk
print(f"\nClinical Significance: {clinical}")
print(f"Clinical Confidence: {clinical_conf*100:.2f}%")
print(f"Risk Level: {risk}")

# Only show gene & disease if mutated
if mutation_status == "Mutated":
    print(f"\nPredicted Gene: {gene}")
    print(f"Gene Confidence: {gene_conf*100:.2f}%")
    print(f"\nPredicted Disease: {disease}")