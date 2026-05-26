import os
import sys
import json
import subprocess

# 1. Ensure dependencies are installed
try:
    import numpy as np
    from sklearn.neural_network import MLPClassifier
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("[Train] Installing required packages (numpy, scikit-learn, sentence-transformers)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "numpy", "scikit-learn", "sentence-transformers"])
    import numpy as np
    from sklearn.neural_network import MLPClassifier
    from sentence_transformers import SentenceTransformer

# 2. Define the training dataset (English + Hinglish/Conversational)
DATASET = [
    # --- Category: Todo ---
    ("Need to call Rahul and sync on the gateway API integration today", "Todo", "NEUTRAL"),
    ("Buy milk, eggs, and groceries on the way back home", "Todo", "CALM"),
    ("Finish editing the presentation slides before the 3 PM meeting", "Todo", "ANXIOUS"),
    ("Action item: follow up with the design team about the typography feedback", "Todo", "NEUTRAL"),
    ("Remind me to check the database backups tomorrow morning", "Todo", "NEUTRAL"),
    ("must complete this task by tonight", "Todo", "ANXIOUS"),
    ("ghar ka rashan lana hai sham ko", "Todo", "CALM"),
    ("work ka schedule check karna hai", "Todo", "NEUTRAL"),

    # --- Category: Idea ---
    ("What if we build a local-first note app that syncs over local wifi networks?", "Idea", "EXCITED"),
    ("A new product concept: a keyboard that changes color based on your typing speed", "Idea", "EXCITED"),
    ("Startup idea: Airbnb but for office spaces during weekend hours", "Idea", "EXCITED"),
    ("Maybe we can design a visual constellation mapping for notes instead of a list", "Idea", "EXCITED"),
    ("brainstorming a new way to process vector search locally on mobile devices", "Idea", "NEUTRAL"),
    ("soch raha hoon ek custom mechanical keyboard company start karu", "Idea", "EXCITED"),
    ("naya concept dimaag me aaya hai startup ke liye", "Idea", "EXCITED"),

    # --- Category: Study ---
    ("Learned about the self-attention mechanism in Transformers and how it computes QKV vectors", "Study", "CALM"),
    ("Studied the difference between SQLite WAL mode and normal rollback journal modes today", "Study", "CALM"),
    ("Reading a chapter on neural network backpropagation and gradient descent optimization", "Study", "CALM"),
    ("Today's lesson: how React Native utilizes the JSI bridge for fast native method invocation", "Study", "NEUTRAL"),
    ("exam preparation for database management systems", "Study", "ANXIOUS"),
    ("attention mechanism kaise work karta hai samjha aaj", "Study", "CALM"),

    # --- Category: Dream ---
    ("Dreamt that I was floating in a dark cosmic nebula surrounded by glowing purple stars", "Dream", "CALM"),
    ("Had a vivid nightmare about writing infinite code that wouldn't compile", "Dream", "ANXIOUS"),
    ("Last night I woke up dreaming about exploring a forgotten underground temple", "Dream", "CALM"),
    ("Lucid dream where I could fly over the city skyline just by closing my eyes", "Dream", "EXCITED"),
    ("sapna dekha ki mai space me travel kar raha hoon", "Dream", "CALM"),

    # --- Category: Research ---
    ("Analyzing the performance benchmarks of ONNX Runtime on mobile CPUs vs WebAssembly", "Research", "NEUTRAL"),
    ("Experimental evidence shows that 4-bit quantization reduces model accuracy by only 1.2%", "Research", "CALM"),
    ("Investigating the statistics of user interaction retention on local-first database models", "Research", "NEUTRAL"),
    ("Scientific paper research on semantic cross-linking algorithms in graph knowledge bases", "Research", "NEUTRAL"),
    ("data analytics compile karke report banana hai speed metrics pe", "Research", "NEUTRAL"),

    # --- Category: Quote ---
    ("The only way to do great work is to love what you do. - Steve Jobs", "Quote", "HOPEFUL"),
    ("To be or not to be, that is the question. - William Shakespeare", "Quote", "NEUTRAL"),
    ("Simplicity is the ultimate sophistication. Leonardo da Vinci stated", "Quote", "HOPEFUL"),
    ("As the author wrote: 'Good design is as little design as possible'", "Quote", "CALM"),
    ("kisne bola tha ki hard work pays off?", "Quote", "NEUTRAL"),

    # --- Category: Meeting ---
    ("Sync call with the frontend developers about the Chronos thread styling bugs", "Meeting", "NEUTRAL"),
    ("Teams meeting agenda: discussing sprint plans and product deployment timelines", "Meeting", "NEUTRAL"),
    ("Weekly standup huddle at 10 AM to sync on progress", "Meeting", "NEUTRAL"),
    ("Interview scheduled with the engineering candidate this Thursday", "Meeting", "NEUTRAL"),
    ("sync meeting ho gayi designer ke sath zoom pe", "Meeting", "NEUTRAL"),

    # --- Category: Reflection ---
    ("I wonder if I am spending too much time working and not enough time resting", "Reflection", "SAD"),
    ("Honestly, I feel extremely grateful for the support of my team members", "Reflection", "HOPEFUL"),
    ("Pondering about where my career is heading and what truly brings me joy in life", "Reflection", "CALM"),
    ("Today was a tough day, but I learned a lot about emotional resilience", "Reflection", "SAD"),
    ("mann bohot shant hai aaj subah se meditation ke baad", "Reflection", "CALM"),

    # --- Category: Creative ---
    ("Writing a short poem about a mechanical watch ticking away the silence of the night", "Creative", "CALM"),
    ("Sketching a new character design for a fantasy novel set in an icy wilderness", "Creative", "CALM"),
    ("Composing a simple piano melody that evokes the feeling of falling rain", "Creative", "CALM"),
    ("Drafting a fictional script about a programmer who communicates with an alternate timeline", "Creative", "EXCITED"),
    ("kuch naya write up likh raha hoon story ke liye", "Creative", "CALM"),

    # --- Category: Journal ---
    ("Had breakfast, went for a run around the park, and then started coding", "Journal", "CALM"),
    ("Today was just a normal Monday morning. The weather is slightly cloudy and cool", "Journal", "NEUTRAL"),
    ("Spent the evening reading a fiction book and drinking green tea", "Journal", "CALM"),
    ("diary log: woke up late, had lunch at the café nearby, felt a bit tired today", "Journal", "SAD"),
    ("aaj ka din thoda busy tha but overall decent raha", "Journal", "NEUTRAL"),
]

CATEGORIES = ['Journal', 'Study', 'Idea', 'Todo', 'Dream', 'Research', 'Quote', 'Meeting', 'Reflection', 'Creative']
EMOTIONS = ['ANXIOUS', 'CALM', 'EXCITED', 'SAD', 'FRUSTRATED', 'HOPEFUL', 'NEUTRAL']

def main():
    print(f"[Train] Initializing SentenceTransformer (all-MiniLM-L6-v2)...")
    # We use all-MiniLM-L6-v2 because it outputs 384 dimensions, exactly matching the app's ONNX embedding model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    texts = [item[0] for item in DATASET]
    y_cats_str = [item[1] for item in DATASET]
    y_emos_str = [item[2] for item in DATASET]
    
    # Map targets to indices
    y_cats = np.array([CATEGORIES.index(c) for c in y_cats_str])
    y_emos = np.array([EMOTIONS.index(e) for e in y_emos_str])
    
    print(f"[Train] Generating embeddings for {len(texts)} training samples...")
    X = model.encode(texts, show_progress_bar=False)
    
    print(f"[Train] Training MLP Classifier heads...")
    
    # 2-layer FFN architecture: 384 -> 128 -> outputs
    # We will train two separate MLPs or a joint MLP. To keep it simple, we train a shared hidden layer.
    # To do this in scikit-learn easily, we can train two MLPClassifiers with hidden_layer_sizes=(128,)
    # and reuse the same input projections, or train them independently.
    # Training them independently is simpler and performs well!
    
    clf_cat = MLPClassifier(
        hidden_layer_sizes=(128,),
        activation='relu',
        solver='adam',
        max_iter=1000,
        random_state=42
    )
    clf_cat.fit(X, y_cats)
    
    clf_emo = MLPClassifier(
        hidden_layer_sizes=(128,),
        activation='relu',
        solver='adam',
        max_iter=1000,
        random_state=42
    )
    clf_emo.fit(X, y_emos)
    
    print(f"[Train] Category classification score: {clf_cat.score(X, y_cats):.2f}")
    print(f"[Train] Emotion classification score: {clf_emo.score(X, y_emos):.2f}")
    
    # Extract weights for exporting
    # MLPClassifier coefficients:
    # coefs_[0] is W1 (384, 128) -> Transpose to (128, 384) for JS usage
    # intercepts_[0] is b1 (128,)
    # coefs_[1] is W2 (128, num_classes) -> Transpose to (num_classes, 128)
    # intercepts_[1] is b2 (num_classes,)
    
    # For Category MLP
    W1_cat = clf_cat.coefs_[0].T.tolist() # (128, 384)
    b1_cat = clf_cat.intercepts_[0].tolist() # (128,)
    W2_cat = clf_cat.coefs_[1].T.tolist() # (10, 128)
    b2_cat = clf_cat.intercepts_[1].tolist() # (10,)
    
    # For Emotion MLP
    W1_emo = clf_emo.coefs_[0].T.tolist() # (128, 384)
    b1_emo = clf_emo.intercepts_[0].tolist() # (128,)
    W2_emo = clf_emo.coefs_[1].T.tolist() # (7, 128)
    b2_emo = clf_emo.intercepts_[1].tolist() # (7,)
    
    # Save weights to JSON
    weights = {
        "W1_cat": W1_cat,
        "b1_cat": b1_cat,
        "W2_cat": W2_cat,
        "b2_cat": b2_cat,
        "W1_emo": W1_emo,
        "b1_emo": b1_emo,
        "W2_emo": W2_emo,
        "b2_emo": b2_emo,
        "categories": CATEGORIES,
        "emotions": EMOTIONS
    }
    
    output_dir = "assets/models"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "classifier_weights.json")
    
    with open(output_path, "w") as f:
        json.dump(weights, f, indent=2)
        
    print(f"[Train] Weights successfully exported to {output_path}")

if __name__ == "__main__":
    main()
