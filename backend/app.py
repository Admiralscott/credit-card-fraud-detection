import os
import pickle
import json
import traceback
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for the React frontend

# Paths
DATA_DIR = 'data'
MODEL_DIR = 'models'
PIPELINE_PATH = os.path.join(MODEL_DIR, 'fraud_model_pipeline.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')

# Global variable to hold the model pipeline
pipeline = None
metadata = None

def init_system_if_needed():
    """
    Checks if datasets and models exist. If not, generates them and trains the model.
    """
    global pipeline, metadata
    
    tx_path = os.path.join(DATA_DIR, 'train_transaction.csv')
    id_path = os.path.join(DATA_DIR, 'train_identity.csv')
    
    # Check if data exists, if not generate it
    if not (os.path.exists(tx_path) and os.path.exists(id_path)):
        print("Data files not found. Triggering synthetic data generation...")
        from data_generator import generate_synthetic_dataset
        generate_synthetic_dataset(num_records=10000, output_dir=DATA_DIR)
        
    # Check if model exists, if not train it
    if not os.path.exists(PIPELINE_PATH):
        print("Trained model pipeline not found. Triggering model training...")
        from train import train_fraud_model
        train_fraud_model(data_dir=DATA_DIR, model_dir=MODEL_DIR)
        
    # Load model pipeline
    print("Loading model pipeline into memory...")
    with open(PIPELINE_PATH, 'rb') as f:
        pipeline = pickle.load(f)
        
    # Load metadata
    print("Loading model metadata...")
    with open(METADATA_PATH, 'r') as f:
        metadata = json.load(f)

