from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
import numpy as np
from collections import Counter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model = None

def get_model():
    global model
    if model is None:
        # Using a small, fast model suitable for local deployment
        print("Loading model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model loaded.")
    return model

class MessagesRequest(BaseModel):
    messages: List[str]
    stop_words: List[str] = []

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}

# Extended stop words for chat analysis
CHAT_STOPWORDS = {
    "don", "did", "just", "like", "yeah", "okay", "ok", "lol", "omg", "hey",
    "hello", "hi", "good", "bad", "think", "know", "want", "going", "gonna",
    "wanna", "got", "make", "really", "right", "time", "come", "said", "say",
    "tell", "look", "see", "thing", "need", "maybe", "way", "day", "night",
    "wait", "feel", "let", "sure", "actually", "probably", "stuff", "yes", "no",
    "tomorrow", "today", "yesterday", "tonight", "morning", "afternoon",
    "evening", "thanks", "thank", "nice", "cool", "sorry", "fine", "getting",
    "went", "guys", "man", "bro", "dude", "girl", "people", "would", "could",
    "should", "have", "has", "had", "will", "can", "whats", "thats", "theres",
    "dont", "didnt", "cant", "wont", "isnt", "arent", "wasnt", "werent",
    "havent", "hasnt", "hadnt", "wouldnt", "couldnt", "shouldnt", "im", "youre",
    "hes", "shes", "theyre", "weve", "youve", "ill", "voice", "message", "omitted"
}

@app.post("/cluster")
def cluster_topics(req: MessagesRequest):
    if not req.messages:
        return []

    try:
        transformer = get_model()
        
        # 1. Embed messages
        messages = req.messages[:3000] # Increased limit
        if len(messages) < 10:
            return []

        embeddings = transformer.encode(messages, show_progress_bar=False)

        # 2. Cluster
        # Dynamic cluster count: ~10% of messages, capped at 20, min 3
        # E.g. 200 msgs -> 20 clusters. 50 msgs -> 5 clusters.
        n_clusters = max(3, min(len(messages) // 10, 20))
            
        clustering = AgglomerativeClustering(n_clusters=n_clusters)
        cluster_labels = clustering.fit_predict(embeddings)

        # 3. Extract Keywords per Cluster using c-TF-IDF
        cluster_docs = []
        cluster_sizes = []
        
        for i in range(n_clusters):
            # Get documents in this cluster
            docs = [messages[j] for j in range(len(messages)) if cluster_labels[j] == i]
            if docs:
                cluster_docs.append(" ".join(docs))
                cluster_sizes.append(len(docs))

        if not cluster_docs:
            return []

        # Use TfidfVectorizer
        tfidf = TfidfVectorizer(
            stop_words='english', # Base english
            ngram_range=(1, 2), # Allow bigrams, maybe trigrams are too noisy
            max_df=0.5, # Penalize generic words appearing in >50% of clusters
        )
        
        try:
            X = tfidf.fit_transform(cluster_docs)
            feature_names = tfidf.get_feature_names_out()
            topic_counts = []
            
            for idx, row in enumerate(X):
                dense_row = row.toarray().flatten()
                top_indices = dense_row.argsort()[::-1]
                
                found_topic = None
                for candidate_idx in top_indices[:20]: 
                    term = feature_names[candidate_idx]
                    
                    # Split term to check individual words against stoplist
                    parts = term.split()
                    if any(p in CHAT_STOPWORDS for p in parts):
                        continue
                    if any(p in req.stop_words for p in parts):
                        continue
                    
                    # Length check (skip very short words unless acronyms? no, safer to skip)
                    if len(term) < 4:
                        continue
                    
                    # Skip digits
                    if any(char.isdigit() for char in term):
                        continue

                    found_topic = term
                    break
                
                if found_topic:
                    count = cluster_sizes[idx]
                    topic_counts.append({"text": found_topic, "count": count})

            # Sort final result by count desc
            topic_counts.sort(key=lambda x: x['count'], reverse=True)
            return topic_counts

        except ValueError as e:
            print(f"TF-IDF Error: {e}")
            return []

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Pre-load model on startup
    get_model()
    uvicorn.run(app, host="0.0.0.0", port=8000)
