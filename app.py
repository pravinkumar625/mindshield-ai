
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from google import genai
from google.genai import types

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini Client (new google-genai SDK) ──────────────────────────────────────
GOOGLE_API_KEY = "AIzaSyCKhIyCAG-yKxkoBthmPtsjqiEbNcTgSvo"
client = genai.Client(
    api_key=GOOGLE_API_KEY,
    http_options=types.HttpOptions(
        timeout=10,  # 10 second timeout (fixed from 10000s)
        retry_options=types.HttpRetryOptions(attempts=0)  # Disable retries
    )
)
GEMINI_MODEL = "gemini-2.0-flash"   # stable, fast, free-tier friendly

# ── Emotion model (HuggingFace) ───────────────────────────────────────────────
MODEL_NAME = "./mindshield_emotion_model/final"
try:
    emotion_model = pipeline(
        "text-classification",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME
    )
    print("Loaded fine-tuned local model.")
except Exception as e:
    print(f"Failed to load local model: {e}")
    # Fallback to the original model if local isn't ready
    FALLBACK_MODEL = "bhadresh-savani/distilbert-base-uncased-emotion"
    emotion_model = pipeline(
        "text-classification",
        model=FALLBACK_MODEL,
        tokenizer=FALLBACK_MODEL
    )


# ── Emotion → stress mapping ──────────────────────────────────────────────────
EMOTION_STRESS = {
    "anger":   85,
    "fear":    78,
    "sadness": 70,
    "disgust": 65,
    "surprise": 45,
    "neutral": 35,
    "joy":     15,
    "love":    10,
}

EMOTION_SOLUTIONS = {
    "anger": [
        "Take 5 slow box-breaths (inhale 4s → hold 4s → exhale 4s → hold 4s).",
        "Step away from the trigger for 10 minutes before responding.",
        "Try the 'Bubble Pop' game to physically release tension.",
    ],
    "fear": [
        "Ground yourself using the 5-4-3-2-1 technique (name 5 things you can see, 4 you can touch...).",
        "Slow your breathing: inhale for 4 counts, exhale for 8 counts.",
        "Remind yourself: 'I am safe right now, in this moment.'",
    ],
    "sadness": [
        "Allow yourself to feel — suppressing sadness increases its intensity.",
        "Listen to calming Lofi Beats in the Chill Zone to gently lift your mood.",
        "Write 3 small things you are grateful for, no matter how tiny.",
    ],
    "disgust": [
        "Distance yourself physically or mentally from the source.",
        "Practice mindful breathing to reset your nervous system.",
        "Redirect focus to something neutral or pleasant.",
    ],
    "surprise": [
        "Pause and take 3 deep breaths to let your nervous system settle.",
        "Give yourself a moment before reacting — surprises need processing time.",
    ],
    "neutral": [
        "You seem balanced. Use this calm moment for light mindfulness (5 min meditation).",
        "A quick walk or stretching can turn 'okay' into 'great'.",
    ],
    "joy": [
        "Wonderful! Channel this positive energy into something creative.",
        "Share your joy — positive emotions multiply when expressed.",
    ],
    "love": [
        "Beautiful state of being. Practice gratitude meditation to deepen it.",
        "Express your appreciation to someone close to you today.",
    ],
}

# ── Fallback Templates (Used if Gemini API fails) ──────────────────────────────
FALLBACK_TEMPLATES = {
    "anger": "I can sense a lot of frustration and anger in your words, and it's completely understandable to feel this way. Your stress level is currently quite high ({stress_level}%). One thing that might help right now is: {solution}. Would you like to talk more about what's making you feel this way?",
    "fear": "I'm detecting some fear or anxiety in what you're saying. Please know that you're not alone, and I'm here to support you. Your stress level is at {stress_level}%. A good grounding technique is: {solution}. How can I best help you feel safer right now?",
    "sadness": "I'm truly sorry you're feeling this way. Sadness can be heavy, but acknowledging it is a brave first step. I've noted a stress level of {stress_level}%. Since you're feeling down, you might find some comfort in the Lofi Beats in the Chill Zone. Also, {solution} could help a bit. What's on your mind?",
    "disgust": "It sounds like you're dealing with something quite unpleasant or upsetting. I sensing your stress level is around {stress_level}%. Maybe {solution} could provide some distance from these feelings. How are you handling this situation?",
    "surprise": "That sounds like quite a shock! Surprises, even good ones, can be a lot for the nervous system to handle ({stress_level}% stress detected). Taking a moment for {solution} might help you process this. What exactly happened?",
    "joy": "I'm so glad to hear that! It's wonderful to share in your joy. Your stress levels are nice and low ({stress_level}%). Since you're in such a great mood, why not {solution}? What's the best part of your day so far?",
    "love": "That's such a beautiful and warm feeling. It's great to see your stress levels are so low ({stress_level}%). To deepen this feeling, you could try {solution}. Who or what is bringing this love into your life today?",
    "neutral": "I'm sensing a calm or neutral state right now. Your stress level is balanced at {stress_level}%. This is a great time for {solution} to maintain this balance. Is there anything specific you'd like to chat about?"
}

