import { useEffect, useRef } from 'react'

export default function Camera({ captureRef }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let stream
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(console.error)
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    captureRef.current = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !video.videoWidth) return null
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    }
  }, [captureRef])

  return (
    <>
      <video
        ref={videoRef}
        autoPlay playsInline muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanline grid */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,70,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,70,0.03) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }} />

      {/* Heavy vignette */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* Animated scan sweep */}
      <div className="absolute left-0 right-0 h-px pointer-events-none z-10 animate-scan" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,70,0.5) 30%, rgba(0,255,70,0.8) 50%, rgba(0,255,70,0.5) 70%, transparent 100%)',
        filter: 'blur(0.5px)',
      }} />

      {/* Top-left corner bracket */}
      <div className="absolute top-12 left-0 pointer-events-none z-10 ml-2 mt-2">
        <div className="w-10 h-10 border-t-2 border-l-2 border-green-500/50" />
      </div>
      {/* Top-right corner bracket */}
      <div className="absolute top-12 right-0 pointer-events-none z-10 mr-2 mt-2">
        <div className="w-10 h-10 border-t-2 border-r-2 border-green-500/50" />
      </div>
      {/* Bottom-left corner bracket */}
      <div className="absolute bottom-0 left-0 pointer-events-none z-10 ml-2 mb-6">
        <div className="w-10 h-10 border-b-2 border-l-2 border-green-500/50" />
      </div>
      {/* Bottom-right corner bracket */}
      <div className="absolute bottom-0 right-0 pointer-events-none z-10 mr-2 mb-6">
        <div className="w-10 h-10 border-b-2 border-r-2 border-green-500/50" />
      </div>

      {/* Center reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative opacity-20">
          <div className="w-6 h-6 border border-green-400 rounded-full" />
          <div className="absolute top-1/2 -left-3 right-auto w-2 h-px bg-green-400" />
          <div className="absolute top-1/2 left-full w-2 h-px bg-green-400 ml-1" />
          <div className="absolute left-1/2 -top-3 h-2 w-px bg-green-400" />
          <div className="absolute left-1/2 top-full h-2 w-px bg-green-400 mt-1" />
        </div>
      </div>
    </>
  )
}