# Helper function to preprocess a single transaction record for prediction
def preprocess_single_record(record_dict, pipeline_data):
    """
    Takes a raw transaction dictionary (as received from JSON API)
    and preprocesses it to match the trained model feature space.
    """
    feature_order = pipeline_data['feature_order']
    categorical_cols = pipeline_data['categorical_cols']
    numerical_cols = pipeline_data['numerical_cols']
    medians = pipeline_data['medians']
    scaler = pipeline_data['scaler']
    label_encoders = pipeline_data['label_encoders']
    
    # Prepare a Series or DataFrame with feature order
    processed_row = {}
    
    # 1. Handle numerical columns
    num_data = {}
    for col in numerical_cols:
        val = record_dict.get(col, None)
        # Convert to float or use median
        if val is None or pd.isna(val) or val == '':
            val = medians.get(col, 0.0)
        else:
            try:
                val = float(val)
            except ValueError:
                val = medians.get(col, 0.0)
        num_data[col] = val
        
    # Scale numerical columns
    num_df = pd.DataFrame([num_data])[numerical_cols]
    num_scaled = scaler.transform(num_df)
    for idx, col in enumerate(numerical_cols):
        processed_row[col] = num_scaled[0][idx]
        
    # 2. Handle categorical columns
    for col in categorical_cols:
        val = record_dict.get(col, None)
        val_str = str(val) if (val is not None and not pd.isna(val) and val != '') else 'missing'
        
        le = label_encoders[col]
        # Handle unseen category
        if val_str not in le.classes_:
            val_str = 'missing'
            
        encoded_val = int(le.transform([val_str])[0])
        processed_row[col] = encoded_val
        
    # 3. Reconstruct in precise feature order
    final_features = [processed_row[col] for col in feature_order]
    return np.array([final_features])

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        'status': 'healthy',
        'model_loaded': pipeline is not None,
        'dataset_exists': os.path.exists(os.path.join(DATA_DIR, 'train_transaction.csv'))
    })

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    global metadata
    if metadata is None:
        try:
            with open(METADATA_PATH, 'r') as f:
                metadata = json.load(f)
        except Exception:
            return jsonify({'error': 'Metadata not available'}), 500
            
    # Load dataset stats to enrich the dashboard
    try:
        tx_df = pd.read_csv(os.path.join(DATA_DIR, 'train_transaction.csv'))
        stats = {
            'total_transactions': int(len(tx_df)),
            'fraud_rate': float(tx_df['isFraud'].mean()),
            'total_fraud': int(tx_df['isFraud'].sum()),
            'average_amount': float(tx_df['TransactionAmt'].mean()),
            'max_amount': float(tx_df['TransactionAmt'].max())
        }
    except Exception as e:
        stats = {}
        
    return jsonify({
        'metrics': metadata,
        'stats': stats
    })

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """
    Returns a sample of transaction records.
    Filters: count (default 100), product_cd, is_fraud.
    """
    limit = request.args.get('limit', 100, type=int)
    product_cd = request.args.get('product_cd', None)
    is_fraud = request.args.get('is_fraud', None, type=int)
    
    try:
        tx_path = os.path.join(DATA_DIR, 'train_transaction.csv')
        id_path = os.path.join(DATA_DIR, 'train_identity.csv')
        
        tx_df = pd.read_csv(tx_path)
        id_df = pd.read_csv(id_path)
        
        # Merge
        df = pd.merge(tx_df, id_df, on='TransactionID', how='left')
        
        # Apply filters
        if product_cd:
            df = df[df['ProductCD'] == product_cd]
        if is_fraud is not None:
            df = df[df['isFraud'] == is_fraud]
            
        # Take the most recent transactions (simulated by last indices)
        df_sorted = df.sort_values(by='TransactionDT', ascending=False)
        sample = df_sorted.head(limit).copy()
        
        # Handle NaNs for JSON serialization
        sample = sample.replace({np.nan: None})
        
        records = sample.to_dict(orient='records')
        
        # Add a simulated prediction risk score using our model for visual interest
        for r in records:
            if pipeline:
                try:
                    # extract keys matching training columns
                    features = preprocess_single_record(r, pipeline)
                    pred_prob = float(pipeline['model'].predict_proba(features)[0][1])
                    r['predicted_fraud_prob'] = pred_prob
                    r['predicted_is_fraud'] = int(pred_prob >= pipeline['metrics'].get('best_threshold', 0.5))
                except Exception:
                    r['predicted_fraud_prob'] = 0.0
                    r['predicted_is_fraud'] = r['isFraud']
            else:
                r['predicted_fraud_prob'] = 1.0 if r['isFraud'] else 0.0
                r['predicted_is_fraud'] = r['isFraud']
                
        return jsonify(records)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict_fraud():
    """
    Classifies an incoming transaction.
    Expects JSON request body representing the transaction fields.
    """
    global pipeline
    if not pipeline:
        return jsonify({'error': 'Model pipeline not loaded'}), 503
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
            
        # Preprocess features
        features = preprocess_single_record(data, pipeline)
        
        # Run XGBoost inference
        prob = float(pipeline['model'].predict_proba(features)[0][1])
        
        # Decide based on threshold
        threshold = pipeline['metrics'].get('best_threshold', 0.5)
        prediction = int(prob >= threshold)
        
        # Formulate response
        response = {
            'is_fraud': prediction,
            'fraud_probability': prob,
            'threshold_used': threshold,
            'risk_level': 'High' if prob >= 0.75 else ('Medium' if prob >= threshold else 'Low'),
            'transaction_details': {
                'TransactionAmt': data.get('TransactionAmt'),
                'ProductCD': data.get('ProductCD'),
                'card4': data.get('card4'),
                'card6': data.get('card6'),
                'DeviceType': data.get('DeviceType')
            }
        }
        return jsonify(response)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    """
    Triggers synthetic data generation and retraining.
    Returns the updated metrics.
    """
    global pipeline, metadata
    try:
        # Check size of training data to generate
        num_records = request.json.get('num_records', 10000) if request.json else 10000
        
        print(f"Forced Retraining requested with {num_records} records...")
        
        # Re-generate (simulating new streaming data)
        from data_generator import generate_synthetic_dataset
        generate_synthetic_dataset(num_records=num_records, output_dir=DATA_DIR)
        
        # Re-train
        from train import train_fraud_model
        train_fraud_model(data_dir=DATA_DIR, model_dir=MODEL_DIR)
        
        # Reload pipeline and metadata
        with open(PIPELINE_PATH, 'rb') as f:
            pipeline = pickle.load(f)
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)
            
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully!',
            'metrics': metadata
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize the data files and model before starting the server
    init_system_if_needed()
    app.run(host='127.0.0.1', port=5000, debug=True)
