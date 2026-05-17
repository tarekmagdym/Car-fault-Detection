import sys
import os
import argparse

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

try:
    from ultralytics import YOLO
except ImportError:
    print("Error: Ultralytics not installed. Run: pip install ultralytics")
    sys.exit(1)

def train(epochs=100, batch_size=16):
    print(f"Starting training with {epochs} epochs and batch size {batch_size}")
    
    base_model = 'yolov8n-cls.pt'
    
    if not os.path.exists(base_model):
        print(f"Downloading base model: {base_model}")
        model = YOLO(base_model)
    else:
        print(f"Using existing model: {base_model}")
        model = YOLO(base_model)
    
    dataset_path = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        print("Please add your training data to the dataset folder")
        sys.exit(1)
    
    results = model.train(
        data=dataset_path,
        epochs=int(epochs),
        imgsz=224,
        batch=int(batch_size),
        device='cpu',
        workers=2,
        patience=100,
        project=os.path.join(os.path.dirname(__file__), '..', 'runs'),
        name='train',
        exist_ok=True,
        verbose=True,
        optimizer='AdamW',
        lr0=0.001,
        lrf=0.01
    )
    
    model_save_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'best.pt')
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    
    best_weights = os.path.join(os.path.dirname(__file__), '..', 'runs', 'train', 'weights', 'best.pt')
    if os.path.exists(best_weights):
        import shutil
        shutil.copy(best_weights, model_save_path)
        print(f"Model saved to: {model_save_path}")
    
    print("Training completed successfully!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train YOLOv8 Classification Model')
    parser.add_argument('--epochs', default='100', help='Number of epochs')
    parser.add_argument('--batch', default='16', help='Batch size')
    args = parser.parse_args()
    
    train(args.epochs, args.batch)