import os
import uuid
import csv
from flask import Flask, render_template, request, jsonify, send_file
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULTS_CSV'] = 'results.csv'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Load model and class names
model = load_model('malaria_model.h5')
CLASS_NAMES = ['Parasitized', 'Uninfected']
IMG_SIZE = (64, 64)

def model_predict(img_path):
    img = image.load_img(img_path, target_size=IMG_SIZE)
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    prediction = model.predict(img_array)[0][0]

    # Your Tkinter logic: threshold 0.5 sigmoid output
    if prediction > 0.5:
        label = CLASS_NAMES[1]  # Uninfected
        confidence = prediction
    else:
        label = CLASS_NAMES[0]  # Parasitized
        confidence = 1 - prediction

    return label, confidence

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    files = request.files.getlist('images')
    results = []
    
    with open(app.config['RESULTS_CSV'], 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['Filename', 'Prediction', 'Confidence'])
        writer.writeheader()
        
        for file in files:
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4().hex}{ext}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            label, confidence = model_predict(filepath)
            confidence_pct = round(confidence * 100, 2)

            writer.writerow({'Filename': filename, 'Prediction': label, 'Confidence': confidence_pct})

            results.append({
                'filename': filename,
                'label': label,
                'confidence': confidence_pct
            })

    return jsonify(results)

@app.route('/download')
def download_csv():
    return send_file(app.config['RESULTS_CSV'], as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
    
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
