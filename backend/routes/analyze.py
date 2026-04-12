from collections import deque, Counter
from fastapi import APIRouter, File, UploadFile, HTTPException
from models.scene_classifier import SceneClassifier
from models.people_detector import PeopleDetector
from models.activity_classifier import ActivityClassifier

router = APIRouter()

# Models loaded once at startup
scene_clf = SceneClassifier()
people_det = PeopleDetector()
# Reuses CLIP model/processor from scene_clf — no extra memory
activity_clf = ActivityClassifier(scene_clf.model, scene_clf.processor)

# Temporal smoothing — requires majority of last N frames to switch scenes
_SMOOTH_WINDOW = 5
_SWITCH_THRESHOLD = 3   # need 3-of-5 votes to change label (hysteresis)
_scene_history: deque = deque(maxlen=_SMOOTH_WINDOW)
_current_scene: dict | None = None


def _smooth_scene(current: dict) -> dict:
    global _current_scene
    _scene_history.append(current)

    # Count votes for each scene name in window
    names = [s["scene"] for s in _scene_history]
    counts = Counter(names)
    most_common_name, most_common_count = counts.most_common(1)[0]

    # Only switch if the new winner has enough votes
    if most_common_count >= _SWITCH_THRESHOLD:
        candidates = [s for s in _scene_history if s["scene"] == most_common_name]
        _current_scene = max(candidates, key=lambda s: s["confidence"])

    # If no scene established yet, use current frame
    if _current_scene is None:
        _current_scene = current

    return _current_scene


@router.post("/analyze")
async def analyze_frame(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image file")

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image")

    # Encode image once, reuse for both classifiers
    scene, image_features = scene_clf.classify(image_bytes)
    activity = activity_clf.classify(image_features)
    people = people_det.detect(image_bytes)

    return {
        "scene": _smooth_scene(scene),
        "activity": activity,
        "people": people,
    }
