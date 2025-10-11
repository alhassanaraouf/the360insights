import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

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
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
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

  return (
    <div className={`w-full ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto bg-black rounded-t-lg"
        data-testid="video-player"
      />

      {/* Controls */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 rounded-b-lg shadow-xl border-t border-gray-700">
        {/* Timeline with Markers */}
        <div className="relative mb-4">
          {/* Background track */}
          <div className="relative h-3 mb-2">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
              data-testid="video-timeline"
            />
          </div>
          
          {/* Event Markers - positioned below the timeline */}
          <div className="relative h-8 mt-1">
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
                  <div className={`w-3 h-7 ${getEventColor(event.type)} rounded-md hover:scale-125 hover:shadow-lg transition-all duration-200 shadow-md`} />
                  
                  {/* Tooltip */}
                  {hoveredEvent === event && (
                    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/50 text-white text-xs p-3 rounded-lg shadow-2xl whitespace-nowrap z-50 backdrop-blur-sm">
                      <div className="font-bold text-blue-300 text-sm">{event.timestamp}</div>
                      <div className="mt-1.5 font-medium">{event.description}</div>
                      {event.player && <div className="text-gray-300 mt-1 text-xs">{event.player}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4 mt-2">
          {/* Play/Pause */}
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlay}
            className="text-white hover:bg-blue-600 hover:text-white transition-all duration-200 rounded-lg shadow-md hover:shadow-lg"
            data-testid="button-play-pause"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          {/* Time Display */}
          <div className="text-white text-sm font-mono bg-gray-800/50 px-3 py-1 rounded-md" data-testid="text-time">
            {secondsToTime(currentTime)} / {secondsToTime(duration)}
          </div>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:bg-purple-600 hover:text-white transition-all duration-200 rounded-lg shadow-md hover:shadow-lg"
              data-testid="button-mute"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-24"
              data-testid="slider-volume"
            />
          </div>

          {/* Fullscreen */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white hover:bg-green-600 hover:text-white transition-all duration-200 rounded-lg shadow-md hover:shadow-lg"
            data-testid="button-fullscreen"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
