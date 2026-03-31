from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os
import base64

class TokenEncryption:
    @staticmethod
    def encrypt_token(token: str, key: str) -> str:
        """Encrypt access token using AES-256"""
        iv = os.urandom(16)
        encryption_key = key.encode()[:32].ljust(32, b'0')
        
        cipher = Cipher(algorithms.AES(encryption_key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        token_bytes = token.encode()
        padding_length = 16 - (len(token_bytes) % 16)
        padded_token = token_bytes + bytes([padding_length] * padding_length)
        
        encrypted = encryptor.update(padded_token) + encryptor.finalize()
        combined = iv + encrypted
        
        return base64.b64encode(combined).decode()
    
    @staticmethod
    def decrypt_token(encrypted_token: str, key: str) -> str:
        """Decrypt access token"""
        combined = base64.b64decode(encrypted_token)
        iv = combined[:16]
        encrypted_data = combined[16:]
        
        encryption_key = key.encode()[:32].ljust(32, b'0')
        cipher = Cipher(algorithms.AES(encryption_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        padded_token = decryptor.update(encrypted_data) + decryptor.finalize()
        padding_length = padded_token[-1]
        token = padded_token[:-padding_length].decode()
        
        return token