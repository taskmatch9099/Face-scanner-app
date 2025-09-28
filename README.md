# 🤖 AI Face Scanner App

A modern React-based face detection and analysis application built with Next.js, Face-API.js, and WebRTC.

## ✨ Features

- **Real-time Face Detection**: Detects faces in real-time using your camera
- **Face Analysis**: Provides age estimation, gender detection, and emotion recognition
- **Modern UI**: Beautiful, responsive interface with gradient designs
- **WebRTC Integration**: Direct camera access through WebRTC
- **Server-Side Rendering**: Built with Next.js for optimal performance and SEO

## 🛠️ Technologies Used

- **React** - Frontend UI framework
- **Next.js** - React framework with SSR support
- **Face-API.js** - Face detection and recognition library
- **TensorFlow.js** - Machine learning backend
- **WebRTC** - Camera access and media streaming
- **CSS3** - Modern styling with gradients and animations

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A webcam or camera device
- Modern web browser with WebRTC support

### Installation

1. Clone the repository:
```bash
git clone https://github.com/taskmatch9099/Face-scanner-app.git
cd Face-scanner-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

## 📱 Usage

1. **Grant Camera Permission**: When prompted, allow the app to access your camera
2. **Start Camera**: Click the "Start Camera" button to begin video capture
3. **Start Detection**: Click "Start Detection" to begin face analysis
4. **View Results**: The app will display bounding boxes around detected faces and show analysis results including:
   - Age estimation
   - Gender detection
   - Emotion/expression recognition
   - Detection confidence scores

## 🔧 Configuration

The app uses Face-API.js models stored in the `public/models` directory. The following models are included:

- `tiny_face_detector_model` - Fast face detection
- `face_landmark_68_model` - 68-point facial landmark detection
- `face_recognition_model` - Face recognition features
- `face_expression_model` - Emotion/expression recognition
- `age_gender_model` - Age and gender estimation

## 🎨 Customization

### Styling
Modify `styles/globals.css` to customize the appearance:
- Change color schemes by updating gradient values
- Adjust component sizes and spacing
- Modify responsive breakpoints

### Detection Settings
Update detection parameters in `components/FaceScanner.js`:
- Adjust detection confidence thresholds
- Modify video resolution settings
- Change detection frequency

## 🔒 Privacy & Security

- All face processing happens locally in your browser
- No video or face data is sent to external servers
- Camera access requires explicit user permission
- Models are loaded once and cached for performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Face-API.js](https://github.com/justadudewhohacks/face-api.js) for the face detection library
- [TensorFlow.js](https://www.tensorflow.org/js) for machine learning capabilities
- [Next.js](https://nextjs.org/) for the React framework
- The open-source community for various tools and libraries used

## 🐛 Troubleshooting

### Camera Access Issues
- Ensure you're accessing the app via HTTPS (required for camera access in production)
- Check browser permissions for camera access
- Try refreshing the page and granting permissions again

### Model Loading Issues
- Check that all model files are present in `public/models/`
- Ensure you have a stable internet connection during initial load
- Clear browser cache if models fail to load

### Performance Issues
- Close other applications using the camera
- Try reducing video resolution in the camera settings
- Use a modern browser with WebRTC support

---

For more information or support, please open an issue on GitHub. 
