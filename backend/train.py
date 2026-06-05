import os
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, precision_recall_curve, f1_score
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier

def train_fraud_model(data_dir='data', model_dir='models'):
    """
    Loads transaction and identity data, preprocesses features,
    applies SMOTE to handle imbalance, trains XGBoost, evaluates and saves.
    """
    print("Starting Model Training Pipeline...")
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        
    tx_path = os.path.join(data_dir, 'train_transaction.csv')
    id_path = os.path.join(data_dir, 'train_identity.csv')
    
    if not os.path.exists(tx_path) or not os.path.exists(id_path):
        raise FileNotFoundError("Training CSV files not found. Run data_generator.py first.")
        
    print("Loading datasets...")
    tx_df = pd.read_csv(tx_path)
    id_df = pd.read_csv(id_path)
    
    print(f"Loaded {tx_df.shape[0]} transactions and {id_df.shape[0]} identities.")
    
    # Merge datasets
    df = pd.merge(tx_df, id_df, on='TransactionID', how='left')
    print(f"Merged dataset shape: {df.shape}")
    
    # ------------------
    # Preprocessing Setup
    # ------------------
    target_col = 'isFraud'
    id_col = 'TransactionID'
    
    # Separate features and target
    X = df.drop(columns=[target_col, id_col, 'TransactionDT'])
    y = df[target_col]
    
    # Separate numeric and categorical columns
    categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
    # Add any card or addr columns that should be categorical if they were read as objects (they might be floats/ints but categorical in nature, e.g., card1)
    # For simplicity, we treat card1-card3 and card5 as numerical, card4 and card6 as categorical
    # addr1 and addr2 are zip/country codes, let's treat them as numerical or encode them. We'll treat them as numerical here.
    
    numerical_cols = X.select_dtypes(exclude=['object']).columns.tolist()
    
    print(f"Categorical features ({len(categorical_cols)}): {categorical_cols}")
    print(f"Numerical features ({len(numerical_cols)}): {numerical_cols}")
    
    # Store training metadata for reference in Flask API
    medians = {}
    label_encoders = {}
    
    # 1. Fill numerical NaNs with median and scale
    print("Preprocessing numerical features...")
    X_num = X[numerical_cols].copy()
    for col in numerical_cols:
        median_val = X_num[col].median()
        if pd.isna(median_val):
            median_val = 0.0  # fallback
        medians[col] = float(median_val)
        X_num[col] = X_num[col].fillna(median_val)
        
    scaler = StandardScaler()
    X_num_scaled = scaler.fit_transform(X_num)
    X_num_df = pd.DataFrame(X_num_scaled, columns=numerical_cols)
    
    # 2. Fill categorical NaNs with 'missing' and label encode
    print("Preprocessing categorical features...")
    X_cat = X[categorical_cols].copy()
    for col in categorical_cols:
        X_cat[col] = X_cat[col].fillna('missing').astype(str)
        le = LabelEncoder()
        X_cat[col] = le.fit_transform(X_cat[col])
        label_encoders[col] = le
        
    # Combine preprocessed features
    X_preprocessed = pd.concat([X_num_df, X_cat], axis=1)
    
    # Save the order of features to ensure consistent inputs during inference
    feature_order = X_preprocessed.columns.tolist()
    
    # Split into train/validation sets (stratified split to maintain fraud ratio)
    print("Splitting train/validation sets...")
    X_train, X_val, y_train, y_val = train_test_split(
        X_preprocessed, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Original training shape: {X_train.shape}, Fraud rate: {y_train.mean():.4f}")
    
    # 3. Apply SMOTE to training data only (to avoid leakage)
    print("Applying SMOTE to handle class imbalance...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"Resampled training shape: {X_train_res.shape}, Fraud rate: {y_train_res.mean():.4f}")
    
    # 4. Train XGBoost
    print("Training XGBoost Classifier...")
    # Using scale_pos_weight is another option, but SMOTE resampled the classes, so we use balanced classes here.
    model = XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(X_train_res, y_train_res)
    
    # Evaluate
    print("Evaluating model...")
    y_pred = model.predict(X_val)
    y_pred_proba = model.predict_proba(X_val)[:, 1]
    
    metrics = {
        'accuracy': float((y_pred == y_val).mean()),
        'roc_auc': float(roc_auc_score(y_val, y_pred_proba)),
        'classification_report': classification_report(y_val, y_pred, output_dict=True),
        'confusion_matrix': confusion_matrix(y_val, y_pred).tolist(),
    }
    
    # Compute precision-recall curve to find best threshold or show it in dashboard
    precisions, recalls, thresholds = precision_recall_curve(y_val, y_pred_proba)
    # Find threshold with highest F1 score
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-8)
    best_idx = np.argmax(f1_scores)
    best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5
    best_f1 = float(f1_scores[best_idx])
    
    metrics['best_threshold'] = best_threshold
    metrics['best_f1'] = best_f1
    
    # Check what keys are in classification_report, fall back if necessary
    report = metrics['classification_report']
    target_key = '1' if '1' in report else ('1.0' if '1.0' in report else list(report.keys())[0])
    
    print(f"Validation F1-Score: {report[target_key]['f1-score']:.4f}")
    print(f"Best Threshold (Max F1): {best_threshold:.4f} with F1: {best_f1:.4f}")
    print(f"Validation ROC-AUC: {metrics['roc_auc']:.4f}")
    
    # Save artifacts
    print("Saving model and preprocessing artifacts...")
    artifacts = {
        'model': model,
        'scaler': scaler,
        'label_encoders': label_encoders,
        'medians': medians,
        'feature_order': feature_order,
        'categorical_cols': categorical_cols,
        'numerical_cols': numerical_cols,
        'metrics': metrics
    }
    
    artifact_path = os.path.join(model_dir, 'fraud_model_pipeline.pkl')
    with open(artifact_path, 'wb') as f:
        pickle.dump(artifacts, f)
        
    # Write metadata JSON file for frontend readability if needed (simple dictionary)
    import json
    metadata = {
        'accuracy': metrics['accuracy'],
        'roc_auc': metrics['roc_auc'],
        'precision': report[target_key]['precision'],
        'recall': report[target_key]['recall'],
        'f1_score': report[target_key]['f1-score'],
        'best_threshold': best_threshold,
        'best_f1': best_f1,
        'confusion_matrix': metrics['confusion_matrix'],
        'feature_importance': dict(zip(feature_order, [float(x) for x in model.feature_importances_]))
    }
    
    meta_path = os.path.join(model_dir, 'model_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Pipeline saved to {artifact_path}")
    print(f"Metadata saved to {meta_path}")
    
if __name__ == '__main__':
    train_fraud_model()
