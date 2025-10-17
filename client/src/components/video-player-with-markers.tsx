import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, Share2, RectangleHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TimelineEvent {
  timestamp: string; // MM:SS format
  description: string;
  type: 'score' | 'kick' | 'punch' | 'violation';
  player?: string;
}

interface VideoPlayerWithMarkersProps {
  videoUrl: string;
  events: TimelineEvent[];
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

// Convert MM:SS to seconds
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Convert seconds to MM:SS
function secondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoPlayerWithMarkers({ 
  videoUrl, 
  events, 
  className = "",
  onPlayStateChange,
  onTimeUpdate 
}: VideoPlayerWithMarkersProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };
    
    const handleDurationChange = () => setDuration(video.duration);
    
    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onPlayStateChange]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    const newPlayingState = !isPlaying;
    if (newPlayingState) {
      video.play();
    } else {
      video.pause();
    }
    setIsPlaying(newPlayingState);
    onPlayStateChange?.(newPlayingState);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (container.requestFullscreen) {
      container.requestFullscreen();
    }
  };

  const jumpToEvent = (event: TimelineEvent) => {
    const video = videoRef.current;
    if (!video) return;
    const seconds = timeToSeconds(event.timestamp);
    video.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'score': return 'bg-green-500';
      case 'kick': return 'bg-blue-500';
      case 'punch': return 'bg-purple-500';
      case 'violation': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Auto-hide controls when playing
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const hideControlsTimer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(hideControlsTimer);
  }, [isPlaying, currentTime]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 ring-1 ring-slate-200 dark:ring-slate-800 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Removed the full purple gradient background */}
      
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="relative w-full h-auto"
        data-testid="video-player"
      />

      {/* Share Button (Top Right) */}
      <div className={`absolute top-4 right-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full p-2"
          data-testid="button-share"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Large Centered Play Button (when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="group relative"
            data-testid="button-play-overlay"
          >
            <div className="absolute inset-0 bg-white/30 dark:bg-white/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative bg-white/90 dark:bg-white/80 rounded-full p-8 group-hover:bg-white group-hover:scale-110 transition-all duration-200 shadow-2xl">
              <Play className="h-16 w-16 text-purple-600 dark:text-purple-700 fill-current" />
            </div>
          </button>
        </div>
      )}

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 via-slate-800/60 to-transparent p-5 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Timeline with Markers */}
        <div className="relative mb-4">
          {/* Background track */}
          <div className="relative h-1.5 mb-2">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer [&_[role=slider]]:bg-white [&_[role=slider]]:border-white"
              data-testid="video-timeline"
            />
          </div>
          
          {/* Event Markers - positioned below the timeline */}
          <div className="relative h-6 mt-1">
            {events.map((event, idx) => {
              const eventTime = timeToSeconds(event.timestamp);
              const position = (eventTime / duration) * 100;
              
              if (isNaN(position) || position < 0 || position > 100) return null;
              
              return (
                <div
                  key={idx}
                  className="absolute top-0 transform -translate-x-1/2 cursor-pointer group"
                  style={{ left: `${position}%` }}
                  onClick={() => jumpToEvent(event)}
                  onMouseEnter={() => setHoveredEvent(event)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  data-testid={`marker-${event.type}-${idx}`}
                >
                  <div className={`w-2.5 h-6 ${getEventColor(event.type)} rounded-sm hover:scale-125 hover:shadow-lg transition-all duration-200 shadow-md`} />
                  
                  {/* Tooltip */}
                  {hoveredEvent === event && (
                    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-xs p-3 rounded-lg shadow-2xl whitespace-nowrap z-50 border border-white/10">
                      <div className="font-bold text-purple-400 text-sm">{event.timestamp}</div>
                      <div className="mt-1.5 font-medium">{event.description}</div>
                      {event.player && <div className="text-gray-400 mt-1 text-xs">{event.player}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlay}
            className="text-white hover:bg-white/20 transition-all duration-200 p-2"
            data-testid="button-play-pause"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          {/* Skip Back */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, currentTime - 10);
              }
            }}
            className="text-white hover:bg-white/20 transition-all duration-200 p-2"
            data-testid="button-skip-back"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Skip Forward */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.min(duration, currentTime + 10);
              }
            }}
            className="text-white hover:bg-white/20 transition-all duration-200 p-2"
            data-testid="button-skip-forward"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 transition-all duration-200 p-2"
              data-testid="button-mute"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-20 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white"
              data-testid="slider-volume"
            />
          </div>

          {/* Time Display */}
          <div className="text-white text-sm font-medium ml-2" data-testid="text-time">
            {secondsToTime(currentTime)} / {secondsToTime(duration)}
          </div>

          <div className="flex-1" />

          {/* Settings */}
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 transition-all duration-200 p-2"
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Picture in Picture */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (videoRef.current && 'requestPictureInPicture' in videoRef.current) {
                (videoRef.current as any).requestPictureInPicture();
              }
            }}
            className="text-white hover:bg-white/20 transition-all duration-200 p-2"
            data-testid="button-pip"
          >
            <RectangleHorizontal className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20 transition-all duration-200 p-2"
            data-testid="button-fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
