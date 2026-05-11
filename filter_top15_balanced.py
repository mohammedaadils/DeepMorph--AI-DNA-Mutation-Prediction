import pandas as pd

print("Loading full dataset...")
df = pd.read_csv("deepmorph_balanced_sequences.csv")

print("Total samples:", len(df))

# Get top 15 genes
top15 = df["gene"].value_counts().head(15).index.tolist()

print("\nTop 15 genes selected:")
print(top15)

# Filter only those genes
df_top = df[df["gene"].isin(top15)]

# Balance to 2000 samples per gene
balanced_list = []

for gene in top15:
    gene_subset = df_top[df_top["gene"] == gene]
    gene_sample = gene_subset.sample(n=2000, random_state=42)
    balanced_list.append(gene_sample)

balanced_df = pd.concat(balanced_list).reset_index(drop=True)

print("\nFinal balanced dataset size:", len(balanced_df))

print("\nFinal gene distribution:")
print(balanced_df["gene"].value_counts())

balanced_df.to_csv("deepmorph_top15_2000.csv", index=False)

print("\nSaved as deepmorph_top15_2000.csv")