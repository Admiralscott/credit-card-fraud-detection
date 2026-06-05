import os
import sys

def verify():
    print("=== Pipeline Verification Script ===")
    
    # 1. Check dependencies
    print("Checking Python packages...")
    packages = ['pandas', 'numpy', 'sklearn', 'imblearn', 'xgboost', 'flask', 'flask_cors']
    missing_pkgs = []
    for pkg in packages:
        try:
            __import__(pkg)
            print(f"  {pkg}: OK")
        except ImportError:
            print(f"  {pkg}: MISSING")
            missing_pkgs.append(pkg)
            
    if missing_pkgs:
        print(f"\nError: Missing packages {missing_pkgs}. Please install them before proceeding.")
        sys.exit(1)
        
    print("\nAll dependencies are met. Proceeding to train model on 1,000 records...")
    
    # 2. Run data generator on 1000 records
    try:
        from data_generator import generate_synthetic_dataset
        generate_synthetic_dataset(num_records=1000, output_dir='data_verify')
    except Exception as e:
        print(f"Error in data generation: {e}")
        sys.exit(1)
        
    # 3. Train model on verified data
    try:
        from train import train_fraud_model
        train_fraud_model(data_dir='data_verify', model_dir='models_verify')
    except Exception as e:
        print(f"Error in model training: {e}")
        sys.exit(1)
        
    # 4. Check for generated files
    pipeline_file = 'models_verify/fraud_model_pipeline.pkl'
    meta_file = 'models_verify/model_metadata.json'
    
    if os.path.exists(pipeline_file) and os.path.exists(meta_file):
        print("\nSUCCESS: Verification pipeline completed successfully!")
        print(f"  Saved: {pipeline_file}")
        print(f"  Saved: {meta_file}")
        
        # Clean up verify files to keep workspace tidy
        import shutil
        try:
            shutil.rmtree('data_verify')
            shutil.rmtree('models_verify')
            print("Cleaned up verification directories.")
        except Exception as e:
            print(f"Note: Cleanup failed: {e}")
    else:
        print("\nFAILURE: Preprocessed model files not found.")
        sys.exit(1)

if __name__ == '__main__':
    verify()
