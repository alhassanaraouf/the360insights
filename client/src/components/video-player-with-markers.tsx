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

export default function VideoPlayerWithMarkers({ videoUrl, events, className = "" }: VideoPlayerWithMarkersProps) {
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

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
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
    <div className={`relative ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto bg-black rounded-t-lg"
        data-testid="video-player"
      />

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 to-transparent p-4 rounded-b-lg">
        {/* Timeline with Markers */}
        <div className="relative mb-4">
          {/* Progress Bar */}
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            data-testid="video-timeline"
          />
          
          {/* Event Markers */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
            {events.map((event, idx) => {
              const eventTime = timeToSeconds(event.timestamp);
              const position = (eventTime / duration) * 100;
              
              if (isNaN(position) || position < 0 || position > 100) return null;
              
              return (
                <div
                  key={idx}
                  className="absolute top-0 transform -translate-x-1/2 pointer-events-auto cursor-pointer"
                  style={{ left: `${position}%` }}
                  onClick={() => jumpToEvent(event)}
                  onMouseEnter={() => setHoveredEvent(event)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  data-testid={`marker-${event.type}-${idx}`}
                >
                  <div className={`w-1 h-4 ${getEventColor(event.type)} rounded-full`} />
                  
                  {/* Tooltip */}
                  {hoveredEvent === event && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/95 text-white text-xs p-2 rounded whitespace-nowrap z-10">
                      <div className="font-semibold">{event.timestamp}</div>
                      <div>{event.description}</div>
                      {event.player && <div className="text-gray-400">{event.player}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlay}
            className="text-white hover:text-white/80"
            data-testid="button-play-pause"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          {/* Time Display */}
          <div className="text-white text-sm" data-testid="text-time">
            {secondsToTime(currentTime)} / {secondsToTime(duration)}
          </div>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:text-white/80"
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
            className="text-white hover:text-white/80"
            data-testid="button-fullscreen"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
