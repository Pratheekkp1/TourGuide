"""
People detector combining:
- HOG full-body detector (catches background/partial/sideways people)
- Haar frontal face cascade (catches close-up faces accurately)
NMS merges overlapping boxes from both sources.
"""

import io
import cv2
import numpy as np
from PIL import Image


def _iou(a, b):
    """Intersection-over-union for two (x,y,w,h) boxes."""
    ax1, ay1 = a[0], a[1]
    ax2, ay2 = a[0] + a[2], a[1] + a[3]
    bx1, by1 = b[0], b[1]
    bx2, by2 = b[0] + b[2], b[1] + b[3]
    inter_w = max(0, min(ax2, bx2) - max(ax1, bx1))
    inter_h = max(0, min(ay2, by2) - max(ay1, by1))
    inter = inter_w * inter_h
    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union > 0 else 0


def _nms(boxes, iou_thresh=0.4):
    """Simple NMS — remove duplicate overlapping detections."""
    if len(boxes) == 0:
        return []
    kept = []
    for box in boxes:
        dominated = False
        for k in kept:
            if _iou(box, k) > iou_thresh:
                dominated = True
                break
        if not dominated:
            kept.append(box)
    return kept


class PeopleDetector:
    def __init__(self):
        print("[PeopleDetector] Loading detectors...")
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        print("[PeopleDetector] Ready.")

    def detect(self, image_bytes: bytes) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)
        h_img, w_img = image_np.shape[:2]

        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)

        # --- Haar frontal face detection (good for close-up faces) ---
        face_boxes = []
        frontal = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=6, minSize=(40, 40)
        )
        if len(frontal) > 0:
            face_boxes = [tuple(b) for b in frontal]

        # --- HOG full-body detection (catches background/sideways people) ---
        # Resize to fixed width for consistent HOG performance
        hog_w = 640
        scale = hog_w / w_img
        hog_h = int(h_img * scale)
        hog_img = cv2.resize(image_np, (hog_w, hog_h))
        hog_gray = cv2.cvtColor(hog_img, cv2.COLOR_RGB2GRAY)

        body_boxes_raw, weights = self.hog.detectMultiScale(
            hog_gray,
            winStride=(8, 8),
            padding=(4, 4),
            scale=1.05,
        )

        # Scale HOG boxes back to original image size and add margin
        body_boxes = []
        if len(body_boxes_raw) > 0:
            for (x, y, bw, bh) in body_boxes_raw:
                # HOG boxes often clip the head — expand upward slightly
                x_orig = int(x / scale)
                y_orig = int(max(0, (y - bh * 0.1)) / scale)
                w_orig = int(bw / scale)
                h_orig = int(bh * 1.1 / scale)
                body_boxes.append((x_orig, y_orig, w_orig, h_orig))

        # Merge face and body boxes, run NMS to remove duplicates
        all_boxes = face_boxes + body_boxes
        merged = _nms(all_boxes, iou_thresh=0.3)

        count = len(merged)

        if count == 0:
            density = "empty"
            social_state = "solitary"
        elif count == 1:
            density = "private"
            social_state = "one-on-one potential"
        elif count <= 4:
            density = "small group"
            social_state = "intimate group"
        elif count <= 10:
            density = "moderate crowd"
            social_state = "social setting"
        else:
            density = "crowded"
            social_state = "public crowd"

        detections = [
            {
                "x": round(x / w_img, 3),
                "y": round(y / h_img, 3),
                "w": round(w / w_img, 3),
                "h": round(h / h_img, 3),
                "type": "person",
            }
            for (x, y, w, h) in merged
        ]

        return {
            "people_count": count,
            "density": density,
            "social_state": social_state,
            "detections": detections,
        }
