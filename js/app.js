/* SIMON GAME */

var simonGame = (function() {
 
  var gameState = (function() {
    var states = {
      powerOff: 0,
      powerOn: 1,
      start: 2,
      addRandom: 3,
      comDemo: 4,
      playerSequence: 5,
      mistake: 6,
      allCorrect: 7,
      win: 8
    };

    var state = states.powerOff;

    var retObj = {
      getState: function() {
        return state;
      },
      setState: function(n) {
        console.log('set state ' + n);
        if (n >= 0 && n <= states.win) {
          state = n;
        }
      },
      states: states,
    };

    for (var s in states)
      retObj[s] = states[s];

    return retObj;
  })();
  
  var gs = gameState;
  var round = 0;
  var pressN = 0;
  var strict = false;
  var sequence = [];
  var MAXROUND = 20;

  function nextRound() {
    pressN = 0;

    if (round + 1 > MAXROUND) {
      gs.setState(gs.win);
    } else {
      round += 1;
      sequence.push(Math.floor(Math.random() * 3.99));
      gs.setState(gs.comDemo);
    }
  }

  function press(btnI) {
    var s = gs.getState();

    if (!(s == gs.powerOn || s == gs.playerSequence)) {
      return false;
    }

    if (s != gs.playerSequence)
      return true;

    pressN += 1;

    if (btnI != sequence[pressN - 1]) {
      pressN = 0;
      gs.setState(gs.mistake);
    } else if (pressN == sequence.length) {
      gs.setState(gs.allCorrect);
    }

    return true;
  }

  function reset() {
    sequence = [];
    round = 0;
    pressN = 0;
  }

  function start() {
    reset();
    nextRound();
  }

  function togglePower() {
    if (gs.getState() == gs.powerOff) {
      gs.setState(gs.powerOn);
      reset();
    } else {
      gs.setState(gs.powerOff);
      strict = false;
    }
  }

  return {
    getRound: function() {
      return round;
    },
    getSequence: function() {
      return sequence
    },
    getState: gs.getState,
    getStrict: function() {
      return strict;
    },
    isState: function(s) {
      return gs.getState() == s;
    },
    nextRound: nextRound,
    press: press,
    setState: gs.setState,
    start: start,
    states: gs.states,
    togglePower: togglePower,
    toggleStrict: function() {
      strict = !strict;
    },
  };
})();

(function() {

  var app = angular.module('simonGame', []);
  
  var ColorButton = function(soundUrl) {
    this.lit = false;
    this.sound = new Audio(soundUrl);
    this.light = function(disableSound) {
      if (!disableSound)
        this.sound.play();
      this.lit = true;
    };
  };

  var CONFIG = {
    playerPressMS: 700,
    comPressMS: 600,
    startComTimeoutMS: 1000,
    comTimeoutMS: null,
    speedIncrement: 150,
    incrementRounds: [5, 9, 13],
  };

  app.controller('SimonController', function($timeout) {
    var ctrl = this;
    var sg = simonGame;
    var timeoutStack = [];
    var mistakeSound = new Audio('http://www.hurstcreative.com/codepen/simon/oops.mp3');
    var switchSound = new Audio();
    switchSound.src = 'http://www.hurstcreative.com/codepen/simon/switch.mp3';

    this.buttons = [
      new ColorButton('http://www.hurstcreative.com/codepen/simon/001.mp3'),
      new ColorButton('http://www.hurstcreative.com/codepen/simon/002.mp3'),
      new ColorButton('http://www.hurstcreative.com/codepen/simon/003.mp3'),
      new ColorButton('http://www.hurstcreative.com/codepen/simon/004.mp3'),
    ];

    function clearTimeouts() {
      var ids = timeoutStack.length;
      for (var i = 0; i < ids; i++)
        $timeout.cancel(timeoutStack.pop());
    }

    this.getCountText = function() {
      var txt = '';
      if (this.getPowerState()) {
        txt = (sg.isState(sg.states.powerOn)) ? '--' : sg.getRound();
      }

      return txt;
    };

    function doComDemo() {
      lightSequence(sg.getSequence(), CONFIG.comPressMS, CONFIG.comTimeoutMS);
    };

    this.getPowerState = function() {
      return !sg.isState(sg.states.powerOff);
    }

    this.getStrictState = function() {
      return sg.getStrict();
    }

    function incrementSpeed() {
      CONFIG.incrementRounds.map(function(r) {
        if (sg.getRound() == r) {
          CONFIG.comTimeoutMS -= CONFIG.speedIncrement;
        }
      });
    }

    function lightColor(i, ms, options) {
      var btn = ctrl.buttons[i];
      options = (!options) ? {} : options;
      var nextState = options.nextState;
      btn.light(options.disableSound);

      timeout(function() {
        btn.lit = false;
        if (typeof nextState != 'undefined') {
          sg.setState(nextState);
        }
      }, ms);
    };

    function lightSequence(seq, lightMS, timeoutMS, i) {
      i = (typeof i == 'undefined') ? 0 : i;

      if (i < seq.length - 1) {
        lightColor(seq[i], lightMS);
        timeout(function() {
          lightSequence(seq, lightMS, timeoutMS, i + 1);
        }, timeoutMS);
      } else if (i == seq.length - 1) {
        lightColor(seq[i], lightMS, {
          nextState: sg.states.playerSequence
        });
      }
    }

    this.pressColor = function(i) {
      var ms = CONFIG.playerPressMS;

      if (!sg.press(i))
        return;

      switch (sg.getState()) {
        case sg.states.allCorrect:
          lightColor(i, ms);

          timeout(function() {
            sg.nextRound();
            incrementSpeed();
            if (sg.isState(sg.states.comDemo))
              doComDemo();
            else if (sg.isState(sg.states.win))
              win();
          }, 1600);
          break;
        case sg.states.mistake:
          lightColor(i, 1000, {
            disableSound: true
          });
          mistakeSound.play();

          timeout(function() {
            if (sg.getStrict()) {
              ctrl.start();
            } else {
              sg.setState(sg.states.comDemo);
              doComDemo();
            }
          }, 1500);
          break;
        default:
          lightColor(i, ms);
          break;
      }
    };

    function reset() {
      clearTimeouts();
      CONFIG.comTimeoutMS = CONFIG.startComTimeoutMS;
      ctrl.buttons.map(function(btn) {
        btn.lit = false;
      });
    }

    this.start = function() {
      if (ctrl.getPowerState()) {
        reset();
        sg.start();
        doComDemo();
      }
    };

    function timeout(func, ms) {
      timeoutStack.push($timeout(func, ms));
    }

    this.togglePower = function() {
      switchSound.play();
      sg.togglePower();
      reset();
    };

    this.toggleStrict = function() {
      if (ctrl.getPowerState())
        sg.toggleStrict();
    }

    function win(second) {
      var buttons = ctrl.buttons;

      buttons[1].light();

      timeout(function() {
        buttons[2].light();
      }, 100);

      timeout(function() {
        buttons[3].light();
      }, 225);

      timeout(function() {
        buttons[0].light();
      }, 450);

      timeout(function() {
        buttons.map(function(btn) {
          btn.lit = false;
        })
      }, 1000);
      
      if (!second)
        timeout(function() { win(true); }, 2000);
      else
        timeout(ctrl.start, 2000);
    }
  });
})();
