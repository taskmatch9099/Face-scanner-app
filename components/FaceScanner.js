import React, { useRef, useEffect, useState } from 'react'
import * as faceapi from 'face-api.js'

const FaceScanner = () => {
  const videoRef = useRef()
  const canvasRef = useRef()
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [detections, setDetections] = useState([])
  const [error, setError] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face-api models...')
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        await faceapi.nets.faceExpressionNet.loadFromUri('/models')
        await faceapi.nets.ageGenderNet.loadFromUri('/models')
        setIsModelLoaded(true)
        console.log('All models loaded successfully')
      } catch (err) {
        console.error('Error loading models:', err)
        setError('Failed to load face recognition models')
      }
    }
    loadModels()
  }, [])

  // Start camera
  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 720, 
          height: 560,
          facingMode: 'user' 
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraOn(false)
      setIsDetecting(false)
      setDetections([])
      
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  // Start face detection
  const startDetection = async () => {
    if (!isModelLoaded || !isCameraOn || !videoRef.current) return
    
    setIsDetecting(true)
    
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current || !isDetecting) return

      const video = videoRef.current
      const canvas = canvasRef.current
      
      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      faceapi.matchDimensions(canvas, displaySize)

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender()

        // Clear previous drawings
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detections.length > 0) {
          // Resize detections to match display size
          const resizedDetections = faceapi.resizeResults(detections, displaySize)
          
          // Draw detections
          faceapi.draw.drawDetections(canvas, resizedDetections)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections)

          // Update state with detection info
          const faceData = resizedDetections.map((detection, index) => ({
            id: index,
            confidence: Math.round(detection.detection.score * 100),
            age: Math.round(detection.age),
            gender: detection.gender,
            genderConfidence: Math.round(detection.genderProbability * 100),
            expressions: detection.expressions,
            topExpression: Object.entries(detection.expressions)
              .reduce((a, b) => detection.expressions[a[0]] > detection.expressions[b[0]] ? a : b)
          }))
          
          setDetections(faceData)
        } else {
          setDetections([])
        }
      } catch (err) {
        console.error('Detection error:', err)
      }

      // Continue detection
      if (isDetecting) {
        requestAnimationFrame(detectFaces)
      }
    }

    detectFaces()
  }

  // Stop face detection
  const stopDetection = () => {
    setIsDetecting(false)
    setDetections([])
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  // Status message
  const getStatusMessage = () => {
    if (error) return { text: error, type: 'error' }
    if (!isModelLoaded) return { text: 'Loading face recognition models...', type: 'loading' }
    if (!isCameraOn) return { text: 'Camera is off. Click "Start Camera" to begin.', type: 'ready' }
    if (!isDetecting) return { text: 'Camera is ready. Click "Start Detection" to analyze faces.', type: 'ready' }
    return { text: `Detecting faces... Found ${detections.length} face(s)`, type: 'ready' }
  }

  const status = getStatusMessage()

  return (
    <div className="scanner-container">
      <div className={`status ${status.type}`}>
        {status.text}
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
          style={{ 
            width: '720px', 
            height: '560px',
            display: isCameraOn ? 'block' : 'none'
          }}
        />
        <canvas
          ref={canvasRef}
          className="canvas-overlay"
          style={{ 
            width: '720px', 
            height: '560px',
            display: isCameraOn ? 'block' : 'none'
          }}
        />
        {!isCameraOn && (
          <div style={{
            width: '720px',
            height: '560px',
            background: 'linear-gradient(45deg, #ddd, #bbb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '15px',
            color: '#666',
            fontSize: '18px'
          }}>
            Camera Preview Will Appear Here
          </div>
        )}
      </div>

      <div className="controls">
        <button
          onClick={isCameraOn ? stopCamera : startCamera}
          className={`btn ${isCameraOn ? 'btn-secondary' : 'btn-primary'}`}
          disabled={!isModelLoaded}
        >
          {isCameraOn ? 'Stop Camera' : 'Start Camera'}
        </button>
        
        <button
          onClick={isDetecting ? stopDetection : startDetection}
          className={`btn ${isDetecting ? 'btn-secondary' : 'btn-primary'}`}
          disabled={!isModelLoaded || !isCameraOn}
        >
          {isDetecting ? 'Stop Detection' : 'Start Detection'}
        </button>
      </div>

      {detections.length > 0 && (
        <div className="detection-info">
          <h3>Face Analysis Results</h3>
          <div className="face-info">
            {detections.map((face, index) => (
              <div key={face.id} className="face-card">
                <h4>Face {index + 1}</h4>
                <p><strong>Confidence:</strong> {face.confidence}%</p>
                <p><strong>Age:</strong> ~{face.age} years</p>
                <p><strong>Gender:</strong> {face.gender} ({face.genderConfidence}%)</p>
                <p><strong>Expression:</strong> {face.topExpression[0]} ({Math.round(face.topExpression[1] * 100)}%)</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FaceScanner