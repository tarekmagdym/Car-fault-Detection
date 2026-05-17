const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

const CLASS_MAPPING = {
    battery: ['battery_corrosion', 'normal_battery'],
    leak: ['fuel_leak', 'normal_fuel', 'oil_leak', 'normal_oil_leak', 'normal_under_car'],
    smoke: ['smoke', 'normal_engine_bay'],
    rust: ['rust', 'normal_body'],
    tires: ['tire_wear', 'normal_tire']
};

const FAULT_CLASSES = ['battery_corrosion', 'fuel_leak', 'oil_leak', 'rust', 'smoke', 'tire_wear'];

function mapResultToFeature(result, featureType) {
    const featureClasses = CLASS_MAPPING[featureType] || [];
    const matchedClass = featureClasses.find(c => result.class.toLowerCase().includes(c.toLowerCase()));
    
    if (matchedClass) {
        const isFault = FAULT_CLASSES.includes(matchedClass);
        return {
            detected: matchedClass,
            isFault: isFault,
            confidence: result.confidence,
            allPredictions: result.predictions
        };
    }
    
    return {
        detected: result.class,
        isFault: FAULT_CLASSES.includes(result.class),
        confidence: result.confidence,
        allPredictions: result.predictions
    };
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Car Fault Detection API is running' });
});

app.post('/api/predict', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const featureType = req.body.feature || 'battery';
    const pythonScript = path.resolve(__dirname, 'predict.py');
    const imagePath = path.resolve(__dirname, req.file.path);
    const modelPath = path.resolve(__dirname, '../models/best.pt');

    if (!fs.existsSync(modelPath)) {
        fs.unlinkSync(imagePath);
        return res.status(500).json({ error: 'Model not found. Please train the model first.' });
    }

    const python = spawn('python', [pythonScript, imagePath, modelPath]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
        result += data.toString();
    });

    python.stderr.on('data', (data) => {
        error += data.toString();
    });

    python.on('close', (code) => {
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        
        if (code !== 0 || error) {
            console.error('Python error:', error);
            return res.status(500).json({ error: 'Prediction failed', details: error });
        }

        try {
            const prediction = JSON.parse(result.trim());
            const featureResult = mapResultToFeature(prediction, featureType);
            
            res.json({
                success: true,
                feature: featureType,
                ...featureResult
            });
        } catch (e) {
            res.status(500).json({ error: 'Invalid prediction result', raw: result });
        }
    });
});

function handlePredict(req, res, featureType) {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const pythonScript = path.resolve(__dirname, 'predict.py');
    const imagePath = path.resolve(__dirname, req.file.path);
    const modelPath = path.resolve(__dirname, '../models/best.pt');

    if (!fs.existsSync(modelPath)) {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        return res.status(500).json({ error: 'Model not found. Please train the model first.' });
    }

    const python = spawn('python', [pythonScript, imagePath, modelPath]);
    let result = '';
    let error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', (code) => {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        
        if (code !== 0 || error) {
            return res.status(500).json({ error: 'Prediction failed', details: error });
        }

        try {
            const prediction = JSON.parse(result.trim());
            const featureResult = mapResultToFeature(prediction, featureType);
            res.json({ success: true, feature: featureType, ...featureResult });
        } catch (e) {
            res.status(500).json({ error: 'Invalid prediction result', raw: result });
        }
    });
}

app.post('/api/predict/battery', upload.single('image'), (req, res) => handlePredict(req, res, 'battery'));
app.post('/api/predict/leak', upload.single('image'), (req, res) => handlePredict(req, res, 'leak'));
app.post('/api/predict/smoke', upload.single('image'), (req, res) => handlePredict(req, res, 'smoke'));
app.post('/api/predict/rust', upload.single('image'), (req, res) => handlePredict(req, res, 'rust'));
app.post('/api/predict/tires', upload.single('image'), (req, res) => handlePredict(req, res, 'tires'));

app.get('/api/models/status', (req, res) => {
    const modelPath = path.resolve(__dirname, '../models/best.pt');
    const exists = fs.existsSync(modelPath);
    res.json({ 
        modelLoaded: exists,
        modelPath: exists ? '../models/best.pt' : null
    });
});

app.post('/api/train', (req, res) => {
    const { epochs, batchSize } = req.body;
    
    const pythonScript = path.resolve(__dirname, 'train.py');
    const args = [pythonScript, '--epochs', epochs || '100', '--batch', batchSize || '16'];

    const python = spawn('python', args);
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
        error += data.toString();
    });

    python.on('close', (code) => {
        if (code === 0) {
            res.json({ success: true, message: 'Training completed', output });
        } else {
            res.status(500).json({ error: 'Training failed', details: error || output });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Car Fault Detection API running on http://localhost:${PORT}`);
});