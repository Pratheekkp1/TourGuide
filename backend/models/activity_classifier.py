"""
Activity/situation classifier using CLIP zero-shot inference.
Identifies WHAT is happening in the scene, not just where it is.
Runs as a second CLIP pass alongside scene classification.
"""

import io
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image

ACTIVITY_LABELS = [
    "people playing volleyball, jumping and hitting a ball over a net",
    "people playing basketball, dribbling and shooting hoops on a court",
    "people playing soccer or football on a field",
    "athletes running or doing track and field events",
    "people lifting weights, doing squats or bench press at a gym",
    "people doing yoga or stretching exercises on mats",
    "people dancing together at a party or club",
    "people sitting and studying or reading quietly at desks or tables",
    "people having a business meeting or presentation in an office or conference room",
    "people eating a meal together at a restaurant or dining table",
    "people cooking food in a kitchen",
    "people watching television or a screen together on a couch at home",
    "people standing and having a casual conversation or chatting",
    "people waiting in line or sitting in a waiting area or queue",
    "a person sitting alone working at a computer or desk",
    "people shopping, browsing clothing racks or product shelves",
    "people commuting or traveling with luggage at an airport or station",
    "people at a concert, festival, or live performance watching a stage",
    "people participating in a religious ceremony, prayer, or worship ritual",
    "people at a protest, rally, or public demonstration holding signs",
    "people doing martial arts, boxing, or combat sports training",
    "people doing group exercise, aerobics, or fitness class together",
    "a person sleeping or resting on a bed in a bedroom",
    "people performing a traditional cultural dance or ceremony in traditional clothing",
    "people laughing, socializing and mingling at a social party or event",
    "people buying food from street food vendors or outdoor food stalls",
    "a person asking for directions or help from someone on the street",
    "people performing music or playing instruments outdoors",
    "people doing outdoor work such as construction, gardening, or cleaning",
    "children playing in a playground or park",
]

DISPLAY_ACTIVITIES = [
    "Playing volleyball",
    "Playing basketball",
    "Playing soccer",
    "Track & field / running",
    "Weightlifting",
    "Yoga / stretching",
    "Dancing",
    "Studying / reading",
    "Business meeting",
    "Eating together",
    "Cooking",
    "Watching TV / relaxing",
    "Casual conversation",
    "Waiting in queue",
    "Solo desk work",
    "Shopping",
    "Commuting / traveling",
    "Concert / live event",
    "Religious ceremony",
    "Protest / rally",
    "Martial arts training",
    "Group exercise class",
    "Resting / sleeping",
    "Cultural performance / ceremony",
    "Social gathering / party",
    "Street food / vendors",
    "Asking for directions",
    "Live music performance",
    "Outdoor work",
    "Children playing",
]

ACTIVITY_CONFIDENCE_FLOOR = 12.0  # Lower floor — activity is harder to distinguish


class ActivityClassifier:
    def __init__(self, model: object, processor: object):
        """Reuses the already-loaded CLIP model and processor — no extra memory cost."""
        self.model = model
        self.processor = processor

        with torch.no_grad():
            text_inputs = self.processor(
                text=ACTIVITY_LABELS,
                return_tensors="pt",
                padding=True,
            )
            text_out = self.model.text_model(**text_inputs)
            text_feats = self.model.text_projection(text_out.pooler_output)
            self.text_features = text_feats / text_feats.norm(dim=-1, keepdim=True)

        print("[ActivityClassifier] Ready.")

    def classify(self, image_features: torch.Tensor) -> dict:
        """Accepts pre-computed image features to avoid re-encoding the image."""
        with torch.no_grad():
            similarities = (100.0 * image_features @ self.text_features.T).softmax(dim=-1)

        top2 = similarities[0].topk(2)
        indices = top2.indices.tolist()
        scores = top2.values.tolist()

        top_confidence = round(scores[0] * 100, 1)
        top_activity = (
            DISPLAY_ACTIVITIES[indices[0]]
            if top_confidence >= ACTIVITY_CONFIDENCE_FLOOR
            else None
        )

        return {
            "activity": top_activity,
            "confidence": top_confidence,
            "alt_activity": DISPLAY_ACTIVITIES[indices[1]] if top_confidence >= ACTIVITY_CONFIDENCE_FLOOR else None,
        }

assert len(ACTIVITY_LABELS) == len(DISPLAY_ACTIVITIES), (
    f"ACTIVITY_LABELS ({len(ACTIVITY_LABELS)}) and DISPLAY_ACTIVITIES ({len(DISPLAY_ACTIVITIES)}) must match"
)
