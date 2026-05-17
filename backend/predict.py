import sys
import json
import os

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

try:
    from ultralytics import YOLO
except ImportError:
    print(json.dumps({"error": "Ultralytics not installed"}))
    sys.exit(1)

def predict(image_path, model_path):
    if not os.path.exists(image_path):
        print(json.dumps({"error": "Image not found"}))
        sys.exit(1)
    
    if not os.path.exists(model_path):
        print(json.dumps({"error": "Model not found"}))
        sys.exit(1)
    
    try:
        model = YOLO(model_path)
        results = model(image_path, verbose=False)
        
        probs = results[0].probs
        top1_idx = probs.top1
        top1_conf = probs.top1conf.item()
        top5_indices = probs.top5
        top5_confs = probs.top5conf
        
        class_names = results[0].names
        
        predictions = []
        for idx, conf in zip(top5_indices, top5_confs):
            predictions.append({
                'class': class_names[idx],
                'confidence': round(float(conf.item()) * 100, 2)
            })
        
        result = {
            'class': class_names[top1_idx],
            'confidence': round(top1_conf * 100, 2),
            'predictions': predictions
        }
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: predict.py <image_path> <model_path>"}))
        sys.exit(1)
    predict(sys.argv[1], sys.argv[2])