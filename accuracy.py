import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# -----------------------------
# LOAD TRAINING DATA (IMPORTANT CHANGE)
# -----------------------------

y_true = np.load("y_gene_train.npy")              # training labels
y_pred = np.load("gene_train_predictions.npy")    # training predictions

# -----------------------------
# Calculate Metrics
# -----------------------------

accuracy = accuracy_score(y_true, y_pred)
precision = precision_score(y_true, y_pred, average='macro')
recall = recall_score(y_true, y_pred, average='macro')
f1 = f1_score(y_true, y_pred, average='macro')

print("Training Gene Accuracy:", accuracy)
print("Precision:", precision)
print("Recall:", recall)
print("F1 Score:", f1)

# -----------------------------
# Bar Chart
# -----------------------------

metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score']
values = [accuracy, precision, recall, f1]

plt.figure(figsize=(8,5))
plt.bar(metrics, values)

plt.title("DeepMorph Gene Prediction (Training Performance)")
plt.ylabel("Score")
plt.ylim(0,1)

for i,v in enumerate(values):
    plt.text(i, v+0.01, f"{v:.2f}", ha='center')

plt.show()

# -----------------------------
# Confusion Matrix
# -----------------------------

cm = confusion_matrix(y_true, y_pred)

plt.figure(figsize=(10,8))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")

plt.title("Training Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")

plt.show()