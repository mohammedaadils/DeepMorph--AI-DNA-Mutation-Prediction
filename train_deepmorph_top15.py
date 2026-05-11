import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Conv1D, MaxPooling1D, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from sklearn.model_selection import train_test_split

print("Loading training data...")

# Load preprocessed arrays
X = np.load("X_top15.npy")
y_gene = np.load("y_gene_top15.npy")
y_clinical = np.load("y_clinical_top15.npy")
y_mutation = np.load("y_mutation_top15.npy")

print("Total samples:", X.shape[0])
print("Sequence length:", X.shape[1])

num_genes = len(np.unique(y_gene))
num_clinical = len(np.unique(y_clinical))

# Convert to categorical
y_gene_cat = tf.keras.utils.to_categorical(y_gene, num_genes)
y_clinical_cat = tf.keras.utils.to_categorical(y_clinical, num_clinical)

# ✅ Proper stratified split (VERY IMPORTANT)
X_train, X_val, \
y_gene_train, y_gene_val, \
y_clin_train, y_clin_val, \
y_mut_train, y_mut_val = train_test_split(
    X,
    y_gene_cat,
    y_clinical_cat,
    y_mutation,
    test_size=0.2,
    random_state=42,
    stratify=y_gene  # ensures equal gene distribution
)

print("Training samples:", X_train.shape[0])
print("Validation samples:", X_val.shape[0])

# ===========================
# Build DeepMorph Architecture
# ===========================

input_layer = Input(shape=(100, 4))

x = Conv1D(128, 5, activation="relu")(input_layer)
x = MaxPooling1D(2)(x)
x = Dropout(0.3)(x)

x = Conv1D(256, 5, activation="relu")(x)
x = MaxPooling1D(2)(x)
x = Dropout(0.3)(x)

x = LSTM(256)(x)
x = Dropout(0.4)(x)

# Outputs
gene_output = Dense(num_genes, activation="softmax", name="gene")(x)
clinical_output = Dense(num_clinical, activation="softmax", name="clinical")(x)
mutation_output = Dense(1, activation="sigmoid", name="mutation")(x)

model = Model(
    inputs=input_layer,
    outputs=[gene_output, clinical_output, mutation_output]
)

model.compile(
    optimizer="adam",
    loss={
        "gene": "categorical_crossentropy",
        "clinical": "categorical_crossentropy",
        "mutation": "binary_crossentropy"
    },
    metrics={
        "gene": "accuracy",
        "clinical": "accuracy",
        "mutation": "accuracy"
    }
)

model.summary()

# ===========================
# Callbacks
# ===========================

checkpoint = ModelCheckpoint(
    "deepmorph_top15_model.keras",
    monitor="val_gene_accuracy",
    mode="max",
    save_best_only=True,
    verbose=1
)

early_stop = EarlyStopping(
    monitor="val_gene_accuracy",
    mode="max",
    patience=8,
    restore_best_weights=True
)

# ===========================
# Train
# ===========================

print("\nTraining DeepMorph Top15 model...")

history = model.fit(
    X_train,
    {
        "gene": y_gene_train,
        "clinical": y_clin_train,
        "mutation": y_mut_train
    },
    validation_data=(
        X_val,
        {
            "gene": y_gene_val,
            "clinical": y_clin_val,
            "mutation": y_mut_val
        }
    ),
    epochs=60,
    batch_size=64,
    callbacks=[checkpoint, early_stop],
    verbose=1
)

print("\nTraining complete.")
model.save("deepmorph_top15_final.keras")