# ── Serve Frontend ─────────────────────────────────────────────────────────────
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

@app.get("/")
async def read_index():
    return FileResponse("frontend/index.html")

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ── AI response generator ─────────────────────────────────────────────────────
def get_ai_response(text: str, emotion: str, stress_level: int, confidence: float) -> str:
    print(f"[DEBUG] Generating response for emotion: {emotion}, stress: {stress_level}")
    solutions = EMOTION_SOLUTIONS.get(emotion, EMOTION_SOLUTIONS["neutral"])
    solutions_text = "\n".join(f"  - {s}" for s in solutions)

    severity = (
        "CRITICAL" if stress_level >= 80
        else "HIGH" if stress_level >= 65
        else "MODERATE" if stress_level >= 40
        else "LOW"
    )

    prompt = f"""You are MindShield AI — a warm, highly empathetic, and clinically-informed mental health companion.

DETECTED ANALYSIS:
- User Emotion: {emotion.upper()} (Model Confidence: {round(confidence * 100, 1)}%)
- Bio-Stress Level: {stress_level}% ({severity} severity)
- Suggested Coping Strategies:
{solutions_text}

USER MESSAGE: "{text}"

YOUR RESPONSE RULES:
1. Start with genuine, specific emotional validation for '{emotion}' — DO NOT be generic.
2. Present the detected stress level naturally (e.g., "I'm sensing your stress is at about {stress_level}%").
3. Offer 1-2 of the coping strategies above in a conversational, caring way.
4. If stress >= 65%, gently suggest booking a clinical appointment from the dashboard.
5. If emotion is 'sadness', mention the Lofi Beats in the Chill Zone.
6. End with an open, inviting question to keep them talking.
7. Tone: warm therapist, NOT robotic. Be concise (under 120 words).
"""

    try:
        print("[DEBUG] Calling Gemini API (Retries Disabled)...")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.75,
                max_output_tokens=400,
            )
        )
        print("[DEBUG] Gemini API response success.")
        return response.text.strip()
    except Exception as e:
        print(f"[DEBUG] Gemini Error: {e}")
        # Smart local fallback based on templates
        template = FALLBACK_TEMPLATES.get(emotion, FALLBACK_TEMPLATES["neutral"])
        return template.format(
            stress_level=stress_level,
            solution=solutions[0] if solutions else "taking a few deep breaths"
        )

# ── Main analyze endpoint ─────────────────────────────────────────────────────
@app.post("/analyze")
def analyze_text(data: dict):
    text = data.get("text", "").strip()
    if not text:
        return {"error": "Empty input"}

    # Emotion detection
    print(f"[DEBUG] Analyzing text: {text[:50]}...")
    result = emotion_model(text)
    emotion    = result[0]["label"]
    confidence = result[0]["score"]
    print(f"[DEBUG] Emotion detected: {emotion} ({confidence:.2f})")

    # Dynamic stress calculation
    base_stress = EMOTION_STRESS.get(emotion, 40)
    # Boost stress slightly if user explicitly mentions stress words
    stress_keywords = ["stressed", "stress", "overwhelmed", "panic", "anxiety", "anxious", "depressed", "hopeless", "helpless", "suicidal", "hurt", "pain", "cry", "crying", "alone", "lonely"]
    boost = sum(4 for kw in stress_keywords if kw in text.lower())
    stress_level = min(100, base_stress + boost)

    # Get coping solutions for this emotion
    solutions = EMOTION_SOLUTIONS.get(emotion, EMOTION_SOLUTIONS["neutral"])

    # Get AI response
    ai_response = get_ai_response(text, emotion, stress_level, confidence)

    return {
        "emotion":      emotion,
        "confidence":   round(float(confidence), 4),
        "stress_level": stress_level,
        "severity":     ("Critical" if stress_level >= 80 else "High" if stress_level >= 65 else "Moderate" if stress_level >= 40 else "Low"),
        "solutions":    solutions,
        "response":     ai_response
    }
