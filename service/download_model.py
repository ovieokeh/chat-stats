from sentence_transformers import SentenceTransformer
import os

def download_model():
    model_name = 'all-MiniLM-L6-v2'
    save_path = './models/all-MiniLM-L6-v2'
    
    if not os.path.exists(save_path):
        print(f"Downloading model {model_name} to {save_path}...")
        model = SentenceTransformer(model_name)
        model.save(save_path)
        print("Model downloaded and saved.")
    else:
        print(f"Model already exists at {save_path}")

if __name__ == "__main__":
    download_model()
