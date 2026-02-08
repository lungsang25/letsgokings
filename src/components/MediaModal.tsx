import { useState } from 'react';
import { Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
}

// Curated list of motivational/self-improvement videos
const videos: Video[] = [
  { id: 'EmKKSQ0Dy4M', title: 'Video 1', thumbnail: 'https://img.youtube.com/vi/EmKKSQ0Dy4M/mqdefault.jpg' },
  { id: 'gJctVD_oMx4', title: 'Video 2', thumbnail: 'https://img.youtube.com/vi/gJctVD_oMx4/mqdefault.jpg' },
  { id: '0KqmvRtQV-E', title: 'Video 3', thumbnail: 'https://img.youtube.com/vi/0KqmvRtQV-E/mqdefault.jpg' },
  { id: 'bxkUSK3H6Hk', title: 'Video 4', thumbnail: 'https://img.youtube.com/vi/bxkUSK3H6Hk/mqdefault.jpg' },
  { id: 'l7ImtskJx8c', title: 'Video 5', thumbnail: 'https://img.youtube.com/vi/l7ImtskJx8c/mqdefault.jpg' },
  { id: 'KnAMJXuE0Cc', title: 'Video 6', thumbnail: 'https://img.youtube.com/vi/KnAMJXuE0Cc/mqdefault.jpg' },
  { id: 'tBAzIyPTJX0', title: 'Video 7', thumbnail: 'https://img.youtube.com/vi/tBAzIyPTJX0/mqdefault.jpg' },
  { id: 'u4j2d7iLWsw', title: 'Video 8', thumbnail: 'https://img.youtube.com/vi/u4j2d7iLWsw/mqdefault.jpg' },
  { id: 'Y5Oapy7C4gE', title: 'Video 9', thumbnail: 'https://img.youtube.com/vi/Y5Oapy7C4gE/mqdefault.jpg' },
  { id: 'aHb_I2oSlyY', title: 'Video 10', thumbnail: 'https://img.youtube.com/vi/aHb_I2oSlyY/mqdefault.jpg' },
  { id: '7FP5BN8r4ig', title: 'Video 11', thumbnail: 'https://img.youtube.com/vi/7FP5BN8r4ig/mqdefault.jpg' },
  { id: 'vWSyGIDXIFE', title: 'Video 12', thumbnail: 'https://img.youtube.com/vi/vWSyGIDXIFE/mqdefault.jpg' },
  { id: '-VtGmNlCvG8', title: 'Video 13', thumbnail: 'https://img.youtube.com/vi/-VtGmNlCvG8/mqdefault.jpg' },
  { id: 'ZFYRfryUECE', title: 'Video 14', thumbnail: 'https://img.youtube.com/vi/ZFYRfryUECE/mqdefault.jpg' },
  { id: 't1XfAlE_lHk', title: 'Video 15', thumbnail: 'https://img.youtube.com/vi/t1XfAlE_lHk/mqdefault.jpg' },
  { id: '63SXG7YV7lc', title: 'Video 16', thumbnail: 'https://img.youtube.com/vi/63SXG7YV7lc/mqdefault.jpg' },
  { id: 'O8tcQ_77TB4', title: 'Video 17', thumbnail: 'https://img.youtube.com/vi/O8tcQ_77TB4/mqdefault.jpg' },
  { id: 'yq_7WEBBvKA', title: 'Video 18', thumbnail: 'https://img.youtube.com/vi/yq_7WEBBvKA/mqdefault.jpg' },
  { id: 'FTsC9j7kRTc', title: 'Video 19', thumbnail: 'https://img.youtube.com/vi/FTsC9j7kRTc/mqdefault.jpg' },
  { id: 'qpn8Lifa5s4', title: 'Video 20', thumbnail: 'https://img.youtube.com/vi/qpn8Lifa5s4/mqdefault.jpg' },
  { id: 'vrsoCEUqErk', title: 'Video 21', thumbnail: 'https://img.youtube.com/vi/vrsoCEUqErk/mqdefault.jpg' },
  { id: '72Cc1EZl-mM', title: 'Video 22', thumbnail: 'https://img.youtube.com/vi/72Cc1EZl-mM/mqdefault.jpg' },
  { id: 'J4B7zvHFiQY', title: 'Video 23', thumbnail: 'https://img.youtube.com/vi/J4B7zvHFiQY/mqdefault.jpg' },
  { id: 'WDKXBSq8pJs', title: 'Video 24', thumbnail: 'https://img.youtube.com/vi/WDKXBSq8pJs/mqdefault.jpg' },
  { id: 'QmOF0crdyRU', title: 'Video 25', thumbnail: 'https://img.youtube.com/vi/QmOF0crdyRU/mqdefault.jpg' },
  { id: '5HNO_JfY2Y0', title: 'Video 26', thumbnail: 'https://img.youtube.com/vi/5HNO_JfY2Y0/mqdefault.jpg' },
  { id: 'Bh1XdxUTkfw', title: 'Video 27', thumbnail: 'https://img.youtube.com/vi/Bh1XdxUTkfw/mqdefault.jpg' },
];

interface MediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MediaModal = ({ open, onOpenChange }: MediaModalProps) => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleBack = () => {
    setSelectedVideo(null);
  };

  const handleClose = () => {
    setSelectedVideo(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl w-[98vw] h-[85vh] max-h-[85vh] p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="font-display text-xl">
            {selectedVideo ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <span className="text-muted-foreground">←</span>
                <span>Back to Videos</span>
              </button>
            ) : (
              'Motivational Media'
            )}
          </DialogTitle>
        </DialogHeader>

        {selectedVideo ? (
          <div className="flex-1 p-4">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{selectedVideo.title}</h3>
          </div>
        ) : (
          <ScrollArea className="flex-1 h-[calc(85vh-80px)]">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  className="group relative rounded-lg overflow-hidden bg-secondary/30 border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.02]"
                >
                  <div className="aspect-video relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-primary-foreground ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-left line-clamp-2">
                      {video.title}
                    </h4>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;
