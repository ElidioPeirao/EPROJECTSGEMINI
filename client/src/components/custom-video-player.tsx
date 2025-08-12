import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

interface CustomVideoPlayerProps {
  youtubeUrl: string;
  videoSource?: 'youtube' | 'drive';
  width?: string | number;
  height?: string | number;
}

const extractYoutubeId = (url: string): string | null => {
  // Padrões de URL do YouTube
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([^#&?]*).*/,
    /youtube\.com\/watch\?.*v=([^&]*)/,
    /youtu\.be\/([^?]*)/,
    /youtube\.com\/embed\/([^?]*)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Extrair ID do Google Drive
const extractDriveId = (url: string): string | null => {
  // Padrões de URL do Google Drive
  const patterns = [
    /drive\.google\.com\/file\/d\/([-\w]{25,})/,
    /drive\.google\.com\/open\?id=([-\w]{25,})/,
    /docs\.google\.com\/file\/d\/([-\w]{25,})\/edit/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  youtubeUrl, 
  videoSource = 'youtube',
  width = '100%', 
  height = 'auto'
}) => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extrair ID do vídeo ao carregar o componente ou quando a URL mudar
  useEffect(() => {
    if (videoSource === 'youtube') {
      const id = extractYoutubeId(youtubeUrl);
      setVideoId(id);
    } else if (videoSource === 'drive') {
      const id = extractDriveId(youtubeUrl);
      setVideoId(id);
    }
  }, [youtubeUrl, videoSource]);
  
  // Escutar eventos do player do YouTube
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          
          // Verificar se é um evento do player do YouTube
          if (data.event === 'onStateChange') {
            // 1: reproduzindo, 2: pausado
            if (data.info === 1) {
              setIsPlaying(true);
              setIsOverlayVisible(false);
            } else if (data.info === 2) {
              setIsPlaying(false);
              setIsOverlayVisible(true);
            }
          }
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Função para controlar o player via API do YouTube
  const postMessageToPlayer = (action: string, value?: any) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    const message = {
      event: 'command',
      func: action,
      args: value !== undefined ? [value] : []
    };
    
    iframeRef.current.contentWindow.postMessage(JSON.stringify(message), '*');
  };

  const togglePlay = () => {
    if (isPlaying) {
      postMessageToPlayer('pauseVideo');
      setIsOverlayVisible(true);
    } else {
      postMessageToPlayer('playVideo');
      setIsOverlayVisible(false);
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (isMuted) {
      postMessageToPlayer('unMute');
    } else {
      postMessageToPlayer('mute');
    }
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;

    if (!isFullscreen) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };

  // Adicionar event listener para detectar saída do modo fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Se não houver ID de vídeo válido, mostrar mensagem
  if (!videoId) {
    return (
      <Card className="bg-slate-100">
        <CardContent className="flex items-center justify-center p-6 text-center">
          <p className="text-slate-500">URL de vídeo inválida ou não suportada</p>
        </CardContent>
      </Card>
    );
  }

  // Determinar o URL do iframe com base na fonte do vídeo
  const getVideoEmbedUrl = () => {
    if (videoSource === 'youtube') {
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1&rel=0&showinfo=0&fs=0&controls=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&loop=0&color=white&autohide=1&theme=dark&playsinline=1&mute=0&playlist=${videoId}&fs=0&showsearch=0&ecver=2&autoplay=0&start=0&hl=pt-BR&enablecastingthumb=0&enablecastingicons=0&enablecastingcopy=0&title=0&channel=0&annotations=0&nolightbox=1&embedded=true`;
    } else if (videoSource === 'drive') {
      // URL seguro do Google Drive sem permitir abrir em nova janela ou baixar
      return `https://drive.google.com/file/d/${videoId}/preview?usp=sharing&embedded=true&rm=minimal`;
    }
    return '';
  };

  return (
    <div 
      ref={playerRef} 
      className={`custom-video-player relative rounded-lg overflow-hidden bg-black group ${isPlaying ? 'playing' : ''}`}
      style={{ width, height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div 
        className="video-container relative w-full cursor-pointer" 
        style={{ paddingBottom: '56.25%' }}
        onClick={togglePlay}
      >
        <iframe 
          ref={iframeRef}
          src={getVideoEmbedUrl()}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
          style={{ 
            pointerEvents: 'auto' // Permitir interações com o iframe para que o vídeo possa ser reproduzido
          }}
          title={videoSource === 'youtube' ? "YouTube video player" : "Google Drive video player"}
          // Para vídeos do drive, removemos o sandbox para permitir reprodução normal
          // O overlay nas bordas bloqueará os botões indesejados
        />
        
        {/* Overlay transparente apenas para proteger as bordas */}
        {videoSource === 'drive' && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Overlay opaco apenas nas margens onde ficam botões externos indesejados */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-black/5 pointer-events-auto"></div>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/5 pointer-events-auto"></div>
            <div className="absolute top-10 bottom-10 left-0 w-10 bg-black/5 pointer-events-auto"></div>
            <div className="absolute top-10 bottom-10 right-0 w-10 bg-black/5 pointer-events-auto"></div>
          </div>
        )}
        
        {/* Overlay para exibir ícone grande de play quando pausado */}
        {!isPlaying && isOverlayVisible && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="bg-ep-orange/90 rounded-full p-5 backdrop-blur-sm shadow-lg transform transition-transform hover:scale-110">
              <Play size={48} className="text-white" />
            </div>
          </div>
        )}
      </div>
      
      <div className="player-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;