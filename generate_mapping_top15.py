import pandas as pd
import json

df = pd.read_csv("deepmorph_top15_2000.csv")

mapping = (
    df.groupby("gene")["disease"]
      .agg(lambda x: x.value_counts().index[0])
      .to_dict()
)

with open("gene_disease_map_top15.json", "w") as f:
    json.dump(mapping, f, indent=4)

print("Gene-disease mapping saved.")