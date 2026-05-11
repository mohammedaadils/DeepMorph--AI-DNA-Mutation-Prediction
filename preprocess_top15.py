import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import LabelEncoder

print("Loading Top15 dataset...")
df = pd.read_csv("deepmorph_top15_2000.csv")

print("Total samples:", len(df))

# Keep only valid 100bp sequences
df = df[df["sequence"].str.len() == 100]

print("Valid samples:", len(df))

# DNA one-hot encoding
mapping = {
    "A": [1,0,0,0],
    "T": [0,1,0,0],
    "G": [0,0,1,0],
    "C": [0,0,0,1],
    "N": [0,0,0,0]
}

def encode_sequence(seq):
    return np.array([mapping.get(base, [0,0,0,0]) for base in seq])

print("Encoding sequences...")
X = np.array([encode_sequence(seq) for seq in df["sequence"]], dtype=np.float32)

# Encode gene labels
gene_encoder = LabelEncoder()
y_gene = gene_encoder.fit_transform(df["gene"])

# Encode clinical significance
clinical_encoder = LabelEncoder()
y_clinical = clinical_encoder.fit_transform(df["clinical_significance"])

# Mutation label (binary)
y_mutation = df["clinical_significance"].isin(
    ["Pathogenic", "Likely pathogenic"]
).astype(int).values

# Save encoders
pickle.dump(gene_encoder, open("gene_encoder_top15.pkl", "wb"))
pickle.dump(clinical_encoder, open("clinical_encoder_top15.pkl", "wb"))

# Save arrays
np.save("X_top15.npy", X)
np.save("y_gene_top15.npy", y_gene)
np.save("y_clinical_top15.npy", y_clinical)
np.save("y_mutation_top15.npy", y_mutation)

print("\nPreprocessing complete.")
print("Shape:", X.shape)
print("Gene classes:", len(gene_encoder.classes_))
print("Clinical classes:", len(clinical_encoder.classes_))