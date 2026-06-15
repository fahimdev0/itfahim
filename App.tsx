/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import ChannelList from './components/ChannelList';
import AIAssistant from './components/AIAssistant';
import { Channel } from './types';
import { MonitorPlay } from 'lucide-react';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/channels');
        const data = await response.json();
        setChannels(data.channels || []);
        
        // try to resume last played channel
        const saved = localStorage.getItem('fahimtv_last_channel');
        if (saved && data.channels) {
          const found = data.channels.find((c: Channel) => c.url === saved);
          if (found) setCurrentChannel(found);
        }
      } catch (error) {
        console.error("Failed to load channels", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChannels();
  }, []);

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel);
    localStorage.setItem('fahimtv_last_channel', channel.url);
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col lg:flex-row bg-[#050505] overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Top / Left: Video Player Area */}
      <div className="w-full h-[35dvh] sm:h-[45dvh] lg:h-full lg:flex-1 relative shrink-0 z-10 shadow-2xl lg:shadow-none bg-black">
        {/* Brand Header for Desktop */}
        <div className="absolute top-6 left-6 z-20 pointer-events-none hidden lg:flex items-center space-x-3 opacity-80 backdrop-blur-md bg-black/20 px-4 py-2 rounded-2xl border border-white/5">
          <MonitorPlay className="w-6 h-6 text-indigo-400" />
          <span className="text-white font-bold tracking-tight text-xl">Fahim TV</span>
        </div>

        <VideoPlayer currentChannel={currentChannel} />
      </div>

      {/* Bottom / Right: Channel List Area */}
      <div className="w-full h-[65dvh] sm:h-[55dvh] lg:h-full lg:w-[400px] xl:w-[450px] flex flex-col shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 z-0 lg:z-20 bg-[#0a0a0c]">
        {/* Brand Header for Mobile (Shows above search) */}
        <div className="lg:hidden flex items-center px-6 pt-6 pb-2 space-x-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <MonitorPlay className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold tracking-tight text-xl">Fahim TV</span>
        </div>

        <ChannelList 
          channels={channels} 
          currentChannel={currentChannel} 
          onSelectChannel={handleSelectChannel}
          isLoading={isLoading}
        />
      </div>

      <AIAssistant currentChannel={currentChannel} />
    </div>
  );
}
