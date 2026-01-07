# Security Instructions

To protect sensitive credentials, `google_client_secrets.json` is ignored by git. We use an encryption script to safely commit these secrets.

## Prerequisites

1.  Ensure you have installed the dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## How to Check-in Secrets (Encrypt)

1.  Run the encryption script:
    ```bash
    python scripts/secure_secrets.py encrypt
    ```
2.  Enter a strong password when prompted. **Remember this password!**
3.  This will create `google_client_secrets.json.enc`.
4.  Commit the encrypted file:
    ```bash
    git add google_client_secrets.json.enc
    git commit -m "Update encrypted secrets"
    ```

## How to Restore Secrets (Decrypt)

1.  On a new machine, pull the repo.
2.  Run the decryption script:
    ```bash
    python scripts/secure_secrets.py decrypt
    ```
3.  Enter the password you used for encryption.
4.  `google_client_secrets.json` will be restored.

## Note
Do NOT commit `google_client_secrets.json` or any other file containing plain-text secrets. `google_client_secrets.json` is already added to `.gitignore`.
