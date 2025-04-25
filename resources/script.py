import sys
import json
import numpy as np
import librosa
from tensorflow.keras.models import load_model
import pickle
import os

np.float = float
np.int = int

base_path = base_path = os.path.dirname(__file__)
model_path = base_path + '/model/va_model_court.h5'
scaler_path = base_path + '/model/va_scaler.pkl'

model = load_model(model_path, compile=False)
with open(scaler_path, "rb") as f:
    scaler = pickle.load(f)

key_mapping = {
    'C Major': 0,
    'C# Major': 1, 'Db Major': 1,
    'D Major': 2,
    'D# Major': 3, 'Eb Major': 3,
    'E Major': 4,
    'F Major': 5,
    'F# Major': 6, 'Gb Major': 6,
    'G Major': 7,
    'G# Major': 8, 'Ab Major': 8,
    'A Major': 9,
    'A# Major': 10, 'Bb Major': 10,
    'B Major': 11,
    'C Minor': 12,
    'C# Minor': 13, 'Db Minor': 13,
    'D Minor': 14,
    'D# Minor': 15, 'Eb Minor': 15,
    'E Minor': 16,
    'F Minor': 17,
    'F# Minor': 18, 'Gb Minor': 18,
    'G Minor': 19,
    'G# Minor': 20, 'Ab Minor': 20,
    'A Minor': 21,
    'A# Minor': 22, 'Bb Minor': 22,
    'B Minor': 23
}

def classify_emotion(val, arous, tempo, key_label):
    if arous >= 6 and val >= 6:
        return "Happy / Excited"
    elif arous >= 6 and val < 6:
        if "Minor" in key_label and tempo >= 110:
            return "Intense / Powerful"
        return "Angry / Tense"
    elif arous < 6 and val >= 6:
        return "Calm / Peaceful"
    elif arous < 6 and val < 6:
        return "Sad"
    return "Neutral"

def encode_key_label(label):
    return key_mapping.get(label, 0)

def extract_features(segment, sr, tempo, key_encoded):
    mfcc = librosa.feature.mfcc(y=segment, sr=sr, n_mfcc=10)
    chroma = librosa.feature.chroma_stft(y=segment, sr=sr)
    contrast = librosa.feature.spectral_contrast(y=segment, sr=sr)
    mfcc_mean = np.mean(mfcc, axis=1).flatten()
    chroma_mean = np.mean(chroma, axis=1).flatten()
    contrast_mean = float(np.mean(contrast))

    features = list(mfcc_mean) + list(chroma_mean) + [contrast_mean, float(tempo), float(key_encoded)]
    return np.array(features, dtype=np.float32)
    
def process_data(data):
    try:
        samples = np.array(data["samples"], dtype=np.float32)
        sr = int(data["sampleRate"])
        key = data['key']
        tempo = data['bpm']
        key_encoded = encode_key_label(key)

        features = extract_features(samples, sr, tempo, key_encoded).reshape(1, -1)
        scaled = scaler.transform(features)
        val, arous = model.predict(scaled, verbose=0)[0]
        emotion = classify_emotion(val, arous, tempo, key)

        return {
            "valence": float(val),
            "arousal": float(arous),
            "emotion": emotion,
            "processed": True
        }
    except Exception as e:
        return {"error": f"Processing failed: {str(e)}"}

if __name__ == "__main__":
    for line in sys.stdin:
        try:
            input_data = json.loads(line.strip())
            if "filePath" in input_data:
                with open(input_data["filePath"], 'r') as f:
                    data = json.load(f)
                result = process_data(data)
                os.remove(input_data["filePath"])
            print(json.dumps(result), flush=True)
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}), flush=True)
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)