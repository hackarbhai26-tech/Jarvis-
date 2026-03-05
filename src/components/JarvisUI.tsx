import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Search, Cpu, Globe, Zap, Terminal, Volume2, VolumeX } from 'lucide-react';
import { chatWithJarvis, generateJarvisVoice } from '../services/gemini';
import { Visualizer } from './Visualizer';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const JarvisUI: React.FC = () => {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      addLog('BROWSER NOT SUPPORTED');
    }
  }, []);

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-6 border border-red-900/50 p-8 rounded-2xl bg-red-950/10">
          <MicOff size={48} className="mx-auto text-red-500" />
          <h1 className="text-2xl font-bold text-red-500 uppercase tracking-widest">System Failure</h1>
          <p className="text-red-400 font-mono text-sm">
            Voice recognition modules are incompatible with this browser interface. 
            Please use a Chromium-based browser (Chrome, Edge) for full Jarvis functionality.
          </p>
        </div>
      </div>
    );
  }

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('STANDBY');
  const [logs, setLogs] = useState<string[]>(['SYSTEM INITIALIZED', 'CORE ONLINE']);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.results[0][0].transcript;
        setTranscript(current);
        if (event.results[0].isFinal) {
          handleProcessCommand(current);
        }
      };

      recognitionRef.current.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
        setStatus('ERROR');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (status === 'LISTENING') setStatus('PROCESSING');
      };
    }
  }, [status]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const [isWakeWordActive, setIsWakeWordActive] = useState(true);
  const wakeWordRecognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && isWakeWordActive && !isListening) {
      wakeWordRecognitionRef.current = new SpeechRecognition();
      wakeWordRecognitionRef.current.continuous = true;
      wakeWordRecognitionRef.current.interimResults = false;
      
      wakeWordRecognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.toLowerCase();
        if (text.includes('jarvis')) {
          addLog('WAKE WORD DETECTED');
          toggleListening();
        }
      };

      try {
        wakeWordRecognitionRef.current.start();
      } catch (e) {
        console.warn('Wake word recognition already started or failed');
      }

      return () => {
        wakeWordRecognitionRef.current?.stop();
      };
    }
  }, [isWakeWordActive, isListening]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatus('STANDBY');
    } else {
      // Stop wake word listener while active listening is on
      wakeWordRecognitionRef.current?.stop();
      setTranscript('');
      setResponse('');
      recognitionRef.current?.start();
      setIsListening(true);
      setStatus('LISTENING');
      addLog('VOICE INPUT ACTIVE');
    }
  };

  const handleProcessCommand = async (command: string) => {
    setStatus('PROCESSING');
    addLog(`COMMAND: ${command.toUpperCase()}`);
    
    try {
      const aiResponse = await chatWithJarvis(command);
      setResponse(aiResponse);
      setStatus('RESPONDING');
      addLog('AI RESPONSE GENERATED');

      if (!isMuted) {
        const audioData = await generateJarvisVoice(aiResponse);
        if (audioData) {
          const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
          audioRef.current = audio;
          setIsSpeaking(true);
          audio.play();
          audio.onended = () => {
            setIsSpeaking(false);
            setStatus('STANDBY');
          };
        } else {
          setStatus('STANDBY');
        }
      } else {
        setStatus('STANDBY');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setStatus('ERROR');
      addLog('CORE PROCESSING FAILED');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-cyan-400 font-mono p-4 md:p-8 overflow-hidden selection:bg-cyan-500/30">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center mb-12 border-b border-cyan-900/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-cyan-500/30 rounded-full flex items-center justify-center"
            >
              <div className="w-6 h-6 border border-cyan-400 rounded-full" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap size={14} className="text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase">Jarvis</h1>
            <p className="text-[10px] text-cyan-600 tracking-tighter">MARK VII • SYSTEM ONLINE</p>
          </div>
        </div>

        <div className="flex gap-6 text-[10px] tracking-widest uppercase hidden md:flex">
          <div className="flex items-center gap-2">
            <Globe size={12} className={status === 'PROCESSING' ? 'animate-pulse' : ''} />
            <span>Network: Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={12} className={status === 'PROCESSING' ? 'animate-spin' : ''} />
            <span>CPU: 0.04%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'ERROR' ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_5px_currentColor]`} />
            <span>Status: {status}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsWakeWordActive(!isWakeWordActive)}
            className={`flex items-center gap-2 px-3 py-1 rounded border text-[10px] transition-all ${
              isWakeWordActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-cyan-900/50 text-cyan-900'
            }`}
          >
            <Zap size={10} />
            <span>Wake Word: {isWakeWordActive ? 'ON' : 'OFF'}</span>
          </button>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-cyan-900/20 rounded-full transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: System Logs */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-black/40 border border-cyan-900/30 p-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-cyan-900/30 pb-2">
              <Terminal size={14} />
              <h2 className="text-xs uppercase tracking-widest">System Logs</h2>
            </div>
            <div className="space-y-2 h-40 overflow-hidden">
              {logs.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 - i * 0.2, x: 0 }}
                  key={i} 
                  className="text-[10px] flex gap-2"
                >
                  <span className="text-cyan-800">[{new Date().toLocaleTimeString()}]</span>
                  <span>{log}</span>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="bg-black/40 border border-cyan-900/30 p-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-cyan-900/30 pb-2">
              <Search size={14} />
              <h2 className="text-xs uppercase tracking-widest">Active Modules</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Vision', 'Voice', 'Search', 'Logic'].map(m => (
                <div key={m} className="flex items-center gap-2 text-[10px] p-2 border border-cyan-900/20 rounded">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_3px_#22d3ee]" />
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Center Column: Main Interface */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative aspect-video bg-black/40 border border-cyan-900/30 rounded-2xl flex flex-col items-center justify-center p-8 backdrop-blur-md overflow-hidden">
            {/* Holographic Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute w-[80%] aspect-square border-2 border-dashed border-cyan-500 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-[60%] aspect-square border border-cyan-400/50 rounded-full"
              />
            </div>

            <Visualizer isListening={isListening} isSpeaking={isSpeaking} />

            <div className="mt-8 text-center space-y-4 max-w-md">
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.p 
                    key="listening"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-cyan-200 italic text-sm"
                  >
                    {transcript || "Listening..."}
                  </motion.p>
                ) : response ? (
                  <motion.div 
                    key="response"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <p className="text-cyan-100 text-lg leading-relaxed font-sans">
                      {response}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-cyan-600 uppercase tracking-[0.3em] text-xs"
                  >
                    Awaiting Voice Input
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              className={`mt-12 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                isListening 
                ? 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                : 'bg-cyan-500/10 border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
              }`}
            >
              {isListening ? <MicOff size={32} className="text-red-500" /> : <Mic size={32} className="text-cyan-400" />}
            </motion.button>
          </div>

          {/* Bottom Info Bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Latency', value: '12ms' },
              { label: 'Encryption', value: 'AES-256' },
              { label: 'Session', value: 'Active' }
            ].map(item => (
              <div key={item.label} className="bg-black/40 border border-cyan-900/30 p-3 rounded-lg text-center">
                <p className="text-[8px] uppercase tracking-widest text-cyan-700 mb-1">{item.label}</p>
                <p className="text-xs font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex justify-between items-end opacity-30">
          <div className="w-32 h-[1px] bg-cyan-500" />
          <div className="text-[8px] uppercase tracking-[0.5em]">Stark Industries • Proprietary Technology</div>
          <div className="w-32 h-[1px] bg-cyan-500" />
        </div>
      </footer>
    </div>
  );
};
