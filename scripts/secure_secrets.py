import os
import sys
import getpass
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def derive_key(password: str, salt: bytes) -> bytes:
    """Derives a 32-byte key from the password and salt using PBKDF2HMAC."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def encrypt(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return

    print(f"Encrypting '{file_path}'...")
    password = getpass.getpass("Enter encryption password: ")
    if not password:
        print("Password cannot be empty.")
        return
        
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Error: Passwords do not match.")
        return

    # Generate a random 16-byte salt
    salt = os.urandom(16)
    key = derive_key(password, salt)
    f = Fernet(key)

    with open(file_path, "rb") as file:
        file_data = file.read()

    encrypted_data = f.encrypt(file_data)
    
    # Output file is input filename + .enc
    output_path = file_path + ".enc"
    
    # Save the salt (first 16 bytes) followed by the encrypted data
    with open(output_path, "wb") as file:
        file.write(salt + encrypted_data)
        
    print(f"Success! Encrypted file saved to: {output_path}")
    print(f"IMPORTANT: Make sure to commit '{output_path}' and add '{file_path}' to .gitignore.")

def decrypt(file_path_enc):
    if not os.path.exists(file_path_enc):
        print(f"Error: File '{file_path_enc}' not found.")
        return
        
    # Determine output filename (remove .enc)
    original_path = file_path_enc
    if original_path.endswith(".enc"):
        original_path = original_path[:-4]
    else:
        # If user passed a file without .enc, assume it's the target and adding .enc was missed in arg logic
        # But here we assume input path IS the encrypted file.
        # If it doesn't end in .enc, we just append _decrypted? Or just ask user? 
        # Let's just strip extension if present, or append _restored.
        original_path = original_path + ".restored"

    if os.path.exists(original_path):
        overwrite = input(f"Warning: '{original_path}' already exists. Overwrite? (y/n): ")
        if overwrite.lower() != 'y':
            print("Aborted.")
            return

    print(f"Decrypting '{file_path_enc}'...")
    password = getpass.getpass("Enter decryption password: ")

    try:
        with open(file_path_enc, "rb") as file:
            salt = file.read(16) # First 16 bytes are salt
            encrypted_data = file.read()

        key = derive_key(password, salt)
        f = Fernet(key)
        decrypted_data = f.decrypt(encrypted_data)
        
        with open(original_path, "wb") as file:
            file.write(decrypted_data)
            
        print(f"Success! Decrypted file restored to: {original_path}")
    except Exception as e:
        print("Error: Decryption failed. Invalid password or corrupted file.")
        # print(e) # Uncomment for debug

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python secure_secrets.py [encrypt|decrypt] [file_path]")
        print("Example: python secure_secrets.py encrypt google_client_secrets.json")
        sys.exit(1)
        
    action = sys.argv[1].lower()
    
    # Default file path if not provided
    target_file = "google_client_secrets.json"
    if len(sys.argv) > 2:
        target_file = sys.argv[2]
    
    # Auto-adjust filename for convenience
    if action == "decrypt" and not target_file.endswith(".enc"):
        if os.path.exists(target_file + ".enc"):
            target_file += ".enc"
            
    if action == "encrypt":
        encrypt(target_file)
    elif action == "decrypt":
        decrypt(target_file)
    else:
        print("Unknown action. Use 'encrypt' or 'decrypt'.")
