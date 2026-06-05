import os
import numpy as np
import pandas as pd

def generate_synthetic_dataset(num_records=10000, output_dir='data'):
    """
    Generates synthetic versions of IEEE-CIS transaction and identity datasets
    with realistic column distributions, missing values, and fraud patterns.
    """
    print(f"Generating synthetic IEEE-CIS dataset with {num_records} records...")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    np.random.seed(42)
    
    # ------------------
    # 1. Base Variables
    # ------------------
    transaction_ids = np.arange(2987000, 2987000 + num_records)
    
    # Fraud distribution: ~3.5% default, but we'll introduce rules to make it predictable for the model
    # base probability
    fraud_prob = 0.02 * np.ones(num_records)
    
    # ------------------
    # 2. Transaction Data
    # ------------------
    # TransactionDT: sequential seconds starting from 86400 (day 1)
    # Average gap of ~20 seconds
    time_gaps = np.random.exponential(scale=20, size=num_records)
    transaction_dt = 86400 + np.cumsum(time_gaps).astype(int)
    
    # TransactionAmt: Log-normal distribution, mostly small but some very large
    transaction_amt = np.random.lognormal(mean=3.5, sigma=1.0, size=num_records)
    # Rule: High amounts are more likely to be fraud
    fraud_prob += 0.05 * (transaction_amt > 150)
    fraud_prob += 0.10 * (transaction_amt > 500)
    
    # ProductCD: W (Work/default), H (Home), C (Commercial), S (Subscription), R (Retail)
    product_cds = np.random.choice(['W', 'H', 'C', 'S', 'R'], size=num_records, p=[0.75, 0.05, 0.12, 0.03, 0.05])
    # Rule: ProductCD 'C' (Commercial) and 'R' (Retail) have higher fraud rates
    fraud_prob += 0.08 * (product_cds == 'C')
    fraud_prob += 0.05 * (product_cds == 'R')
    
    # Cards: card1 (numerical ID), card2 (numerical issuer), card3 (numerical bank country),
    # card4 (brand), card5 (numerical code), card6 (credit vs debit)
    card1 = np.random.randint(1000, 20000, size=num_records)
    
    card2 = np.random.choice([np.nan, 111.0, 194.0, 225.0, 321.0, 360.0, 490.0, 555.0], size=num_records, p=[0.10, 0.15, 0.15, 0.10, 0.15, 0.10, 0.15, 0.10])
    
    card3 = np.random.choice([np.nan, 150.0, 185.0], size=num_records, p=[0.02, 0.93, 0.05])
    # Rule: card3 == 185 (foreign card) has higher fraud risk
    fraud_prob += 0.12 * (card3 == 185.0)
    
    card4 = np.random.choice([np.nan, 'visa', 'mastercard', 'american express', 'discover'], size=num_records, p=[0.01, 0.65, 0.30, 0.03, 0.01])
    
    card5 = np.random.choice([np.nan, 102.0, 117.0, 137.0, 166.0, 219.0, 226.0], size=num_records, p=[0.05, 0.05, 0.05, 0.10, 0.10, 0.10, 0.55])
    
    card6 = np.random.choice([np.nan, 'debit', 'credit'], size=num_records, p=[0.02, 0.73, 0.25])
    # Rule: Credit cards have slightly higher fraud rate
    fraud_prob += 0.04 * (card6 == 'credit')
    
    # Address variables
    addr1 = np.random.choice([np.nan, 204.0, 299.0, 325.0, 330.0, 441.0], size=num_records, p=[0.10, 0.15, 0.20, 0.25, 0.20, 0.10])
    addr2 = np.random.choice([np.nan, 87.0], size=num_records, p=[0.10, 0.90])
    # Rule: Missing addr1 or addr2 increases fraud probability
    fraud_prob += 0.06 * np.isnan(addr1)
    
    # Emails
    emails = ['gmail.com', 'yahoo.com', 'anonymous.com', 'hotmail.com', 'aol.com', 'outlook.com', np.nan]
    p_email = np.random.choice(emails, size=num_records, p=[0.45, 0.20, 0.15, 0.10, 0.04, 0.04, 0.02])
    r_email = np.random.choice(emails, size=num_records, p=[0.25, 0.10, 0.05, 0.05, 0.02, 0.03, 0.50]) # often missing
    # Rule: anonymous.com domains have higher fraud probability
    fraud_prob += 0.15 * (p_email == 'anonymous.com')
    fraud_prob += 0.10 * (r_email == 'anonymous.com')
    
    # Counting features (C1 - C14)
    # We will generate C1, C2, C5, C11, C13, C14 to capture card usage frequency
    c1 = np.random.poisson(lam=1.5, size=num_records) + 1
    c2 = np.random.poisson(lam=1.2, size=num_records) + 1
    c5 = np.random.poisson(lam=0.5, size=num_records)
    c11 = np.random.poisson(lam=1.1, size=num_records) + 1
    c13 = np.random.poisson(lam=2.5, size=num_records) + 1
    c14 = np.random.poisson(lam=1.0, size=num_records) + 1
    
    # Rule: High count values (rapid reuse) indicate potential fraud
    fraud_prob += 0.03 * (c11 > 4)
    fraud_prob += 0.05 * (c13 > 8)
    
    # Time delta features (D1 - D15)
    # D1: Days since card registration. D2: Days since last transaction
    d1 = np.random.exponential(scale=100, size=num_records).astype(int)
    d2 = np.random.exponential(scale=15, size=num_records).astype(int)
    d2 = np.where(np.random.rand(num_records) < 0.40, np.nan, d2) # 40% missing
    
    # Match features (M1 - M9)
    # Standard values: T, F, or missing
    m1 = np.random.choice(['T', 'F', np.nan], size=num_records, p=[0.60, 0.10, 0.30])
    m2 = np.random.choice(['T', 'F', np.nan], size=num_records, p=[0.55, 0.15, 0.30])
    m3 = np.random.choice(['T', 'F', np.nan], size=num_records, p=[0.50, 0.20, 0.30])
    m4 = np.random.choice(['M0', 'M1', 'M2', np.nan], size=num_records, p=[0.35, 0.20, 0.10, 0.35])
    # Rule: mismatch in names (M1=F, M2=F) increases fraud probability
    fraud_prob += 0.05 * (m1 == 'F')
    fraud_prob += 0.05 * (m2 == 'F')
    
    # Vesta features (V1 - V339)
    # Let's generate a representative sample of 15 V features
    # V features are highly correlated and grouped
    v11 = np.random.normal(loc=0.5, scale=0.2, size=num_records)
    v15 = np.random.choice([0.0, 1.0, 2.0, np.nan], size=num_records, p=[0.80, 0.08, 0.02, 0.10])
    v29 = np.random.choice([0.0, 1.0, np.nan], size=num_records, p=[0.70, 0.15, 0.15])
    v35 = np.random.normal(loc=1.0, scale=0.5, size=num_records)
    v45 = np.random.normal(loc=1.2, scale=0.6, size=num_records)
    v53 = np.random.normal(loc=0.8, scale=0.4, size=num_records)
    v62 = np.random.choice([0.0, 1.0, 2.0], size=num_records, p=[0.75, 0.20, 0.05])
    v75 = np.random.choice([0.0, 1.0, 2.0, np.nan], size=num_records, p=[0.70, 0.18, 0.02, 0.10])
    v87 = np.random.normal(loc=1.1, scale=0.3, size=num_records)
    v94 = np.random.choice([0.0, 1.0, np.nan], size=num_records, p=[0.85, 0.05, 0.10])
    v100 = np.random.exponential(scale=10, size=num_records)
    v200 = np.random.exponential(scale=5, size=num_records)
    v300 = np.random.exponential(scale=2, size=num_records)
    
    # Rule: Outliers in V features increase fraud risk
    fraud_prob += 0.04 * (v15 == 2.0)
    fraud_prob += 0.08 * (v300 > 10)
    
    # Map probability to binary decision
    # Ensure fraud probability is capped at 0.95 and bounded by 0.0
    fraud_prob = np.clip(fraud_prob, 0.0, 0.95)
    
    # Introduce random noise to make it realistic and not 100% separable
    is_fraud = (np.random.rand(num_records) < fraud_prob).astype(int)
    
    # Let's adjust slightly to target exactly ~3.5% - 4.5% overall fraud
    actual_fraud_rate = np.mean(is_fraud)
    print(f"Initial target fraud rate: {actual_fraud_rate:.4%}")
    
    # Assemble transaction dataframe
    tx_df = pd.DataFrame({
        'TransactionID': transaction_ids,
        'isFraud': is_fraud,
        'TransactionDT': transaction_dt,
        'TransactionAmt': np.round(transaction_amt, 2),
        'ProductCD': product_cds,
        'card1': card1,
        'card2': card2,
        'card3': card3,
        'card4': card4,
        'card5': card5,
        'card6': card6,
        'addr1': addr1,
        'addr2': addr2,
        'P_emaildomain': p_email,
        'R_emaildomain': r_email,
        'C1': c1, 'C2': c2, 'C5': c5, 'C11': c11, 'C13': c13, 'C14': c14,
        'D1': d1, 'D2': d2,
        'M1': m1, 'M2': m2, 'M3': m3, 'M4': m4,
        'V11': np.round(v11, 4), 'V15': v15, 'V29': v29, 'V35': np.round(v35, 4),
        'V45': np.round(v45, 4), 'V53': np.round(v53, 4), 'V62': v62,
        'V75': v75, 'V87': np.round(v87, 4), 'V94': v94, 'V100': np.round(v100, 4),
        'V200': np.round(v200, 4), 'V300': np.round(v300, 4)
    })
    
    # ------------------
    # 3. Identity Data
    # ------------------
    # In IEEE-CIS, only ~25% of transactions have identity information.
    # Let's select a random ~30% subset of TransactionIDs to have identity records.
    identity_indices = np.random.choice(num_records, size=int(num_records * 0.3), replace=False)
    identity_ids = transaction_ids[identity_indices]
    num_ids = len(identity_ids)
    
    # Identity features: id_01 - id_10 (numerical), id_11 - id_38 (categorical/numerical), DeviceType, DeviceInfo
    # We will generate a representative subset: id_01, id_02, id_12, id_15, id_31 (browser), DeviceType, DeviceInfo
    # id_01: numerical, usually negative
    id_01 = np.random.choice([np.nan, -5.0, -10.0, -20.0, -100.0, 0.0], size=num_ids, p=[0.10, 0.30, 0.30, 0.15, 0.10, 0.05])
    
    # id_02: numerical, large values
    id_02 = np.random.exponential(scale=150000, size=num_ids)
    id_02 = np.where(np.random.rand(num_ids) < 0.15, np.nan, id_02)
    
    # id_12: categorical (Found, NotFound)
    id_12 = np.random.choice([np.nan, 'Found', 'NotFound'], size=num_ids, p=[0.05, 0.35, 0.60])
    
    # id_15: categorical (New, Found, Unknown)
    id_15 = np.random.choice([np.nan, 'New', 'Found', 'Unknown'], size=num_ids, p=[0.10, 0.50, 0.35, 0.05])
    
    # id_31: browser type
    browsers = ['chrome', 'safari', 'firefox', 'edge', 'ie', 'opera', np.nan]
    id_31 = np.random.choice(browsers, size=num_ids, p=[0.50, 0.20, 0.10, 0.05, 0.02, 0.01, 0.12])
    
    # DeviceType: desktop or mobile
    device_type = np.random.choice([np.nan, 'desktop', 'mobile'], size=num_ids, p=[0.05, 0.55, 0.40])
    
    # DeviceInfo: detailed OS/device name
    device_infos = ['Windows', 'iOS Device', 'MacOS', 'Samsung', 'Trident', 'LG', np.nan]
    device_info = np.random.choice(device_infos, size=num_ids, p=[0.40, 0.25, 0.15, 0.10, 0.03, 0.02, 0.05])
    
    # Let's adjust fraud based on identity patterns (e.g. mobile device, Windows/Trident, or specific browsers have more fraud)
    # Find matching indices in transaction data and increase fraud probability post-facto for identity conditions
    # For simplicity, we make sure our identity generator correlates with fraud, and rewrite their isFraud flag
    # Let's find which identity rows are associated with transactions that are ALREADY fraud, and make their fields riskier.
    # For example, if transaction is fraud, make browser more likely to be rare/missing, and DeviceType = mobile.
    fraud_tx_ids = set(tx_df[tx_df['isFraud'] == 1]['TransactionID'])
    
    for i, tx_id in enumerate(identity_ids):
        if tx_id in fraud_tx_ids:
            if np.random.rand() < 0.7:
                device_type[i] = 'mobile'
                id_31[i] = np.random.choice(['chrome', 'opera', np.nan], p=[0.40, 0.20, 0.40])
                device_info[i] = np.random.choice(['iOS Device', 'Samsung', np.nan], p=[0.40, 0.30, 0.30])
                id_01[i] = np.random.choice([-100.0, -50.0], p=[0.70, 0.30])
        else:
            # lower fraud risks
            if np.random.rand() < 0.7:
                device_type[i] = 'desktop'
                id_31[i] = 'chrome' if np.random.rand() < 0.8 else 'safari'
                device_info[i] = 'Windows' if np.random.rand() < 0.7 else 'MacOS'
                id_01[i] = 0.0 if np.random.rand() < 0.8 else np.nan
                
    id_df = pd.DataFrame({
        'TransactionID': identity_ids,
        'id_01': id_01,
        'id_02': np.round(id_02, 2),
        'id_12': id_12,
        'id_15': id_15,
        'id_31': id_31,
        'DeviceType': device_type,
        'DeviceInfo': device_info
    })
    
    # Save datasets
    tx_path = os.path.join(output_dir, 'train_transaction.csv')
    id_path = os.path.join(output_dir, 'train_identity.csv')
    
    tx_df.to_csv(tx_path, index=False)
    id_df.to_csv(id_path, index=False)
    
    print(f"Datasets generated successfully!")
    print(f"  Transaction file saved to: {tx_path} ({tx_df.shape[0]} rows, {tx_df.shape[1]} columns)")
    print(f"  Identity file saved to: {id_path} ({id_df.shape[0]} rows, {id_df.shape[1]} columns)")
    print(f"  Total Fraud Count: {tx_df['isFraud'].sum()} ({tx_df['isFraud'].mean():.2%})")
    
if __name__ == '__main__':
    generate_synthetic_dataset(num_records=10000)
