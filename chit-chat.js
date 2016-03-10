Users = new Mongo.Collection("users");

if (Meteor.isClient) {
    
    var VOICE_RADIUS = 150;
    
    function setup() {
        var recorder;
        
        if(!Meteor.connection._lastSessionId) {
            setTimeout(setup, 500);
            return;
        }
        
        var userID = Users.insert({
            _id: Meteor.connection._lastSessionId,
            position: {
                x: window.innerWidth * Math.random(),
                y: window.innerHeight * Math.random()
            },
            color: Math.floor(Math.random()*0x666666) + 0x333333
        });
        var user; // TODO: deprecate
        var me;
        me = user = Users.findOne({ _id: userID });
        
        
        PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
        var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {backgroundColor : 0x1099bb, resolution: 2});
        window.addEventListener("resize", function(event) {
            renderer.resize(window.innerWidth, window.innerHeight);
        });
        
        window.document.body.appendChild(renderer.view);

        // create the root of the scene graph
        var stage = new PIXI.Container();
        var users = {};
        function getOrCreateUserWithId(id) {
            if(!users[id]) {
                var sprite = PIXI.Sprite.fromImage('assets/ducky.png');
                sprite.pivot.set(5,6);
                sprite.position.set(-100, -100);
                sprite.scale.x = sprite.scale.y = 5;
                stage.addChild(sprite);
                users[id] = {
                    sprite: sprite,
                    audio: new Audio()
                };
            }
            return users[id];
        }
        function removeUserWithIdNotIn(ids) {
            for(var id in users) {
                if(ids.indexOf(id) == -1) {
                    var sprite = users[id];
                    stage.removeChild(sprite);
                    delete users[id];
                }
            }
        }
        
        var clickTarget = new PIXI.Sprite();
        clickTarget.position.set(0,0);
        clickTarget.width = window.innerWidth;
        clickTarget.height = window.innerHeight;
        clickTarget.interactive = true;
        stage.addChild(clickTarget);
        window.addEventListener("resize", function(event) {
            clickTarget.width = window.innerWidth;
            clickTarget.height = window.innerHeight;
        });
        clickTarget.touchstart = clickTarget.mousedown = function(e) {
            user.position.x = e.data.global.x;
            user.position.y = e.data.global.y;
            Users.update({ _id: userID }, user);
        };
        
        var recordBtn = PIXI.Sprite.fromImage('assets/record.png');
        recordBtn.pivot.set(5,6);
        recordBtn.position.set(window.innerWidth / 2, window.innerHeight - 50);
        recordBtn.scale.x = recordBtn.scale.y = 5;
        recordBtn.interactive = true;
        stage.addChild(recordBtn);
        window.addEventListener("resize", function(event) {
            recordBtn.position.set(window.innerWidth / 2, window.innerHeight - 50);
        });
        var recordTimeout = -1;
        var stopRecord;
        recordBtn.mousedown = recordBtn.touchstart = function(e) {
            e.stopPropagation();
            recordBtn.tint = 0x999999;
            recorder && recorder.record();
            recordTimeout = setTimeout(stopRecord, 3000);
        }
        
        stopRecord = recordBtn.mouseup = recordBtn.touchend = function(e) {
            e && e.stopPropagation();
            if (recordTimeout == -1) return;
            clearTimeout(recordTimeout);
            recordTimeout = -1;
            recorder.stop();
            recordBtn.tint = 0xFFFFFF;
            recorder.exportWAV(function(blob) {
                var url = window.URL.createObjectURL(blob);
                var reader = new FileReader();
                reader.onloadend = function () {
                    var dataURL = reader.result;
                    user.speak = dataURL;
                    Users.update({ _id: userID }, user);
                }
                reader.readAsDataURL(blob);
            });
            recorder.clear();
        }
        
        // start animating
        animate();
        
        var firstTimeSilence = true;
        Tracker.autorun(function () {
            var users = Users.find();
            var alive_ids = [];
            users.forEach(function(user) {
                var id = user._id;
                alive_ids.push(id);
                var userMeta = getOrCreateUserWithId(id);
                var userSprite = userMeta.sprite;
                userSprite.tint = user.color;
                userSprite.position.set(user.position.x, user.position.y);
                
                var diff = { a: user.position.x - me.position.x, b: user.position.y - me.position.y };
                userMeta.audio.volume = 1 - Math.min(1, (diff.a*diff.a + diff.b*diff.b) / (VOICE_RADIUS * VOICE_RADIUS));
                
                if(id != userID && user.speak) {
                    if(userMeta.audio.src != user.speak) {
                        userMeta.audio.src = user.speak;
                        console.log(user.position, me.position, diff, (diff.a*diff.a + diff.b*diff.b) / (VOICE_RADIUS * VOICE_RADIUS));
                        if(!firstTimeSilence) {
                            userMeta.audio.play();
                        }
                    }
                }
            });
            removeUserWithIdNotIn(alive_ids);
            firstTimeSilence = false;
        });
        
        function animate() {

            requestAnimationFrame(animate);

            // render the root container
            renderer.render(stage);
        }
        
        navigator.getUserMedia = navigator.getUserMedia ||
                                 navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia;
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        
        if (navigator.getUserMedia) {
            var audio_context = audio_context = new AudioContext;
            navigator.getUserMedia({ audio: true },
                function(stream) {
                    var input = audio_context.createMediaStreamSource(stream);
                    recorder = new Recorder(input);
                },
                function(err) {
                    console.log(err);
                }
            );
        }
    }
    window.onload = setup;
    
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
        console.log("Removing everyone...");
        Users.remove({});
    });
    
    Meteor.onConnection(function(conn) {
        conn.onClose(function(id, close, onClose) {
            console.log("Colsing ", conn.id);
            Users.remove({_id: conn.id});
        });
    })
}
