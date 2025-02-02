import React, { useState, useEffect, useRef } from 'react';
import abcjs from 'abcjs';
import { Play, Pause, SkipBack } from 'lucide-react';

const defaultAbc = `X:1
T:Greensleeves
M:6/8
L:1/8
Q:1/4=120
K:Am
A|"Am"A2B c2d|"G"e2f g2a|"Am"g2e c2e|"G"d2B G2A|
"Am"A2B c2d|"G"e2f g2a|"F"g2e "E"c2B|"Am"A3 A2:|
g|"C"a2g a2e|"G"g2f g2d|"Am"e2d c2e|"G"d2B G2A|
"Am"A2B c2d|"G"e2f g2a|"F"g2e "E"c2B|"Am"A3 A2:|`;

function App() {
  const [abc, setAbc] = useState(defaultAbc);
  const [isPlaying, setIsPlaying] = useState(false);
  const [synth, setSynth] = useState<any>(null);
  const visualObj = useRef<any>(null);
  const cursorControl = useRef<any>(null);

  useEffect(() => {
    // Initialize cursor control
    cursorControl.current = {
      beatSubdivisions: 2,
      showCursor: true,
      currentBeat: 0,
      cursor: null,
      
      onStart: function() {
        const svg = document.querySelector('#paper svg');
        if (!this.cursor && svg) {
          this.cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
          this.cursor.setAttribute("class", "cursor");
          this.cursor.setAttribute("stroke", "red");
          this.cursor.setAttribute("stroke-width", "2");
          svg.appendChild(this.cursor);
        }
      },
      
      onEvent: function(ev: any) {
        if (this.cursor && ev.elements && ev.elements.length > 0) {
          // Get the first element's position for the current note
          const element = ev.elements[0];
          const x = element.x;
          const top = Math.min(...ev.elements.map((el: any) => el.top));
          const bottom = Math.max(...ev.elements.map((el: any) => el.top + el.height));
          
          // Position the cursor at the note
          this.cursor.setAttribute("x1", x);
          this.cursor.setAttribute("x2", x);
          this.cursor.setAttribute("y1", top);
          this.cursor.setAttribute("y2", bottom);
          
          // Highlight the current note
          ev.elements.forEach((el: any) => {
            const noteEl = document.querySelector(`.abcjs-n${el.elemset}`);
            if (noteEl) {
              noteEl.classList.add('highlight');
              // Remove highlight from previous notes
              setTimeout(() => noteEl.classList.remove('highlight'), 100);
            }
          });
        }
      },
      
      onFinished: function() {
        if (this.cursor) {
          this.cursor.setAttribute("x1", -10);
          this.cursor.setAttribute("x2", -10);
        }
        // Remove any remaining highlights
        document.querySelectorAll('.highlight').forEach(el => {
          el.classList.remove('highlight');
        });
      }
    };

    // Render the music notation
    const renderOptions = { 
      responsive: 'resize',
      add_classes: true,
      clickListener: (abcElem: any) => {
        // Optional: Add click-to-play functionality
        const position = abcElem.midiPitches ? abcElem.midiPitches[0].milliseconds : 0;
        if (synth) {
          synth.seek(position);
        }
      }
    };
    visualObj.current = abcjs.renderAbc('paper', abc, renderOptions)[0];

    // Initialize audio
    const synthControl = new abcjs.synth.SynthController();
    synthControl.load('#audio', cursorControl.current, {
      displayLoop: true,
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
    });
    setSynth(synthControl);

    // Create the audio context and initialize the synth
    const createSynth = new abcjs.synth.CreateSynth();
    createSynth.init({ visualObj: visualObj.current }).then(() => {
      synthControl.setTune(visualObj.current, false, {
        midiTranspose: 0,
        chordsOff: false,
        cursor: cursorControl.current
      }).then(() => {
        console.log('Audio ready');
      });
    });
  }, [abc]);

  const handlePlay = () => {
    if (!isPlaying && synth) {
      synth.play().then(() => {
        setIsPlaying(true);
      });
    }
  };

  const handlePause = () => {
    if (isPlaying && synth) {
      synth.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (synth) {
      synth.restart();
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-sex mb-6 text-gray-800">ABC Music Player by Samo Čavoj</h1>
          
          <div className="mb-6">
            <textarea
              className="w-full h-48 p-4 border rounded-lg font-mono text-sm"
              value={abc}
              onChange={(e) => setAbc(e.target.value)}
              placeholder="Enter ABC notation here..."
            />
          </div>

          <div className="mb-8">
            <div id="paper" className="mb-4"></div>
            <div id="audio"></div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <SkipBack size={20} />
              Restart
            </button>
            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play size={20} />
                Play
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Pause size={20} />
                Pause
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">About ABC Notation</h2>
          <p className="text-gray-600 mb-4">
            ABC notation is a text-based music notation system. The example above shows the tune "Greensleeves".
            You can modify the ABC notation in the textarea to play different tunes.
          </p>
          <p className="text-gray-600">
            The basic format includes:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4">
            <li>X: - Reference number</li>
            <li>T: - Title</li>
            <li>M: - Meter/Time signature</li>
            <li>L: - Default note length</li>
            <li>K: - Key signature</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;