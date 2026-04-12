"""
Scene classifier using CLIP zero-shot inference.
Labels are written as rich visual descriptions — CLIP responds to specifics, not category names.
"""

import io
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image

# Each label is a detailed visual description of what the scene looks like.
# More visual detail = better CLIP matching.
SCENE_LABELS = [
    "a bedroom or dorm room interior with a bed, pillows, desk, posters on walls, and personal belongings — people may be present",
    "a restaurant or cafe interior with dining tables, chairs, menus, and people eating food",
    "a subway station or bus terminal with tiled platforms, metal benches, and commuters waiting",
    "an outdoor street market or bazaar with colorful stalls, vendors selling goods, and large crowds",
    "a corporate office interior with desktop computers, office desks, cubicle partitions, and fluorescent ceiling lights",
    "a casual house party in a living room or common area with many people standing, talking loudly, holding drinks or red cups",
    "the interior of a church, mosque, or temple with religious symbols, altars, pews, and stained glass",
    "a hospital waiting room or medical clinic with rows of chairs, sterile white walls, and medical equipment",
    "a university lecture hall or school classroom with rows of seats, a whiteboard, and students",
    "a retail shopping mall or store interior with product displays, clothing racks, and merchandise shelves",
    "an outdoor park or garden with green trees, grass lawns, benches, and open sky",
    "a government building office or DMV with waiting area chairs, numbered ticket system, and official signage",
    "a hotel lobby or reception area with a front desk, luggage carts, and decorative furnishings",
    "a bar, nightclub, or lounge interior with dim lighting, bar stools, liquor bottles, and cocktail glasses",
    "an airport terminal with departure gate signs, rows of seating, luggage, and flight information displays",
    "a gym or fitness center with treadmills, weight racks, exercise machines, and floor mirrors",
    "a library or study room with tall bookshelves filled with books, reading tables, and quiet lighting",
    "a kitchen interior with stove, oven, sink, countertops, cabinets, and food preparation surfaces",
    "a living room with a sofa, coffee table, wall-mounted television, and home decor",
    "a construction site or industrial factory floor with tools, machinery, scaffolding, and workers in hard hats",
    "a conference room or boardroom with a long meeting table, office chairs, and a projector screen",
    "a grocery store or supermarket interior with long food aisles, product shelves, and shopping carts",
    "a college or university campus outdoor area with brick buildings, walkways, and students",
    "a coffee shop interior with espresso machines, pastry display cases, and people on laptops",
    "an outdoor city street or sidewalk with buildings, pedestrians, and parked cars",
    "a pharmacy or drugstore with medicine shelves, a pharmacy counter, and health products",
    "a bank or financial institution interior with teller windows, waiting area, and ATM machines",
    "a fast food restaurant with a counter, menu boards above, and people ordering food",
    "a laundromat with rows of washing machines, dryers, and people folding clothes",
    "a police station or government security building with officers, desks, and official signs",
    "a hair salon or barbershop with styling chairs, mirrors, and hairdressing equipment",
    "an outdoor farmers market or community market with fresh produce stalls and local vendors",
]

DISPLAY_LABELS = [
    "Bedroom / Dorm",
    "Restaurant / Cafe",
    "Transit Station",
    "Street Market",
    "Office / Workplace",
    "Social Gathering",
    "Religious Space",
    "Hospital / Clinic",
    "University / Classroom",
    "Shopping Mall / Store",
    "Park / Outdoors",
    "Government Office",
    "Hotel / Lobby",
    "Bar / Nightclub",
    "Airport / Transit Hub",
    "Gym / Fitness Center",
    "Library",
    "Kitchen",
    "Living Room",
    "Construction / Industrial",
    "Conference Room",
    "Grocery Store",
    "Campus / Quad",
    "Coffee Shop",
    "City Street",
    "Pharmacy / Drugstore",
    "Bank",
    "Fast Food",
    "Laundromat",
    "Police Station",
    "Hair Salon / Barbershop",
    "Farmers Market",
]

CONFIDENCE_FLOOR = 20.0  # Below this, report as ambiguous

assert len(SCENE_LABELS) == len(DISPLAY_LABELS), (
    f"SCENE_LABELS ({len(SCENE_LABELS)}) and DISPLAY_LABELS ({len(DISPLAY_LABELS)}) must have equal length"
)


class SceneClassifier:
    def __init__(self):
        print("[SceneClassifier] Loading CLIP model...")
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.model.eval()

        with torch.no_grad():
            text_inputs = self.processor(
                text=SCENE_LABELS,
                return_tensors="pt",
                padding=True,
            )
            text_out = self.model.text_model(**text_inputs)
            text_feats = self.model.text_projection(text_out.pooler_output)
            self.text_features = text_feats / text_feats.norm(dim=-1, keepdim=True)

        print("[SceneClassifier] Ready.")

    def encode_image(self, image_bytes: bytes):
        """Returns normalized image features tensor. Reusable by other classifiers."""
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        w, h = image.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        image = image.crop((left, top, left + side, top + side))
        image = image.resize((336, 336), Image.LANCZOS)

        with torch.no_grad():
            image_inputs = self.processor(images=image, return_tensors="pt")
            image_out = self.model.vision_model(**image_inputs)
            image_feats = self.model.visual_projection(image_out.pooler_output)
            return image_feats / image_feats.norm(dim=-1, keepdim=True)

    def classify(self, image_bytes: bytes) -> tuple:
        """Returns (scene_dict, image_features) so image_features can be reused."""
        image_features = self.encode_image(image_bytes)

        with torch.no_grad():
            similarities = (100.0 * image_features @ self.text_features.T).softmax(dim=-1)

        top3 = similarities[0].topk(3)
        indices = top3.indices.tolist()
        scores = top3.values.tolist()

        top_confidence = round(scores[0] * 100, 1)
        top_scene = DISPLAY_LABELS[indices[0]] if top_confidence >= CONFIDENCE_FLOOR else "Ambiguous Environment"

        result = {
            "scene": top_scene,
            "confidence": top_confidence,
            "alternatives": [
                {"scene": DISPLAY_LABELS[i], "confidence": round(s * 100, 1)}
                for i, s in zip(indices[1:], scores[1:])
            ],
        }
        return result, image_features
